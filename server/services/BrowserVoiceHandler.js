// Removed Deepgram import
const { LLMService } = require("../llmService.js");
const SarvamSttService = require('./sarvamSttService.js');
const WalletService = require('./walletService.js');
const CostCalculator = require('./costCalculator.js');
const AgentService = require('./agentService.js');
const ToolExecutionService = require('./toolExecutionService.js');
const fetch = require('node-fetch');

// Session management
const sessions = new Map();

class BrowserVoiceHandler {
    constructor(deepgramApiKey, geminiApiKey, openaiApiKey, elevenLabsApiKey, sarvamApiKey, mysqlPool = null) {
        if (!deepgramApiKey && !sarvamApiKey) throw new Error("Missing STT API Key (Deepgram or Sarvam)");

        // Removed strict check for Gemini API Key to allow STT-only or OpenAI-only usage
        // if (!geminiApiKey) throw new Error("Missing Gemini API Key");

        this.deepgramApiKey = deepgramApiKey; // Kept for compatibility but unused
        this.geminiApiKey = geminiApiKey;
        this.openaiApiKey = openaiApiKey;
        this.elevenLabsApiKey = elevenLabsApiKey;
        this.sarvamApiKey = sarvamApiKey;
        this.mysqlPool = mysqlPool;
        this.llmService = new LLMService(geminiApiKey, openaiApiKey); // Pass both API keys
        this.sarvamSttService = new SarvamSttService(sarvamApiKey);

        // Initialize wallet and cost tracking services
        if (mysqlPool) {
            this.walletService = new WalletService(mysqlPool);
            this.costCalculator = new CostCalculator(mysqlPool, this.walletService);
        }

        console.log('✅ BrowserVoiceHandler initialized (Sarvam STT enabled)');
    }

    /**
     * Create a new voice session for a browser client
     */
    createSession(connectionId, agentPrompt, agentVoiceId, ws, userId = null, agentId = null, agentModel = null, agentSettings = null, tools = []) {
        const session = {
            connectionId,
            agentPrompt,
            agentVoiceId,
            agentModel: agentModel || "gemini-2.0-flash",
            agentSettings,
            tools,
            ws,
            userId,
            agentId,
            conversationHistory: [],
            elevenLabsConnection: null,
            isProcessing: false,
            audioQueue: [], // Unused, keeping for compatibility if needed
            audioBuffer: [], // Accumulate audio chunks here
            silenceTimer: null,
            startTime: Date.now(),
            totalInputTokens: 0,
            totalOutputTokens: 0,
            totalAudioDuration: 0,
            callLogId: null,
            userSpeechBuffer: '',
            lastSpeechTime: Date.now(),
            isInterrupted: false,
        };

        sessions.set(connectionId, session);
        console.log(`📞 Created browser voice session: ${connectionId}`);

        return session;
    }

    /**
     * End a voice session and cleanup resources
     */
    async endSession(connectionId) {
        const session = sessions.get(connectionId);
        if (!session) return;

        console.log(`📴 Ending browser voice session: ${connectionId}`);

        // Deepgram cleanup removed


        // Close ElevenLabs connection
        if (session.elevenLabsConnection) {
            try {
                session.elevenLabsConnection.close();
            } catch (error) {
                console.error('Error closing ElevenLabs connection:', error);
            }
        }

        // Clear silence timer
        if (session.silenceTimer) {
            clearTimeout(session.silenceTimer);
        }

        // Log call end
        await this.logCallEnd(session);

        sessions.delete(connectionId);
    }

