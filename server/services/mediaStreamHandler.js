const { createClient, LiveTranscriptionEvents } = require("@deepgram/sdk");
const { LLMService } = require("../llmService.js");
const nodeFetch = require("node-fetch");
const WalletService = require('./walletService.js');
const CostCalculator = require('./costCalculator.js');

const sessions = new Map();

class MediaStreamHandler {
    constructor(deepgramApiKey, geminiApiKey, openaiApiKey, campaignService, mysqlPool = null) {
        if (!deepgramApiKey) throw new Error("Missing Deepgram API Key");
        if (!geminiApiKey) throw new Error("Missing Gemini API Key");

        this.deepgramClient = createClient(deepgramApiKey);
        this.llmService = new LLMService(geminiApiKey, openaiApiKey); // Pass both API keys
        this.campaignService = campaignService;
        this.mysqlPool = mysqlPool;

        // Initialize wallet and cost tracking services
        if (mysqlPool) {
            this.walletService = new WalletService(mysqlPool);
            this.costCalculator = new CostCalculator(mysqlPool, this.walletService);
        }
    }

    // ✅ FIX: Method to get fresh API key each time
    getElevenLabsApiKey() {
        return process.env.ELEVEN_LABS_API_KEY || process.env.ELEVENLABS_API_KEY;
    }

    createSession(callId, agentPrompt, agentVoiceId, ws, userId = null, agentId = null, agentModel = null) {
        const session = {
            callId,
            context: [],
            sttStream: null,
            agentPrompt,
            agentVoiceId: agentVoiceId || "21m00Tcm4TlvDq8ikWAM",
            agentModel: agentModel || "gemini-2.0-flash", // Store agent's selected model
            ws,
            streamSid: null,
            isReady: false,
            audioQueue: [],
            isSpeaking: false, // Track if agent is currently speaking
            lastUserSpeechTime: null, // Track when user last spoke
            lastProcessedTranscript: null, // Track last processed transcript to prevent duplicates
            isProcessing: false, // Track if currently processing a transcript
            userId: userId,
            agentId: agentId,
            startTime: new Date(),
            // Usage tracking for billing
            usage: {
                twilio: 0,        // minutes
                deepgram: 0,      // seconds
                gemini: 0,        // tokens (also used for OpenAI)
                elevenlabs: 0,    // characters
                sarvam: 0         // characters
            }
        };
        sessions.set(callId, session);
        console.log(`✅ Created session for call ${callId}`);
        console.log(`   Agent Prompt: ${agentPrompt.substring(0, 100)}...`);
        console.log(`   Voice ID: ${session.agentVoiceId}`);
        return session;
    }

    endSession(callId) {
        const session = sessions.get(callId);
        if (session) {
            // Calculate and charge for Twilio usage
            if (session.startTime && session.userId && this.costCalculator) {
                const endTime = new Date();
                const durationSeconds = (endTime - session.startTime) / 1000;
                const durationMinutes = durationSeconds / 60;
                session.usage.twilio = durationMinutes;

                // Charge user for all usage
                this.costCalculator.recordAndCharge(
                    session.userId,
                    session.callId,
                    session.usage
                ).then(result => {
                    console.log(`✅ Charged user ${session.userId}: $${result.totalCharged.toFixed(4)}`);
                    console.log('   Breakdown:', result.breakdown);
                }).catch(err => {
                    console.error('❌ Error charging user:', err.message);
                    if (err.message === 'Insufficient balance') {
                        console.warn(`⚠️ User ${session.userId} ended call with insufficient balance`);
                    }
                });
            }

            if (session.sttStream) {
                session.sttStream.finish();
                session.sttStream.removeAllListeners();
            }
            sessions.delete(callId);
            console.log(`❌ Ended session for call ${callId}`);
        }
    }

    appendToContext(session, text, role) {
        session.context.push({ role, parts: [{ text }] });
        console.log(`💬 ${role.toUpperCase()}: ${text}`);
    }

    // REPLACE the handleConnection method in mediaStreamHandler.js:

