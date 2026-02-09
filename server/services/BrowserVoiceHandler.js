const { createClient, LiveTranscriptionEvents } = require("@deepgram/sdk");
const { LLMService } = require("../llmService.js");
const WalletService = require('./walletService.js');
const CostCalculator = require('./costCalculator.js');
const fetch = require('node-fetch');

// Session management
const sessions = new Map();

class BrowserVoiceHandler {
    constructor(deepgramApiKey, geminiApiKey, openaiApiKey, elevenLabsApiKey, sarvamApiKey, mysqlPool = null) {
        if (!deepgramApiKey) throw new Error("Missing Deepgram API Key");

        // Removed strict check for Gemini API Key to allow STT-only or OpenAI-only usage
        // if (!geminiApiKey) throw new Error("Missing Gemini API Key");

        this.deepgramApiKey = deepgramApiKey;
        this.geminiApiKey = geminiApiKey;
        this.openaiApiKey = openaiApiKey;
        this.elevenLabsApiKey = elevenLabsApiKey;
        this.sarvamApiKey = sarvamApiKey;
        this.mysqlPool = mysqlPool;
        this.llmService = new LLMService(geminiApiKey, openaiApiKey); // Pass both API keys
        this.deepgramClient = createClient(deepgramApiKey);

        console.log('✅ BrowserVoiceHandler initialized');
    }

    /**
     * Create a new voice session for a browser client
     */
    createSession(connectionId, agentPrompt, agentVoiceId, ws, userId = null, agentId = null) {
        const session = {
            connectionId,
            agentPrompt,
            agentVoiceId,
            ws,
            userId,
            agentId,
            conversationHistory: [],
            deepgramConnection: null,
            elevenLabsConnection: null,
            isProcessing: false,
            audioQueue: [],
            startTime: Date.now(),
            totalInputTokens: 0,
            totalOutputTokens: 0,
            totalAudioDuration: 0,
            callLogId: null,
            userSpeechBuffer: '',
            lastSpeechTime: Date.now(),
            silenceTimeout: null,
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

        // Close Deepgram connection
        if (session.deepgramConnection) {
            try {
                session.deepgramConnection.finish();
            } catch (error) {
                console.error('Error closing Deepgram connection:', error);
            }
        }

        // Close ElevenLabs connection
        if (session.elevenLabsConnection) {
            try {
                session.elevenLabsConnection.close();
            } catch (error) {
                console.error('Error closing ElevenLabs connection:', error);
            }
        }

        // Clear silence timeout
        if (session.silenceTimeout) {
            clearTimeout(session.silenceTimeout);
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

        // Create session
        const session = this.createSession(connectionId, identity, voiceId, ws, userId, agentId);

        // Initialize Deepgram streaming connection
        this.initializeDeepgramStreaming(session);

        // Handle incoming messages from browser
        ws.on('message', async (message) => {
            try {
                const data = JSON.parse(message);

                switch (data.event) {
                    case 'audio':
                        // Forward audio to Deepgram for transcription
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

        // Send initial greeting if configured
        this.sendInitialGreeting(session);
    }

    /**
     * Initialize Deepgram streaming connection for real-time STT
     */
    initializeDeepgramStreaming(session) {
        try {
            console.log(`🎤 Initializing Deepgram streaming for session: ${session.connectionId}`);

            const deepgramConnection = this.deepgramClient.listen.live({
                model: 'nova-2',
                language: 'en-US',
                smart_format: true,
                interim_results: true,
                utterance_end_ms: 1000,
                vad_events: true,
                encoding: 'linear16',
                sample_rate: 16000,
                channels: 1,
            });

            session.deepgramConnection = deepgramConnection;

            // Handle transcription results
            deepgramConnection.on(LiveTranscriptionEvents.Transcript, async (data) => {
                const transcript = data.channel?.alternatives?.[0]?.transcript;
                const isFinal = data.is_final;

                if (transcript && transcript.trim()) {
                    console.log(`📝 Transcript (${isFinal ? 'final' : 'interim'}): ${transcript}`);

                    if (isFinal) {
                        // Send transcript to browser
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
                        // Send interim results to browser for UI feedback
                        session.ws.send(JSON.stringify({
                            event: 'transcript',
                            text: transcript,
                            isFinal: false
                        }));
                    }
                }
            });

            // Handle utterance end (user stopped speaking)
            deepgramConnection.on(LiveTranscriptionEvents.UtteranceEnd, async () => {
                console.log('🔇 Utterance end detected');
                // This can be used to trigger LLM processing if needed
            });

            // Handle errors
            deepgramConnection.on(LiveTranscriptionEvents.Error, (error) => {
                console.error('❌ Deepgram error:', error);
                session.ws.send(JSON.stringify({
                    event: 'error',
                    message: 'Speech recognition error'
                }));
            });

            // Handle connection close
            deepgramConnection.on(LiveTranscriptionEvents.Close, () => {
                console.log('🔌 Deepgram connection closed');
            });

            console.log('✅ Deepgram streaming initialized');

        } catch (error) {
            console.error('❌ Failed to initialize Deepgram streaming:', error);
            session.ws.send(JSON.stringify({
                event: 'error',
                message: 'Failed to initialize speech recognition'
            }));
        }
    }

    /**
     * Handle incoming audio from browser
     */
    async handleIncomingAudio(session, base64Audio) {
        try {
            if (!session.deepgramConnection) {
                console.error('No Deepgram connection available');
                return;
            }

            // Decode base64 audio to buffer
            const audioBuffer = Buffer.from(base64Audio, 'base64');

            // Send to Deepgram for transcription
            if (session.deepgramConnection.getReadyState() === 1) { // OPEN
                session.deepgramConnection.send(audioBuffer);
            } else {
                console.warn('Deepgram connection not ready, state:', session.deepgramConnection.getReadyState());
            }

        } catch (error) {
            console.error('Error handling incoming audio:', error);
        }
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

            // Prepare conversation history in the correct format
            const contents = session.conversationHistory.map(msg => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            }));

            // Call LLM service with correct request format
            const response = await this.llmService.generateContent({
                model: 'gemini-2.0-flash-exp',
                contents: contents,
                config: {
                    systemInstruction: session.agentPrompt
                }
            });

            console.log(`✅ LLM response: ${response.text.substring(0, 100)}...`);

            // Update token counts if available
            if (response.inputTokens) session.totalInputTokens += response.inputTokens;
            if (response.outputTokens) session.totalOutputTokens += response.outputTokens;

            return response.text;

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
    async sendInitialGreeting(session) {
        try {
            // Check if agent prompt includes a greeting instruction
            const greetingText = "Hello! How can I help you today?";

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
                        deepgram: duration, // Approximate deepgram usage in seconds
                        gemini: session.totalInputTokens + session.totalOutputTokens,
                        elevenlabs: 0, // Will be tracked by character count if needed
                        sarvam: 0 // Will be tracked by character count if needed
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