    /**
     * Handle incoming WebSocket connection from browser
     */
    handleConnection(ws, req) {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const voiceId = url.searchParams.get('voiceId') || 'default';
        const agentId = url.searchParams.get('agentId');
        const userId = url.searchParams.get('userId');
        const identity = decodeURIComponent(url.searchParams.get('identity') || '');
        const connectionId = `browser-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        console.log(`🌐 New browser voice connection: ${connectionId}`);
        console.log(`   Voice ID: ${voiceId}, Agent ID: ${agentId}, User ID: ${userId}`);

        (async () => {
            // Load agent details if agentId is present
            let agentPrompt = identity || "You are a helpful AI assistant.";
            let agentVoiceId = voiceId || "21m00Tcm4TlvDq8ikWAM"; // default
            let agentModel = "gemini-2.0-flash"; // default model
            let greetingMessage = "Hello! How can I help you today?";
            let tools = [];
            let agent = null;
            let settings = null;

            if (agentId && userId && this.mysqlPool) {
                try {
                    const agentService = new AgentService(this.mysqlPool);
                    agent = await agentService.getAgentById(userId, agentId);
                    if (agent) {
                        agentPrompt = agent.identity || agentPrompt;
                        settings = agent.settings;

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
                try {
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
                } catch (err) {
                    console.error("⚠️ Error checking balance:", err);
                }
            }

            // Create session
            const session = this.createSession(connectionId, agentPrompt, agentVoiceId, ws, userId, agentId, agentModel, settings, tools);

            // Send initial greeting if configured
            // Use the greeting from agent settings if available
            this.sendInitialGreeting(session, greetingMessage);

            // Handle incoming messages from browser
            ws.on('message', async (message) => {
                try {
                    const data = JSON.parse(message);

                    switch (data.event) {
                        case 'audio':
                            // Buffer audio and perform VAD
                            await this.handleIncomingAudio(session, data.data);
                            break;

                        case 'ping':
                            ws.send(JSON.stringify({ event: 'pong' }));
                            break;

                        case 'stop-speaking':
                            // Handle user interruption
                            this.handleInterruption(session);
                            break;

                        default:
                            console.log(`Unknown event: ${data.event}`);
                    }
                } catch (error) {
                    console.error('Error processing browser message:', error);
                    ws.send(JSON.stringify({
                        event: 'error',
                        message: 'Failed to process message'
                    }));
                }
            });

            // Handle WebSocket close
            ws.on('close', async () => {
                console.log(`🔌 Browser disconnected: ${connectionId}`);
                await this.endSession(connectionId);
            });

            // Handle WebSocket errors
            ws.on('error', (error) => {
                console.error(`❌ Browser WebSocket error (${connectionId}):`, error);
            });

            // Log call start
            this.logCallStart(session);

        })();
    }

    /**
     * Initialize Deepgram streaming connection - Removed
     */
    initializeDeepgramStreaming(session) {
        // Deprecated/Removed
        console.log('Deepgram streaming disabled in favor of Sarvam STT');
    }

    /**
     * Handle incoming audio from browser
     * Buffers audio and uses simple VAD to detect silence/utterance end
     */
    async handleIncomingAudio(session, base64Audio) {
        try {
            // Decode base64 audio to buffer (Int16 PCM)
            const audioChunk = Buffer.from(base64Audio, 'base64');
            session.audioBuffer.push(audioChunk);

            // Simple energy-based VAD (Voice Activity Detection)
            // Calculate RMS (Root Mean Square) amplitude
            let sumSquares = 0;
            // Iterate by 2 bytes (16-bit samples)
            for (let i = 0; i < audioChunk.length; i += 2) {
                const sample = audioChunk.readInt16LE(i);
                sumSquares += sample * sample;
            }
            const numSamples = audioChunk.length / 2;
            const rms = Math.sqrt(sumSquares / numSamples);

            // Threshold for silence (adjustable)
            // 0x7FFF is max (32767). Low values like 500-1000 indicate silence.
            // Frontend might already filter very quiet noise, but let's be safe.
            const SILENCE_THRESHOLD = 500;

            if (rms > SILENCE_THRESHOLD) {
                // Speech detected
                session.lastSpeechTime = Date.now();
                if (session.silenceTimer) {
                    clearTimeout(session.silenceTimer);
                    session.silenceTimer = null;
                }
            } else {
                // Silence detected
                if (!session.silenceTimer && session.audioBuffer.length > 0) {
                    // Start silence timer
                    session.silenceTimer = setTimeout(() => {
                        this.processBufferedAudio(session);
                    }, 1500); // 1.5 seconds of silence = end of utterance
                }
            }

        } catch (error) {
            console.error('Error handling incoming audio:', error);
        }
    }

    /**
     * Process buffered audio: Transcribe with Sarvam -> LLM
     */
    async processBufferedAudio(session) {
        if (session.audioBuffer.length === 0) return;

        // Reset timer
        session.silenceTimer = null;

        // Concatenate buffer
        const completeBuffer = Buffer.concat(session.audioBuffer);
        // Clear buffer immediately to avoid duplicates
        session.audioBuffer = [];

        // Skip if buffer is too short (likely just noise)
        if (completeBuffer.length < 3200) { // < 0.1s at 16kHz
            return;
        }

        try {
            console.log(`🎤 Sending ${completeBuffer.length} bytes to Sarvam STT...`);

            // Convert raw PCM to WAV container for Sarvam
            const wavBuffer = this.createWavHeader(completeBuffer);

            // Call Sarvam STT
            const transcript = await this.sarvamSttService.transcribe(wavBuffer);

            if (transcript && transcript.trim()) {
                console.log(`📝 Sarvam Transcript: ${transcript}`);

                // Send user transcript to browser
                session.ws.send(JSON.stringify({
                    event: 'transcript',
                    text: transcript,
                    isFinal: true
                }));

                // Add to conversation history
                this.appendToContext(session, transcript, 'user');

                // Process with LLM
                await this.processUserInput(session, transcript);
            } else {
                console.log('📝 Empty transcript from Sarvam');
            }

        } catch (error) {
            console.error('❌ Sarvam STT processing error:', error);
            session.ws.send(JSON.stringify({
                event: 'error',
                message: 'Speech recognition failed'
            }));
        }
    }

    /**
     * Create WAV header for PCM data
     */
    createWavHeader(pcmData) {
        const numChannels = 1;
        const sampleRate = 16000;
        const bitsPerSample = 16;
        const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
        const blockAlign = numChannels * (bitsPerSample / 8);
        const dataSize = pcmData.length;
        const buffer = Buffer.alloc(44 + dataSize);

        // RIFF chunk
        buffer.write('RIFF', 0);
        buffer.writeUInt32LE(36 + dataSize, 4);
        buffer.write('WAVE', 8);

        // fmt sub-chunk
        buffer.write('fmt ', 12);
        buffer.writeUInt32LE(16, 16); // Subchunk1Size
        buffer.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
        buffer.writeUInt16LE(numChannels, 22);
        buffer.writeUInt32LE(sampleRate, 24);
        buffer.writeUInt32LE(byteRate, 28);
        buffer.writeUInt16LE(blockAlign, 32);
        buffer.writeUInt16LE(bitsPerSample, 34);

        // data sub-chunk
        buffer.write('data', 36);
        buffer.writeUInt32LE(dataSize, 40);

        // Write PCM data
        pcmData.copy(buffer, 44);

        return buffer;
    }

    /**
     * Process user input with LLM
     */
    async processUserInput(session, userInput) {
        if (session.isProcessing) {
            console.log('Already processing, queuing input...');
            return;
        }

        session.isProcessing = true;

        try {
            console.log(`🤖 Processing user input: "${userInput}"`);

            // Call LLM
            const response = await this.callLLM(session, userInput);

            if (response) {
                // Add to conversation history
                this.appendToContext(session, response, 'assistant');

                // Send text response to browser
                session.ws.send(JSON.stringify({
                    event: 'agent-response',
                    text: response
                }));

                // Synthesize and stream audio
                await this.synthesizeAndStreamTTS(session, response);
            }

        } catch (error) {
            console.error('Error processing user input:', error);
            session.ws.send(JSON.stringify({
                event: 'error',
                message: 'Failed to process your message'
            }));
        } finally {
            session.isProcessing = false;
        }
    }

    /**
     * Call LLM for response generation
     */
    async callLLM(session, userInput) {
        try {
            console.log(`🧠 Calling LLM for session: ${session.connectionId}`);
            const modelToUse = session.agentModel || "gemini-2.0-flash";

            // Prepare conversation history in the correct format
            const contents = session.conversationHistory.map(msg => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            }));

            // Call LLM service with correct request format
            const response = await this.llmService.generateContent({
                model: modelToUse,
                contents: contents,
                config: {
                    systemInstruction: session.agentPrompt
                }
            });

            const text = response.text;
            console.log(`✅ LLM response: ${text.substring(0, 100)}...`);

            // Update token counts if available
            if (response.inputTokens) session.totalInputTokens += response.inputTokens;
            if (response.outputTokens) session.totalOutputTokens += response.outputTokens;

            // Check for Tool Call (JSON format)
            try {
                // Remove potential markdown code blocks if present
                const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
                if (cleanText.startsWith('{') && cleanText.endsWith('}')) {
                    const parsed = JSON.parse(cleanText);

                    if (parsed.tool && parsed.data) {
                        console.log(`🛠️ Tool usage detected: ${parsed.tool}`);

                        // Handle Tool Execution
                        if (parsed.tool && this.mysqlPool) {
                            const toolService = new ToolExecutionService(this.llmService, this.mysqlPool);

                            // Find the tool definition
                            const tool = session.tools && session.tools.find(t => t.name === parsed.tool);

                            if (tool) {
                                // Execute the tool
                                await toolService.executeTool(tool, parsed.data, session, session.agentSettings);

                                // Add tool result indicator to context
                                this.appendToContext(session, JSON.stringify({ tool: parsed.tool, status: "success", message: "Data processing initiated" }), "user");

                                // Recursively call LLM to get the verbal response
                                return await this.callLLM(session, "Tool executed successfully. Please continue.");
                            } else {
                                console.warn(`Tool ${parsed.tool} not found in configuration`);
                            }
                        }
                    }
                }
            } catch (jsonError) {
                // Not a valid JSON tool call, just regular text -> continue
                // console.log("Response is not JSON tool call");
            }

            return text;

        } catch (error) {
            console.error('❌ LLM call failed:', error);
            return "I apologize, but I'm having trouble processing your request right now.";
        }
    }

    /**
     * Synthesize TTS and stream to browser
     */
    async synthesizeAndStreamTTS(session, text) {
        try {
            console.log(`🔊 Synthesizing TTS: "${text.substring(0, 50)}..."`);

            const voiceProvider = this.getVoiceProvider(session.agentVoiceId);

            if (voiceProvider === 'elevenlabs') {
                await this.synthesizeElevenLabsTTS(session, text);
            } else if (voiceProvider === 'sarvam') {
                await this.synthesizeSarvamTTS(session, text);
            } else {
                console.error('Unknown voice provider:', voiceProvider);
            }

        } catch (error) {
            console.error('Error synthesizing TTS:', error);
            session.ws.send(JSON.stringify({
                event: 'error',
                message: 'Failed to generate speech'
            }));
        }
    }

    /**
     * Synthesize with ElevenLabs TTS (streaming)
     */
    async synthesizeElevenLabsTTS(session, text) {
        try {
            if (!this.elevenLabsApiKey) {
                throw new Error('ElevenLabs API key not configured');
            }

            const voiceId = session.agentVoiceId;
            const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Accept': 'audio/mpeg',
                    'Content-Type': 'application/json',
                    'xi-api-key': this.elevenLabsApiKey
                },
                body: JSON.stringify({
                    text: text,
                    model_id: 'eleven_multilingual_v2',
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75,
                        style: 0.0,
                        use_speaker_boost: true
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`ElevenLabs API error: ${response.status}`);
            }

            // Stream audio to browser
            const audioBuffer = await response.buffer();
            const base64Audio = audioBuffer.toString('base64');

            session.ws.send(JSON.stringify({
                event: 'audio',
                audio: base64Audio,
                format: 'mp3'
            }));

            console.log('✅ ElevenLabs TTS audio sent to browser');

        } catch (error) {
            console.error('❌ ElevenLabs TTS error:', error);
            throw error;
        }
    }

    /**
     * Synthesize with Sarvam TTS
     */
    async synthesizeSarvamTTS(session, text) {
        try {
            if (!this.sarvamApiKey) {
                throw new Error('Sarvam API key not configured');
            }

            const url = 'https://api.sarvam.ai/text-to-speech';

            console.log(`🔊 Calling Sarvam TTS API...`);
            console.log(`   Text: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
            console.log(`   Speaker: ${session.agentVoiceId}`);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'api-subscription-key': this.sarvamApiKey  // Lowercase header name
                },
                body: JSON.stringify({
                    inputs: [text],
                    target_language_code: 'en-IN',  // English-India
                    speaker: session.agentVoiceId,
                    model: 'bulbul:v2',  // Use v2 model
                    enable_preprocessing: true
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ Sarvam API error: ${response.status} - ${response.statusText}`);
                console.error(`   Error details: ${errorText}`);
                throw new Error(`Sarvam API error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            console.log(`✅ Sarvam API response received`);

            if (data.audios && data.audios.length > 0) {
                const base64Audio = data.audios[0];

                session.ws.send(JSON.stringify({
                    event: 'audio',
                    audio: base64Audio,
                    format: 'wav'
                }));

                console.log('✅ Sarvam TTS audio sent to browser');
            } else {
                throw new Error('No audio data in Sarvam response');
            }

        } catch (error) {
            console.error('❌ Sarvam TTS error:', error);
            throw error;
        }
    }