    async handleConnection(ws, req) {
        let callId = null;
        let agentId = null;
        let session = null;

        try {
            console.log(`📞 WebSocket connection initiated from handleConnection`);

            // Extract from query params as fallback (for non-Twilio or early identification)
            const queryParams = require('url').parse(req.url, true).query;
            let queryCallId = queryParams.callId;
            let queryAgentId = queryParams.agentId;
            let queryUserId = queryParams.userId;

            // ✅ Set up error handler FIRST before any other operations
            ws.on("error", (error) => {
                // Ignore UTF-8 errors from binary frames (Twilio sends binary audio data)
                if (error.code === 'WS_ERR_INVALID_UTF8' ||
                    error.message?.includes('invalid UTF-8') ||
                    error.message?.includes('Invalid WebSocket frame')) {
                    console.log("⚠️  Ignoring binary frame error (normal for audio data)");
                    return; // Don't crash
                }
                console.error("❌ WebSocket error:", error);
            });

            ws.on("message", async (message) => {
                try {
                    let data;

                    // ✅ CRITICAL: Handle binary messages from Twilio
                    if (Buffer.isBuffer(message)) {
                        // Binary message - try to parse as JSON first
                        try {
                            const messageStr = message.toString('utf8');
                            data = JSON.parse(messageStr);
                        } catch (e) {
                            // Not JSON - could be raw audio, ignore
                            return;
                        }
                    } else if (typeof message === 'string') {
                        // String message - parse as JSON
                        data = JSON.parse(message);
                    } else {
                        // Unknown message type
                        return;
                    }

                    // ✅ Get parameters from Twilio "start" event
                    if (data.event === "start") {
                        console.log("▶️  Media Stream START event received");

                        // Extract parameters from start event
                        const streamParams = data.start?.customParameters || {};
                        callId = streamParams.callId || queryCallId || data.start?.callSid;
                        agentId = streamParams.agentId || queryAgentId;
                        const userId = streamParams.userId || queryUserId;

                        console.log(`📞 Call ID: ${callId}`);
                        console.log(`🤖 Agent ID: ${agentId}`);
                        console.log(`👤 User ID: ${userId}`);

                        if (!callId) {
                            console.error("❌ No callId found in start event or query params");
                            ws.close();
                            return;
                        }

                        // Load agent configuration
                        let agentPrompt = "You are a helpful AI assistant.";
                        let agentVoiceId = "21m00Tcm4TlvDq8ikWAM"; // Default voice
                        let agentModel = "gemini-2.0-flash"; // Default model
                        let greetingMessage = "Hello! How can I help you today?";
                        let tools = [];
                        let agent = null; // Declare agent outside the if block

                        if (agentId) {
                            try {
                                const AgentService = require('./agentService.js');
                                const agentService = new AgentService(require('../config/database.js').default);

                                console.log(`🔍 Fetching agent from database: userId=${userId}, agentId=${agentId}`);
                                agent = await agentService.getAgentById(userId, agentId);
                                console.log(`📋 Agent query result:`, agent ? `Found: ${agent.name}` : 'NOT FOUND');

                                if (agent) {
                                    console.log(`📊 Agent details:`, {
                                        name: agent.name,
                                        voiceId: agent.voiceId,
                                        hasIdentity: !!agent.identity,
                                        hasGreeting: !!agent.settings?.greetingLine
                                    });

                                    agentPrompt = agent.identity || agentPrompt;

                                    // Process Tools
                                    if (agent.settings && agent.settings.tools && agent.settings.tools.length > 0) {
                                        tools = agent.settings.tools;
                                        const toolDescriptions = tools.map(tool =>
                                            `- ${tool.name}: ${tool.description} (Parameters: ${tool.parameters?.map(p => `${p.name} (${p.type})${p.required ? ' [required]' : ''}`).join(', ') || 'None'})`
                                        ).join('\n');

                                        agentPrompt += `\n\nAvailable Tools:\n${toolDescriptions}\n\nWhen you need to collect information from the user, ask for the required parameters. When all required information is collected, respond with a JSON object in the format: {"tool": "tool_name", "data": {"param1": "value1", "param2": "value2"}}. Do NOT add any other text before or after the JSON.`;
                                    }

                                    // ✅ CRITICAL: Use the voice ID directly from database
                                    if (agent.voiceId) {
                                        agentVoiceId = agent.voiceId;
                                        console.log(`🎤 Using agent voice ID from database: ${agentVoiceId}`);
                                    } else {
                                        console.warn(`⚠️  Agent has no voiceId, using default: ${agentVoiceId}`);
                                    }

                                    // ✅ CRITICAL: Use the model directly from database
                                    if (agent.model) {
                                        agentModel = agent.model;
                                        console.log(`🤖 Using agent model from database: ${agentModel}`);
                                    } else {
                                        console.warn(`⚠️  Agent has no model, using default: ${agentModel}`);
                                    }

                                    if (agent.settings?.greetingLine) {
                                        greetingMessage = agent.settings.greetingLine;
                                        console.log(`👋 Using custom greeting: "${greetingMessage}"`);
                                    } else {
                                        console.log(`👋 Using default greeting: "${greetingMessage}"`);
                                    }
                                    console.log(`✅ Loaded agent: ${agent.name} with ${tools.length} tools`);
                                    console.log(`   Voice ID: ${agentVoiceId}`);
                                    console.log(`   Prompt: ${agentPrompt.substring(0, 100)}...`);
                                } else {
                                    console.error(`❌ Agent ${agentId} not found in database for userId ${userId}`);
                                    console.warn(`⚠️  Using defaults: voice=${agentVoiceId}, greeting="${greetingMessage}"`);
                                }
                            } catch (err) {
                                console.error("⚠️  Error loading agent:", err.message);
                            }
                        } else {
                            console.log(`ℹ️  No agentId provided, using default voice: ${agentVoiceId}`);
                        }

                        // Check user balance before starting call
                        if (userId && this.walletService) {
                            const balanceCheck = await this.walletService.checkBalanceForCall(userId, 0.10);
                            if (!balanceCheck.allowed) {
                                console.error(`❌ Insufficient balance for user ${userId}: ${balanceCheck.message}`);
                                // Send error to Twilio and close connection
                                ws.send(JSON.stringify({
                                    event: 'error',
                                    message: balanceCheck.message
                                }));
                                ws.close();
                                return;
                            }
                            console.log(`✅ Balance check passed: $${balanceCheck.balance.toFixed(4)}`);
                        }

                        // Map agent language to Deepgram language codes
                        const languageMap = {
                            'ENGLISH': 'en-US',
                            'HINDI': 'hi',
                            'TAMIL': 'ta',
                            'TELUGU': 'te',
                            'KANNADA': 'kn',
                            'MALAYALAM': 'ml',
                            'BENGALI': 'bn',
                            'MARATHI': 'mr',
                            'GUJARATI': 'gu',
                            'PUNJABI': 'pa'
                        };

                        // Get language from agent or default to English
                        const agentLanguage = agent?.language || 'ENGLISH';
                        const deepgramLanguage = languageMap[agentLanguage] || 'en-US';
                        console.log(`🌐 Using language: ${agentLanguage} (Deepgram: ${deepgramLanguage})`);

                        // Create session with the correct voice ID and model
                        session = this.createSession(callId, agentPrompt, agentVoiceId, ws, userId, agentId, agentModel);
                        session.tools = tools; // Store tools in session
                        session.language = agentLanguage; // Store language in session
                        console.log(`✅ Session created with voice ID: ${session.agentVoiceId}, model: ${session.agentModel}`);

                        session.greetingMessage = greetingMessage;
                        session.streamSid = data.start.streamSid;
                        session.isReady = true;

                        // Initialize Deepgram with SDK v4 API
                        console.log("🔄 Initializing Deepgram connection...");
                        const deepgramLive = this.deepgramClient.listen.live({
                            encoding: "mulaw",
                            sample_rate: 8000,
                            model: "nova-2",
                            smart_format: true,
                            interim_results: true,  // MUST be true for utterance_end_ms
                            utterance_end_ms: 1000,
                            punctuate: true,
                            language: deepgramLanguage, // Use agent's language
                        });

                        session.sttStream = deepgramLive;

                        // Register event handlers BEFORE any audio is sent
                        deepgramLive.on(LiveTranscriptionEvents.Open, () => {
                            console.log("✅ Deepgram connection opened and ready");
                        });

                        deepgramLive.on(LiveTranscriptionEvents.Transcript, async (data) => {
                            try {
                                const transcript = data.channel?.alternatives?.[0]?.transcript;
                                const isFinal = data.is_final;

                                // Only process final transcripts
                                if (!isFinal || !transcript?.trim()) return;

                                // ✅ COST OPTIMIZATION: Prevent duplicate processing
                                if (session.isProcessing) {
                                    console.log(`⏭️  Skipping duplicate transcript (already processing)`);
                                    return;
                                }

                                // Check if this is the same as the last processed transcript
                                if (session.lastProcessedTranscript === transcript) {
                                    console.log(`⏭️  Skipping duplicate transcript: "${transcript}"`);
                                    return;
                                }

                                // Mark as processing to prevent concurrent processing
                                session.isProcessing = true;
                                session.lastProcessedTranscript = transcript;

                                console.log(`🎤 User said: "${transcript}"`);

                                // ✅ INTERRUPTION HANDLING: User spoke
                                session.lastUserSpeechTime = Date.now();

                                // Track Deepgram usage (estimate based on word count)
                                const wordCount = transcript.split(' ').length;
                                const estimatedDuration = wordCount / 2.5; // avg 2.5 words/second
                                session.usage.deepgram += estimatedDuration;

                                // If agent is speaking, user is interrupting - stop agent
                                if (session.isSpeaking) {
                                    console.log(`⚠️  User interrupted agent - stopping agent speech`);
                                    session.isSpeaking = false;
                                    if (session.ws && session.streamSid) {
                                        session.ws.send(
                                            JSON.stringify({
                                                event: "clear",
                                                streamSid: session.streamSid
                                            })
                                        );
                                    }
                                }

                                this.appendToContext(session, transcript, "user");

                                const llmResponse = await this.callLLM(session);
                                this.appendToContext(session, llmResponse, "model");

                                // Generate TTS and send to Twilio
                                const ttsAudio = await this.synthesizeTTS(llmResponse, session.agentVoiceId, session);
                                if (ttsAudio) {
                                    this.sendAudioToTwilio(session, ttsAudio);
                                }

                                // Mark processing as complete
                                session.isProcessing = false;
                            } catch (err) {
                                console.error("❌ Transcript error:", err);
                                // Make sure to clear the processing flag on error
                                session.isProcessing = false;
                            }
                        });

                        deepgramLive.on(LiveTranscriptionEvents.UtteranceEnd, () => {
                            console.log("🎤 User finished speaking (utterance end)");
                        });

                        deepgramLive.on(LiveTranscriptionEvents.Error, (error) => {
                            console.error("❌ Deepgram error:", error);
                        });

                        deepgramLive.on(LiveTranscriptionEvents.Close, () => {
                            console.log("⚠️  Deepgram connection closed");
                        });

                        // ✅ CRITICAL: Send silence immediately to keep Twilio connection alive
                        // Twilio may disconnect if it doesn't receive any audio within a few seconds
                        if (session.isReady && session.streamSid) {
                            console.log("🔇 Sending initial silence to keep connection alive...");
                            const silenceBuffer = Buffer.alloc(160, 0xFF); // µ-law silence (160 bytes = 20ms)
                            const base64Silence = silenceBuffer.toString('base64');

                            // Send a few silence packets
                            for (let i = 0; i < 5; i++) {
                                session.ws.send(JSON.stringify({
                                    event: "media",
                                    streamSid: session.streamSid,
                                    media: { payload: base64Silence }
                                }));
                            }
                            console.log("✅ Silence packets sent");
                        }

                        // Send greeting after a short delay (reduced from 1500ms)
                        setTimeout(async () => {
                            try {
                                console.log(`\n========== SENDING GREETING ==========`);
                                console.log(`👋 Greeting text: "${session.greetingMessage}"`);
                                console.log(`🔊 Voice ID: ${session.agentVoiceId}`);
                                console.log(`📞 Call ID: ${session.callId}`);
                                console.log(`🔗 Stream SID: ${session.streamSid}`);
                                console.log(`✅ Stream ready: ${session.isReady}`);

                                const audio = await this.synthesizeTTS(session.greetingMessage, session.agentVoiceId, session);

                                if (audio && audio.length > 0) {
                                    console.log(`✅ Greeting audio generated: ${audio.length} bytes`);
                                    console.log(`📤 Sending greeting to Twilio...`);
                                    this.sendAudioToTwilio(session, audio);
                                    console.log(`========================================\n`);
                                } else {
                                    console.error("❌ Greeting audio is empty or null");
                                    console.error("   This means TTS generation failed!");
                                    console.log(`========================================\n`);
                                }
                            } catch (err) {
                                console.error("❌ Greeting error:", err);
                                console.error("❌ Error stack:", err.stack);
                                console.log(`========================================\n`);
                            }
                        }, 800); // Optimized timing

                    } else if (data.event === "connected") {
                        console.log("✅ Twilio connected");

                    } else if (data.event === "media") {
                        // ✅ Send audio directly to Deepgram
                        if (session?.sttStream && data.media?.payload) {
                            const audioBuffer = Buffer.from(data.media.payload, "base64");
                            if (audioBuffer.length > 0) {
                                session.sttStream.send(audioBuffer);
                                // Log occasionally to verify audio is flowing
                                if (Math.random() < 0.01) { // Log ~1% of packets
                                    console.log(`🎤 Receiving audio from user (${audioBuffer.length} bytes)`);
                                }
                            }
                        }

                    } else if (data.event === "stop") {
                        console.log("⏹️  Stream stopped");
                        if (callId) this.endSession(callId);

                    } else if (data.event === "mark") {
                        console.log("📍 Mark:", data.mark?.name);
                    }

                } catch (err) {
                    // Only log real errors
                    if (!err.message?.includes('JSON') && !err.message?.includes('Unexpected')) {
                        console.error("❌ Message processing error:", err);
                    }
                }
            });

            ws.on("close", () => {
                console.log("🔌 WebSocket closed");
                if (callId) this.endSession(callId);
            });

            console.log("✅ WebSocket handlers registered and ready");

        } catch (err) {
            console.error("❌ Connection setup error:", err);
            try {
                ws.close();
            } catch (closeErr) {
                // Ignore close errors
            }
        }
    }
    async callLLM(session) {
        try {
            // Use the agent's selected model (supports both Gemini and OpenAI)
            const modelToUse = session.agentModel || "gemini-2.0-flash";
            const isGemini = modelToUse.includes('gemini');
            const provider = isGemini ? 'Gemini' : 'OpenAI';

            console.log(`🧠 Calling ${provider} LLM with model: ${modelToUse}`);

            const response = await this.llmService.generateContent({
                model: modelToUse,
                contents: session.context,
                config: { systemInstruction: session.agentPrompt },
            });
            let text = response.text;
            console.log(`💬 ${provider} response received:`, text.substring(0, 100) + '...');

            // Track token usage (both Gemini and OpenAI use the same counter)
            if (response.usageMetadata && session.usage) {
                const totalTokens = (response.usageMetadata.promptTokenCount || 0) +
                    (response.usageMetadata.candidatesTokenCount || 0);
                session.usage.gemini += totalTokens;
                console.log(`📊 ${provider} tokens used: ${totalTokens} (Total: ${session.usage.gemini})`);
            }

            // Check for Tool Call (JSON format)
            try {
                // Remove potential markdown code blocks if present
                const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
                if (cleanText.startsWith('{') && cleanText.endsWith('}')) {
                    const parsed = JSON.parse(cleanText);

                    if (parsed.tool && parsed.data) {
                        console.log(`🛠️ Tool usage detected: ${parsed.tool}`);

                        // Find the tool definition for validation
                        const tool = session.tools?.find(t => t.name === parsed.tool);
                        const googleSheetsService = require('./googleSheetsService.js');

                        if (tool) {
                            // 1. FILTER DATA BY SCHEMA: Only keep what is defined in the tool parameters
                            const filteredData = {};
                            const allowedParams = tool.parameters || [];

                            allowedParams.forEach(param => {
                                if (parsed.data[param.name] !== undefined) {
                                    filteredData[param.name] = parsed.data[param.name];
                                }
                            });

                            // 2. PREVENT RAW TEXT LEAKAGE: Explicitly strip transcript/context
                            const blackList = ['transcript', 'context', 'raw_text', 'conversation', 'history'];
                            blackList.forEach(key => delete filteredData[key]);

                            // 3. ONE-ROW-PER-CALL ENFORCEMENT
                            if (session.dataSaved) {
                                console.log(`⏭️  Data already saved for this call, skipping duplicate write.`);
                            } else if (Object.keys(filteredData).length > 0) {
                                let spreadsheetId = googleSheetsService.extractSpreadsheetId(tool.webhookUrl);

                                if (spreadsheetId) {
                                    // Add Call Metadata for traceability (without transcripts)
                                    filteredData['CallID'] = session.callId;

                                    await googleSheetsService.appendGenericRow(spreadsheetId, filteredData);
                                    session.dataSaved = true; // Mark as saved to prevent duplicates
                                    console.log(`✅ Structured data saved to Google Sheets for CallID: ${session.callId}`);
                                } else {
                                    console.error('Spreadsheet URL not found or invalid in tool configuration');
                                }
                            } else {
                                console.warn('⚠️  LLM returned no data matching the tool schema');
                            }
                        } else {
                            console.warn(`⚠️  Tool "${parsed.tool}" invocation skipped: Not found in agent config.`);
                        }

                        // Add tool result to context and ask LLM for final response
                        this.appendToContext(session, JSON.stringify({
                            tool: parsed.tool,
                            status: "success",
                            message: session.dataSaved ? "Captured and saved successfully" : "Execution completed"
                        }), "user");

                        // Recursively call LLM to get the verbal response
                        return await this.callLLM(session);
                    }
                }
            } catch (jsonError) {
                // Not a valid JSON tool call
            }

            return text;
        } catch (err) {
            console.error("❌ LLM error:", err);
            return "I apologize, I'm having trouble processing that right now.";
        }
    }

