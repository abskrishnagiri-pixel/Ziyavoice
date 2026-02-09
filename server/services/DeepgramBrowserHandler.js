const { createClient, LiveTranscriptionEvents } = require("@deepgram/sdk");
const { LLMService } = require("../llmService.js");
const WalletService = require('./walletService.js');
const CostCalculator = require('./costCalculator.js');

const sessions = new Map();

class DeepgramBrowserHandler {
    constructor(deepgramApiKey, geminiApiKey, openaiApiKey, mysqlPool = null) {
        if (!deepgramApiKey) throw new Error("Missing Deepgram API Key");
        // if (!geminiApiKey) throw new Error("Missing Gemini API Key");

        this.deepgramClient = createClient(deepgramApiKey);
        this.llmService = new LLMService(geminiApiKey, openaiApiKey); // Pass both API keys
        this.mysqlPool = mysqlPool; // Add database pool for call logging

        // Initialize wallet and cost tracking services
        if (mysqlPool) {
            this.walletService = new WalletService(mysqlPool);
            this.costCalculator = new CostCalculator(mysqlPool, this.walletService);
        }
    }

    createSession(connectionId, agentPrompt, agentVoiceId, ws, userId = null, agentId = null, agentModel = null) {
        const session = {
            id: connectionId,
            context: [],
            sttStream: null,
            agentPrompt,
            agentVoiceId: agentVoiceId || "21m00Tcm4TlvDq8ikWAM",
            agentModel: agentModel || "gemini-2.0-flash", // Store agent's selected model
            ws,
            isReady: false,
            isSpeaking: false,
            lastUserSpeechTime: null,
            userId: userId,
            agentId: agentId,
            callId: null, // Will be set when call is logged
            startTime: new Date(),
            // Usage tracking for billing
            usage: {
                deepgram: 0,      // seconds
                gemini: 0,        // tokens (also used for OpenAI)
                elevenlabs: 0,    // characters
                sarvam: 0         // characters
            },
            audioStartTime: null,
            totalAudioDuration: 0,
            lastProcessedTranscript: null, // Track last processed transcript to prevent duplicates
            isProcessing: false // Track if currently processing a transcript
        };
        sessions.set(connectionId, session);
        console.log(`✅ Created browser session ${connectionId} for user ${userId}, agent ${agentId}`);
        return session;
    }

    endSession(connectionId) {
        const session = sessions.get(connectionId);
        if (session) {
            if (session.sttStream) {
                // Check if finish exists before calling
                if (typeof session.sttStream.finish === 'function') {
                    session.sttStream.finish();
                }
                session.sttStream.removeAllListeners();
            }
            sessions.delete(connectionId);
            console.log(`❌ Ended browser session ${connectionId}`);
        }
    }

    appendToContext(session, text, role) {
        session.context.push({ role, parts: [{ text }] });
    }