    /**
     * Get voice provider from voice ID
     */
    getVoiceProvider(voiceId) {
        // Sarvam voice IDs - comprehensive list
        const sarvamVoices = [
            // Female voices
            'meera', 'ananya', 'aditi', 'vidya',
            // Male voices
            'arvind', 'abhilash', 'aarav',
            // Additional Sarvam voices
            'arya', 'hitesh', 'chitra'
        ];

        // Check if voice ID contains 'sarvam' or matches known Sarvam voices
        if (voiceId.includes('sarvam') || sarvamVoices.includes(voiceId.toLowerCase())) {
            return 'sarvam';
        }

        // Default to ElevenLabs for all other voices
        return 'elevenlabs';
    }

    /**
     * Handle user interruption (stop current audio playback)
     */
    handleInterruption(session) {
        console.log(`⏸️ User interrupted session: ${session.connectionId}`);

        session.isInterrupted = true;

        // Send stop signal to browser
        session.ws.send(JSON.stringify({
            event: 'stop-audio'
        }));

        // Reset processing state
        session.isProcessing = false;
    }

    /**
     * Send initial greeting to user
     */
    async sendInitialGreeting(session, customGreeting = null) {
        try {
            // Check if agent prompt includes a greeting instruction
            const greetingText = customGreeting || "Hello! How can I help you today?";

            // Small delay to ensure connection is stable
            setTimeout(async () => {
                session.ws.send(JSON.stringify({
                    event: 'agent-response',
                    text: greetingText
                }));

                this.appendToContext(session, greetingText, 'assistant');
                await this.synthesizeAndStreamTTS(session, greetingText);
            }, 500);

        } catch (error) {
            console.error('Error sending initial greeting:', error);
        }
    }