    async synthesizeTTS(text, voiceId, session = null) {
        try {
            // Use TTS controller for provider abstraction
            const { generateTTS } = require('./tts_controller.js');

            console.log(`🔊 Synthesizing TTS with voice: ${voiceId}`);
            console.log(`   Text length: ${text.length} characters`);
            console.log(`   Text preview: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`);

            const audioBuffer = await generateTTS(text, { voiceId });

            // Track TTS usage for billing
            if (session && session.usage) {
                const characterCount = text.length;

                // Complete list of Sarvam voices
                const sarvamVoices = [
                    'anushka', 'abhilash', 'manisha', 'vidya', 'arya', 'karun',
                    'hitesh', 'aditya', 'isha', 'ritu', 'chirag', 'harsh',
                    'sakshi', 'priya', 'neha', 'rahul', 'pooja', 'rohan',
                    'simran', 'kavya', 'anjali', 'sneha', 'kiran', 'vikram',
                    'rajesh', 'sunita', 'tara', 'anirudh', 'kriti', 'ishaan',
                    'ratan', 'varun', 'manan', 'sumit', 'roopa', 'kabir',
                    'aayan', 'shubh', 'meera', 'arvind'
                ];

                const isSarvam = voiceId && (
                    voiceId.includes('sarvam') ||
                    sarvamVoices.includes(voiceId.toLowerCase())
                );

                if (isSarvam) {
                    session.usage.sarvam += characterCount;
                    console.log(`📊 Sarvam TTS: ${characterCount} characters (Total: ${session.usage.sarvam})`);
                } else {
                    session.usage.elevenlabs += characterCount;
                    console.log(`📊 ElevenLabs TTS: ${characterCount} characters (Total: ${session.usage.elevenlabs})`);
                }
            }

            if (!audioBuffer) {
                console.error("❌ TTS generation returned null");
                console.error(`   Voice ID: ${voiceId}`);
                console.error(`   Text: "${text}"`);
                return null;
            }

            if (audioBuffer.length === 0) {
                console.error("❌ TTS generation returned empty buffer");
                console.error(`   Voice ID: ${voiceId}`);
                return null;
            }

            console.log(`✅ TTS generated: ${audioBuffer.length} bytes (µ-law 8kHz) using voice ${voiceId}`);
            console.log(`   First 20 bytes (hex): ${audioBuffer.slice(0, 20).toString('hex')}`);
            console.log(`   First 20 bytes (decimal): [${Array.from(audioBuffer.slice(0, 20)).join(', ')}]`);

            // Check if audio is silent (all same value)
            const uniqueBytes = new Set(audioBuffer.slice(0, 100));
            if (uniqueBytes.size === 1) {
                console.warn(`⚠️ WARNING: Audio appears to be silent (all bytes are ${Array.from(uniqueBytes)[0]})`);
            }

            return audioBuffer;
        } catch (err) {
            console.error("❌ TTS error:", err);
            console.error("   Error details:", err.message);
            console.error("   Stack trace:", err.stack);
            console.error(`   Voice ID: ${voiceId}`);
            console.error(`   Text: "${text.substring(0, 100)}..."`);
            return null;
        }
    }
    sendAudioToTwilio(session, audioBuffer) {
        try {
            if (!session.isReady || !session.streamSid) {
                console.log("⏸️  Queueing audio - stream not ready yet");
                session.audioQueue.push(audioBuffer);
                return;
            }

            // ✅ Set speaking flag
            session.isSpeaking = true;

            const chunkSize = 160; // 160 bytes = 20ms at 8kHz µ-law
            let chunksSent = 0;

            console.log(`📤 Sending audio to Twilio:`);
            console.log(`   Raw buffer length: ${audioBuffer.length} bytes`);
            console.log(`   Expected chunks: ${Math.ceil(audioBuffer.length / chunkSize)}`);

            // Send chunks with small delays for better playback
            let offset = 0;
            const sendNextChunk = () => {
                // ✅ INTERRUPT CHECK: Stop sending if flag was cleared
                if (!session.isSpeaking) {
                    console.log('⏹️  Playback interrupted - stopping audio stream');
                    return;
                }

                if (offset >= audioBuffer.length) {
                    // All chunks sent, send mark
                    session.ws.send(
                        JSON.stringify({
                            event: "mark",
                            streamSid: session.streamSid,
                            mark: { name: "audio_complete" },
                        })
                    );

                    console.log(`✅ Sent ${chunksSent} audio chunks to Twilio (streamSid: ${session.streamSid})`);

                    // Clear speaking flag after estimated duration
                    const estimatedDurationMs = chunksSent * 20;
                    setTimeout(() => {
                        session.isSpeaking = false;
                        console.log(`✅ Agent finished speaking`);
                    }, estimatedDurationMs);
                    return;
                }

                // FIX: Slice BUFFER first, then encode to Base64
                // This ensures valid Base64 for each chunk and exact 20ms audio packets
                const chunkBuffer = audioBuffer.slice(offset, offset + chunkSize);
                const payload = chunkBuffer.toString('base64');

                session.ws.send(
                    JSON.stringify({
                        event: "media",
                        streamSid: session.streamSid,
                        media: {
                            payload: payload
                        },
                    })
                );
                chunksSent++;
                offset += chunkSize;

                // Send next chunk after 20ms (matches 160 bytes @ 8kHz = 20ms of audio)
                // Use a slightly faster interval to prevent buffer underruns
                setTimeout(sendNextChunk, 18);
            };

            // Start sending chunks
            sendNextChunk();

        } catch (err) {
            console.error("❌ Error sending audio to Twilio:", err);
            session.isSpeaking = false; // Clear flag on error
        }
    }
}
module.exports = { MediaStreamHandler };