    async handleConnection(ws, req) {
        const connectionId = 'browser_' + Date.now();
        let session = null;
        let deepgramLive = null;
        let keepAliveInterval = null;

        try {
            console.log(`📞 Browser WebSocket connection initiated: ${connectionId}`);

            // Parse query parameters
            const url = new URL(req.url, `http://${req.headers.host}`);
            const agentId = url.searchParams.get('agentId');
            const voiceId = url.searchParams.get('voiceId');
            const userId = url.searchParams.get('userId');
            let identity = url.searchParams.get('identity'); // Can be passed directly

            // Load agent details if agentId is present
            let agentPrompt = identity || "You are a helpful AI assistant.";
            let agentVoiceId = voiceId || "21m00Tcm4TlvDq8ikWAM"; // default
            let agentModel = "gemini-2.0-flash"; // default model
            let greetingMessage = "Hello! How can I help you today?";
            let tools = [];
            let agent = null; // Declare agent outside the if block

            if (agentId && userId) {
                try {
                    const AgentService = require('./agentService.js');
                    const agentService = new AgentService(require('../config/database.js').default);
                    agent = await agentService.getAgentById(userId, agentId);
                    if (agent) {
                        agentPrompt = agent.identity || agentPrompt;

                        // Process Tools
                        if (agent.settings && agent.settings.tools && agent.settings.tools.length > 0) {
                            tools = agent.settings.tools;
                            const toolDescriptions = tools.map(tool =>
                                `- ${tool.name}: ${tool.description} (Parameters: ${tool.parameters?.map(p => `${p.name} (${p.type})${p.required ? ' [required]' : ''}`).join(', ') || 'None'})`
                            ).join('\n');

                            agentPrompt += `\n\nAvailable Tools:\n${toolDescriptions}\n\nWhen you need to collect information from the user, ask for the required parameters. When all required information is collected, respond with a JSON object in the format: {"tool": "tool_name", "data": {"param1": "value1", "param2": "value2"}}. Do NOT add any other text before or after the JSON.`;
                        }

                        if (agent.voiceId) agentVoiceId = agent.voiceId;
                        if (agent.model) {
                            agentModel = agent.model;
                            console.log(`🤖 Using agent model: ${agentModel}`);
                        }
                        if (agent.settings?.greetingLine) greetingMessage = agent.settings.greetingLine;
                        console.log(`✅ Loaded agent details for ${agent.name} with ${tools.length} tools`);
                    }
                } catch (err) {
                    console.error("⚠️ Error loading agent details:", err);
                }
            }

            // Check user balance before starting call
            if (userId && this.walletService) {
                const balanceCheck = await this.walletService.checkBalanceForCall(userId, 0.10);
                if (!balanceCheck.allowed) {
                    console.error(`❌ Insufficient balance for user ${userId}: ${balanceCheck.message}`);
                    ws.send(JSON.stringify({
                        event: 'error',
                        message: balanceCheck.message,
                        balance: balanceCheck.balance
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

            session = this.createSession(connectionId, agentPrompt, agentVoiceId, ws, userId, agentId, agentModel);
            session.tools = tools; // Store tools in session for later lookup
            session.language = agentLanguage; // Store language in session

            // Log call start to database
            await this.logCallStart(session);

            // Send initial greeting
            setTimeout(async () => {
                try {
                    if (ws.readyState === ws.OPEN) {
                        console.log(`👋 Sending greeting: "${greetingMessage}"`);

                        // Send text update
                        ws.send(JSON.stringify({
                            event: 'agent-response',
                            text: greetingMessage
                        }));

                        // Send audio
                        const audio = await this.synthesizeTTS(greetingMessage, session.agentVoiceId, session);
                        if (audio) {
                            this.sendAudioToClient(session, audio);
                        }
                    }
                } catch (e) {
                    console.error("❌ Error sending greeting:", e);
                }
            }, 500);

            // Initialize Deepgram for Browser Audio (Linear16 16kHz)
            console.log("🔄 Initializing Deepgram for browser stream...");
            deepgramLive = this.deepgramClient.listen.live({
                model: "nova-2",
                language: deepgramLanguage, // Use agent's language
                smart_format: true,  // smart_format handles punctuation automatically
                encoding: "linear16",
                sample_rate: 16000,
                interim_results: true,
                utterance_end_ms: 500,
                // Removed punctuate: true (conflicts with smart_format)
            });

            session.sttStream = deepgramLive;

            // Deepgram Event Handlers
            deepgramLive.on(LiveTranscriptionEvents.Open, () => {
                console.log("✅ Deepgram browser connection opened");
            });

            deepgramLive.on(LiveTranscriptionEvents.Transcript, async (data) => {
                try {
                    const transcript = data.channel?.alternatives?.[0]?.transcript;
                    const isFinal = data.is_final;

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

                    console.log(`🎤 User (Browser): "${transcript}"`);
                    session.lastUserSpeechTime = Date.now();

                    // Track Deepgram usage (estimate ~1 second per transcript)
                    // More accurate: track actual audio duration if available
                    if (data.duration) {
                        session.usage.deepgram += data.duration;
                    } else {
                        // Fallback: estimate based on word count (avg 2.5 words/second)
                        const wordCount = transcript.split(' ').length;
                        const estimatedDuration = wordCount / 2.5;
                        session.usage.deepgram += estimatedDuration;
                    }

                    // Send transcript to client for UI display
                    if (ws.readyState === ws.OPEN) {
                        ws.send(JSON.stringify({
                            event: 'transcript',
                            text: transcript
                        }));
                    }

                    // Handle Interruption
                    if (session.isSpeaking) {
                        console.log(`⚠️ User interrupted agent`);
                        session.isSpeaking = false;
                        // Tell client to stop audio
                        ws.send(JSON.stringify({ event: 'stop-audio' }));
                    }

                    this.appendToContext(session, transcript, "user");

                    // Get LLM Response
                    const llmResponse = await this.callLLM(session);
                    this.appendToContext(session, llmResponse, "model");

                    // Send text response to client immediately
                    if (ws.readyState === ws.OPEN) {
                        ws.send(JSON.stringify({
                            event: 'agent-response',
                            text: llmResponse
                        }));
                    }

                    // Generate TTS in parallel (don't await - let it happen in background)
                    console.log(`🔊 Synthesizing response...`);
                    this.synthesizeTTS(llmResponse, session.agentVoiceId, session)
                        .then(ttsAudio => {
                            if (ttsAudio) {
                                this.sendAudioToClient(session, ttsAudio);
                            }
                            // Mark processing as complete after TTS
                            session.isProcessing = false;
                        })
                        .catch(err => {
                            console.error("❌ TTS generation failed:", err);
                            // Make sure to clear the processing flag on error
                            session.isProcessing = false;
                        });

                } catch (err) {
                    console.error("❌ Error processing transcript:", err);
                }
            });

            deepgramLive.on(LiveTranscriptionEvents.UtteranceEnd, () => {
                console.log("🎤 User finished speaking (browser)");
            });

            deepgramLive.on(LiveTranscriptionEvents.Error, (err) => {
                console.error("❌ Deepgram error:", err);
            });

            deepgramLive.on(LiveTranscriptionEvents.Close, () => {
                console.log("⚠️ Deepgram connection closed");
            });

            // WebSocket Message Handling
            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message);

                    if (data.event === 'audio' && data.data) {
                        // Received base64 audio from browser
                        const audioBuffer = Buffer.from(data.data, 'base64');
                        if (deepgramLive.getReadyState() === 1) { // OPEN
                            deepgramLive.send(audioBuffer);
                        }
                    } else if (data.event === 'ping') {
                        ws.send(JSON.stringify({ event: 'pong' }));
                    } else if (data.event === 'stop') {
                        this.endSession(connectionId);
                    }
                } catch (err) {
                    console.error("❌ Error handling message:", err);
                }
            });

            ws.on('close', async () => {
                console.log("🔌 Browser WebSocket closed");
                // Log call end before ending session
                if (session) {
                    await this.logCallEnd(session);
                }
                this.endSession(connectionId);
                if (keepAliveInterval) clearInterval(keepAliveInterval);
            });

            // Keep-alive setup
            keepAliveInterval = setInterval(() => {
                if (deepgramLive && deepgramLive.getReadyState() === 1) {
                    deepgramLive.keepAlive();
                }
            }, 10000);


        } catch (err) {
            console.error("❌ Browser connection setup error:", err);
            ws.close();
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
            if (response.usageMetadata) {
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

                        // Handle Google Sheets Tool
                        if (parsed.tool.includes('Sheet') || parsed.tool === 'addToSheet' || parsed.tool === 'saveData') {
                            const googleSheetsService = require('./googleSheetsService.js');

                            // Find the tool definition to get the Spreadsheet ID
                            let spreadsheetId;
                            if (session.tools && session.tools.length > 0) {
                                const tool = session.tools.find(t => t.name === parsed.tool);
                                if (tool) spreadsheetId = googleSheetsService.extractSpreadsheetId(tool.webhookUrl); // In UI, URL is stored in webhookUrl
                            }

                            if (!spreadsheetId) {
                                console.error('Spreadsheet URL not found in tool configuration');
                                // Fallback? Maybe hardcode or error
                            } else {
                                await googleSheetsService.appendGenericRow(spreadsheetId, parsed.data);
                            }

                            // Add tool result to context and ask LLM for final response
                            this.appendToContext(session, JSON.stringify({ tool: parsed.tool, status: "success", message: "Data saved successfully" }), "user"); // mimic user/system confirmation

                            // Recursively call LLM to get the verbal response
                            return await this.callLLM(session);
                        }
                    }
                }
            } catch (jsonError) {
                // Not a valid JSON tool call, just regular text -> continue
                // console.log("Response is not JSON tool call");
            }

            return text;
        } catch (err) {
            console.error("❌ LLM error details:", err.message);
            console.error(err.stack);
            return "I'm having trouble connecting to my brain right now.";
        }
    }

    async synthesizeTTS(text, voiceId, session = null) {
        try {
            console.log(`🔊 Generating TTS for: "${text.substring(0, 20)}..."`);
            const { generateTTS } = require('./tts_controller.js');
            // Request High Quality MP3 for browser playback
            const audioBuffer = await generateTTS(text, {
                voiceId,
                output_format: 'mp3_44100_128', // ElevenLabs
                format: 'mp3',                  // Sarvam
                skipConversion: true            // Sarvam (prevent ulaw conversion)
            });
            console.log(`✅ TTS generated: ${audioBuffer ? audioBuffer.length : 0} bytes`);

            // Track TTS usage for billing
            if (session && session.usage) {
                const characterCount = text.length;
                // Determine provider from voiceId (Sarvam voices typically have specific naming)
                const isSarvam = voiceId && (voiceId.includes('sarvam') || voiceId.includes('anushka') || voiceId.includes('arvind'));

                if (isSarvam) {
                    session.usage.sarvam += characterCount;
                    console.log(`📊 Sarvam TTS: ${characterCount} characters (Total: ${session.usage.sarvam})`);
                } else {
                    session.usage.elevenlabs += characterCount;
                    console.log(`📊 ElevenLabs TTS: ${characterCount} characters (Total: ${session.usage.elevenlabs})`);
                }
            }

            return audioBuffer;
        } catch (err) {
            console.error("❌ TTS error details:", err.message);
            console.error(err.stack);
            return null;
        }
    }

    sendAudioToClient(session, audioBuffer) {
        if (!session.ws || session.ws.readyState !== session.ws.OPEN) return;

        session.isSpeaking = true;
        const base64Audio = audioBuffer.toString('base64');

        session.ws.send(JSON.stringify({
            event: 'audio',
            audio: base64Audio
        }));

        // Estimate duration for isSpeaking flag
        // MP3 128kbps = 16KB/s approx
        const durationSeconds = audioBuffer.length / 16000;
        setTimeout(() => {
            session.isSpeaking = false;
        }, durationSeconds * 1000);
    }

    async logCallStart(session) {
        if (!this.mysqlPool || !session.userId) {
            console.log('⚠️ Skipping call logging (no database pool or user ID)');
            return null;
        }

        try {
            const { v4: uuidv4 } = require('uuid');
            const callId = uuidv4();

            await this.mysqlPool.execute(
                `INSERT INTO calls (id, user_id, agent_id, call_sid, from_number, to_number, direction, status, call_type, started_at, timestamp)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                [
                    callId,
                    session.userId,
                    session.agentId || null,
                    session.id, // Use session ID as call_sid for web calls
                    'web-browser', // from_number
                    'voice-agent', // to_number
                    'inbound', // direction
                    'in-progress', // status
                    'web_call', // call_type
                    session.startTime
                ]
            );

            session.callId = callId;
            console.log(`✅ Call logged to database: ${callId}`);
            return callId;
        } catch (err) {
            console.error('❌ Error logging call start:', err);
            return null;
        }
    }

    async logCallEnd(session) {
        if (!this.mysqlPool || !session.callId) {
            console.log('⚠️ Skipping call end logging (no database pool or call ID)');
            return;
        }

        try {
            const endTime = new Date();
            const duration = Math.floor((endTime - session.startTime) / 1000); // Duration in seconds

            await this.mysqlPool.execute(
                `UPDATE calls SET status = ?, ended_at = ?, duration = ? WHERE id = ?`,
                ['completed', endTime, duration, session.callId]
            );

            console.log(`✅ Call ended and logged: ${session.callId}, duration: ${duration}s`);

            // Charge user for usage
            if (session.userId && this.costCalculator) {
                try {
                    console.log('💰 Calculating call costs...', session.usage);
                    const result = await this.costCalculator.recordAndCharge(
                        session.userId,
                        session.callId,
                        session.usage
                    );
                    console.log(`✅ Charged user ${session.userId}: $${result.totalCharged.toFixed(4)}`);
                    console.log('   Breakdown:', result.breakdown);
                } catch (chargeError) {
                    console.error('❌ Error charging user:', chargeError.message);
                    // Log the failed charge but don't fail the call end
                    if (chargeError.message === 'Insufficient balance') {
                        console.warn(`⚠️ User ${session.userId} ended call with insufficient balance`);
                    }
                }
            }
        } catch (err) {
            console.error('❌ Error logging call end:', err);
        }
    }
}

module.exports = { DeepgramBrowserHandler };