    /**
     * Append message to conversation context
     */
    appendToContext(session, content, role) {
        session.conversationHistory.push({
            role: role,
            content: content,
            timestamp: Date.now()
        });

        // Keep conversation history manageable (last 20 messages)
        if (session.conversationHistory.length > 20) {
            session.conversationHistory = session.conversationHistory.slice(-20);
        }
    }

    /**
     * Log call start to database
     */
    async logCallStart(session) {
        if (!this.mysqlPool || !session.userId) {
            console.log('⚠️ Skipping call logging (no database pool or user ID)');
            return;
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
                    session.connectionId, // Use connection ID as call_sid for browser calls
                    'browser-client', // from_number
                    'voice-agent', // to_number
                    'inbound', // direction
                    'in-progress', // status
                    'web_call', // call_type - changed from 'browser' to match database ENUM
                    new Date(session.startTime)
                ]
            );

            session.callLogId = callId;
            console.log(`✅ Call logged to database: ${callId}`);

        } catch (error) {
            console.error('❌ Error logging call start:', error);
        }
    }

    /**
     * Log call end to database
     */
    async logCallEnd(session) {
        if (!this.mysqlPool || !session.callLogId) {
            console.log('⚠️ Skipping call end logging (no database pool or call ID)');
            return;
        }

        try {
            const endTime = new Date();
            const duration = Math.floor((endTime - session.startTime) / 1000); // Duration in seconds

            await this.mysqlPool.execute(
                `UPDATE calls 
                SET status = 'completed', 
                    ended_at = ?, 
                    duration = ? 
                WHERE id = ?`,
                [endTime, duration, session.callLogId]
            );

            console.log(`✅ Call ended and logged: ${session.callLogId}, duration: ${duration}s`);

            // Charge user for usage using CostCalculator
            if (session.userId && this.mysqlPool) {
                try {
                    console.log('💰 Calculating call costs...');
                    const usage = {
                        deepgram: 0, // No longer using Deepgram
                        sarvam: duration, // Approximate Sarvam usage (tracking duration for now, could actuaally be per-char for TTS or per-min for STT)
                    };

                    // Use CostCalculator if available
                    const costCalculator = new CostCalculator(this.mysqlPool, new WalletService(this.mysqlPool));
                    const result = await costCalculator.recordAndCharge(
                        session.userId,
                        session.callLogId,
                        usage
                    );
                    console.log(`✅ Charged user ${session.userId}: $${result.totalCharged.toFixed(4)}`);
                    console.log('   Breakdown:', result.breakdown);
                } catch (chargeError) {
                    console.error('❌ Error charging user:', chargeError.message);
                    // Don't fail the call end if charging fails
                    if (chargeError.message === 'Insufficient balance') {
                        console.warn(`⚠️ User ${session.userId} ended call with insufficient balance`);
                    }
                }
            }

        } catch (error) {
            console.error('❌ Error logging call end:', error);
        }
    }
}

module.exports = { BrowserVoiceHandler };
