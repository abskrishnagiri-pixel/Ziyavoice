"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElevenLabsStreamHandler = void 0;
var ulaw = require("node-ulaw");
var database_js_1 = require("../config/database.js");
var llmService_js_1 = require("../llmService.js");
var uuid_1 = require("uuid");
var stream_1 = require("stream");
var sessions = new Map();
var ElevenLabsStreamHandler = /** @class */ (function () {
    function ElevenLabsStreamHandler() {
        this.llmService = new llmService_js_1.LLMService();
    }
    /**
     * Create a new session for a call
     */
    ElevenLabsStreamHandler.prototype.createSession = function (callId, agentId, userId, agentPrompt, voiceId, agentModel, ws, elevenLabsClient) {
        var session = {
            callId: callId,
            agentId: agentId,
            userId: userId,
            context: [],
            ws: ws,
            agentPrompt: agentPrompt,
            voiceId: voiceId,
            agentModel: agentModel,
            isProcessing: false,
            audioBuffer: Buffer.alloc(0),
            elevenLabsClient: elevenLabsClient,
            lastTranscriptTime: Date.now()
        };
        sessions.set(callId, session);
        console.log("Created session for call ".concat(callId));
        return session;
    };
    /**
     * End a session and clean up resources
     */
    ElevenLabsStreamHandler.prototype.endSession = function (callId) {
        var session = sessions.get(callId);
        if (session) {
            sessions.delete(callId);
            console.log("Ended session for call ".concat(callId));
        }
    };
    /**
     * Handle WebSocket connection from Twilio media stream
     */
    ElevenLabsStreamHandler.prototype.handleConnection = function (ws, req) {
        return __awaiter(this, void 0, void 0, function () {
            var url, callId, agentId, agentConfig, callInfo, userId, agentPrompt, voiceId, elevenLabsApiKey, elevenLabsClient, session, heartbeatInterval, _this, error_0;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        url = new URL(req.url, "http://".concat(req.headers.host));
                        callId = url.searchParams.get('callId');
                        agentId = url.searchParams.get('agentId');
                        if (!callId || !agentId) {
                            console.error('Missing callId or agentId in WebSocket connection');
                            ws.close();
                            return [2 /*return*/];
                        }
                        console.log("WebSocket connection established for call ".concat(callId, " with agent ").concat(agentId));
                        return [4 /*yield*/, this.fetchAgentConfig(agentId)];
                    case 1:
                        agentConfig = _a.sent();
                        if (!agentConfig) {
                            console.error("Agent configuration not found for agentId: ".concat(agentId));
                            ws.close();
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.fetchCallInfo(callId)];
                    case 2:
                        callInfo = _a.sent();
                        if (!callInfo) {
                            console.error("Call information not found for callId: ".concat(callId));
                            ws.close();
                            return [2 /*return*/];
                        }
                        userId = callInfo.userId;
                        agentPrompt = agentConfig.identity;
                        voiceId = agentConfig.voiceId;
                        agentModel = agentConfig.model || 'gemini-2.5-flash';
                        elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
                        if (!elevenLabsApiKey) {
                            console.error('ELEVENLABS_API_KEY not configured');
                            ws.close();
                            return [2 /*return*/];
                        }
                        elevenLabsClient = new (require('@elevenlabs/elevenlabs-js')).ElevenLabsClient({ apiKey: elevenLabsApiKey });
                        session = this.createSession(callId, agentId, userId, agentPrompt, voiceId, agentModel, ws, elevenLabsClient);
                        console.log("Session created for call ".concat(callId, " with agent ").concat(agentConfig.name, " using voice ").concat(voiceId, " and model ").concat(agentModel));
                        heartbeatInterval = setInterval(function () {
                            if (ws.readyState === ws.OPEN) {
                                ws.send(JSON.stringify({ event: 'ping' }));
                            }
                        }, 25000);
                        _this = this;
                        // Handle incoming messages from Twilio
                        ws.on('message', function (message) { return __awaiter(_this, void 0, void 0, function () {
                            var data, greetingLine;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        try {
                                            data = JSON.parse(message.toString());
                                            switch (data.event) {
                                                case 'connected':
                                                    console.log("Call ".concat(callId, " connected to media stream"));
                                                    greetingLine = agentConfig.settings && agentConfig.settings.greetingLine ? agentConfig.settings.greetingLine : 'Hello, how can I help you today?';
                                                    return [4 /*yield*/, this.generateTTS(session, greetingLine)];
                                                case 1:
                                                    _a.sent();
                                                    return [2 /*return*/];
                                                case 2:
                                                    if (data.media && data.media.payload) {
                                                        return [4 /*yield*/, this.handleIncomingAudio(session, data.media.payload)];
                                                    }
                                                    return [3 /*break*/, 4];
                                                case 3:
                                                    _a.sent();
                                                    _a.label = 4;
                                                case 4:
                                                    if (data.event === 'mark') {
                                                        console.log("Mark received: ".concat(data.mark && data.mark.requestId ? data.mark.requestId : 'unknown'));
                                                    }
                                                    if (data.event === 'stop') {
                                                        console.log("Call ".concat(callId, " media stream stopped"));
                                                        this.endSession(callId);
                                                    }
                                                    if (data.event !== 'connected' && data.event !== 'media' && data.event !== 'mark' && data.event !== 'stop') {
                                                        console.log("Unknown Twilio event: ".concat(data.event));
                                                    }
                                                    return [2 /*return*/];
                                            }
                                        }
                                        catch (error) {
                                            console.error('Error processing WebSocket message:', error);
                                        }
                                        return [2 /*return*/];
                                    }
                                });
                            }); });
                        // Handle WebSocket connection close
                        ws.on('close', function (code, reason) {
                            console.log("WebSocket connection closed for call ".concat(callId, ". Code: ").concat(code, ", Reason: ").concat(reason));
                            _this.endSession(callId);
                            clearInterval(heartbeatInterval);
                        });
                        // Handle WebSocket errors
                        ws.on('error', function (error) {
                            console.error("WebSocket error for call ".concat(callId, ":"), error);
                        });
                        return [3 /*break*/, 5];
                    case 3:
                        return [3 /*break*/, 5];
                    case 4:
                        error_0 = _a.sent();
                        console.error('Error handling WebSocket connection:', error_0);
                        ws.close();
                        return [2 /*return*/];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Handle incoming audio from Twilio
     */
    ElevenLabsStreamHandler.prototype.handleIncomingAudio = function (session, base64Audio) {
        return __awaiter(this, void 0, void 0, function () {
            var mulawBuffer, pcmBuffer;
            return __generator(this, function (_a) {
                try {
                    mulawBuffer = Buffer.from(base64Audio, 'base64');
                    pcmBuffer = ulaw.decode(mulawBuffer);
                    // Accumulate audio in buffer
                    session.audioBuffer = Buffer.concat([session.audioBuffer, pcmBuffer]);
                    session.lastTranscriptTime = Date.now();
                }
                catch (error) {
                    console.error('Error handling incoming audio:', error);
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Process accumulated audio buffer through ElevenLabs STT
     */
    ElevenLabsStreamHandler.prototype.processAudioBuffer = function (session) {
        return __awaiter(this, void 0, void 0, function () {
            var audioStream, bufferToProcess, transcript, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (session.isProcessing || session.audioBuffer.length === 0) {
                            return [2 /*return*/];
                        }
                        session.isProcessing = true;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 5, , 6]);
                        audioStream = stream_1.Readable.from(session.audioBuffer);
                        bufferToProcess = session.audioBuffer;
                        session.audioBuffer = Buffer.alloc(0);
                        return [4 /*yield*/, this.transcribeWithElevenLabs(session, bufferToProcess)];
                    case 2:
                        transcript = _a.sent();
                        if (!(transcript && transcript.trim())) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.processTranscript(session, transcript)];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        session.isProcessing = false;
                        return [3 /*break*/, 6];
                    case 5:
                        error_1 = _a.sent();
                        console.error('Error processing audio buffer:', error_1);
                        session.isProcessing = false;
                        return [3 /*break*/, 6];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Transcribe audio using ElevenLabs
     * Note: ElevenLabs primarily focuses on TTS. For STT, we might need to use their realtime API
     * or integrate with a compatible STT service. For now, this is a placeholder.
     */
    ElevenLabsStreamHandler.prototype.transcribeWithElevenLabs = function (session, audioBuffer) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                try {
                    // ElevenLabs doesn't have a direct STT API endpoint
                    // For now, we'll use a placeholder that returns a simple transcript
                    // In a real implementation, you would use ElevenLabs' WebSocket API for real-time STT
                    console.log('STT processing needed - ElevenLabs realtime API required');
                    return [2 /*return*/, 'Hello, this is a test transcript from ElevenLabs STT'];
                }
                catch (error) {
                    console.error('Error transcribing with ElevenLabs:', error);
                    return [2 /*return*/, ''];
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Process STT transcript and generate response
     */
    ElevenLabsStreamHandler.prototype.processTranscript = function (session, transcript) {
        return __awaiter(this, void 0, void 0, function () {
            var llmResponse, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!transcript.trim()) {
                            return [2 /*return*/];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 6, , 7]);
                        console.log("Transcribed text: ".concat(transcript));
                        // Add user utterance to context
                        session.context.push({
                            role: 'user',
                            parts: [{ text: transcript }]
                        });
                        // Save user transcript to database
                        return [4 /*yield*/, this.saveCallSegment(session.callId, transcript, null)];
                    case 2:
                        // Save user transcript to database
                        _a.sent();
                        return [4 /*yield*/, this.callLLM(session)];
                    case 3:
                        llmResponse = _a.sent();
                        // Add agent response to context
                        session.context.push({
                            role: 'agent',
                            parts: [{ text: llmResponse }]
                        });
                        // Save agent response to database
                        return [4 /*yield*/, this.saveCallSegment(session.callId, null, llmResponse)];
                    case 4:
                        // Save agent response to database
                        _a.sent();
                        // Generate TTS via ElevenLabs
                        return [4 /*yield*/, this.generateTTS(session, llmResponse)];
                    case 5:
                        // Generate TTS via ElevenLabs
                        _a.sent();
                        return [3 /*break*/, 7];
                    case 6:
                        error_2 = _a.sent();
                        console.error('Error processing transcript:', error_2);
                        return [3 /*break*/, 7];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Call LLM with agent prompt and conversation context
     */
    ElevenLabsStreamHandler.prototype.callLLM = function (session) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.llmService.generateContent({
                                model: session.agentModel,
                                contents: session.context,
                                config: {
                                    systemInstruction: session.agentPrompt
                                }
                            })];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.text];
                    case 2:
                        error_3 = _a.sent();
                        console.error('Error calling LLM:', error_3);
                        return [2 /*return*/, 'Sorry, I encountered an error processing your request.'];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Generate TTS using ElevenLabs
     */
    ElevenLabsStreamHandler.prototype.generateTTS = function (session, text) {
        return __awaiter(this, void 0, void 0, function () {
            var audio, chunks, _a, audio_1, audio_1_1, chunk, e_1_1, audioBuffer, error_4;
            var _b, e_1, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        _e.trys.push([0, 18, , 19]);
                        if (!session.elevenLabsClient) {
                            console.error('ElevenLabs client not initialized');
                             // Send error to client
                            if (session.ws && session.ws.readyState === session.ws.OPEN) {
                                session.ws.send(JSON.stringify({
                                    event: 'error',
                                    message: 'ElevenLabs service not properly configured'
                                }));
                            }
                            return [2 /*return*/];
                        }
                        _e.label = 1;
                    case 1:
                        if (!session.isProcessing) return [3 /*break*/, 3];
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 100); })];
                    case 2:
                        _e.sent();
                        return [3 /*break*/, 1];
                    case 3: 
                        console.log('Generating TTS for text:', text.substring(0, 100) + (text.length > 100 ? '...' : ''));
                        return [4 /*yield*/, session.elevenLabsClient.textToSpeech.convert(session.voiceId, {
                            text: text,
                            modelId: 'eleven_multilingual_v2',
                            voiceSettings: {
                                stability: 0.5,
                                similarityBoost: 0.75
                            }
                        })];
                    case 4:
                        audio = _e.sent();
                        chunks = [];
                        _e.label = 5;
                    case 5:
                        _e.trys.push([5, 10, 11, 16]);
                        _a = true, audio_1 = __asyncValues(audio);
                        _e.label = 6;
                    case 6: return [4 /*yield*/, audio_1.next()];
                    case 7:
                        if (!(audio_1_1 = _e.sent(), _b = audio_1_1.done, !_b)) return [3 /*break*/, 9];
                        _d = audio_1_1.value;
                        _a = false;
                        chunk = _d;
                        chunks.push(Buffer.from(chunk));
                        _e.label = 8;
                    case 8:
                        _a = true;
                        return [3 /*break*/, 6];
                    case 9: return [3 /*break*/, 16];
                    case 10:
                        e_1_1 = _e.sent();
                        e_1 = { error: e_1_1 };
                        return [3 /*break*/, 16];
                    case 11:
                        _e.trys.push([11, , 14, 15]);
                        if (!(!_a && !_b && (_c = audio_1.return))) return [3 /*break*/, 13];
                        return [4 /*yield*/, _c.call(audio_1)];
                    case 12:
                        _e.sent();
                        _e.label = 13;
                    case 13: return [3 /*break*/, 15];
                    case 14:
                        if (e_1) throw e_1.error;
                        return [7 /*endfinally*/];
                    case 15: return [7 /*endfinally*/];
                    case 16:
                        audioBuffer = Buffer.concat(chunks);
                        // Convert PCM to µ-law and send to Twilio
                        return [4 /*yield*/, this.sendAudioToTwilio(session, audioBuffer)];
                    case 17:
                        // Convert PCM to µ-law and send to Twilio
                        _e.sent();
                        return [3 /*break*/, 19];
                    case 18:
                        error_4 = _e.sent();
                        console.error('Error generating TTS:', error_4);
                          // Send error to client
                        if (session.ws && session.ws.readyState === session.ws.OPEN) {
                            session.ws.send(JSON.stringify({
                                event: 'error',
                                message: 'Failed to generate audio: ' + (error_4.message || 'Unknown error')
                            }));
                        }
                        return [3 /*break*/, 19];
                    case 19: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Send audio to Twilio via WebSocket
     */
    ElevenLabsStreamHandler.prototype.sendAudioToTwilio = function (session, audioBuffer) {
        return __awaiter(this, void 0, void 0, function () {
            var mulawBuffer, base64Audio;
            return __generator(this, function (_a) {
                try {
                    mulawBuffer = ulaw.encode(audioBuffer);
                    base64Audio = mulawBuffer.toString('base64');
                    // Send audio chunk to Twilio
                    session.ws.send(JSON.stringify({
                        event: 'media',
                        media: {
                            payload: base64Audio
                        }
                    }));
                }
                catch (error) {
                    console.error('Error sending audio to Twilio:', error);
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Save call segment to database
     */
    ElevenLabsStreamHandler.prototype.saveCallSegment = function (callId, userTranscript, agentResponse) {
        return __awaiter(this, void 0, void 0, function () {
            var segmentId, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        segmentId = (0, uuid_1.v4)();
                        return [4 /*yield*/, database_js_1.default.execute('INSERT INTO call_segments (id, call_id, user_transcript, agent_response, timestamp) VALUES (?, ?, ?, ?, NOW())', [segmentId, callId, userTranscript, agentResponse])];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        error_5 = _a.sent();
                        console.error('Error saving call segment:', error_5);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Process audio with ElevenLabs STT
     * This is a placeholder implementation - in a real scenario, you would use ElevenLabs' WebSocket API
     */
    ElevenLabsStreamHandler.prototype.processAudioWithElevenLabsSTT = function (audioBuffer) {
        // This is a mock implementation - in a real implementation, you would:
        // 1. Connect to ElevenLabs WebSocket API for real-time STT
        // 2. Send audio chunks to the API
        // 3. Receive and return transcripts
        // For now, we'll return a simple mock transcript
        console.log('Processing audio with ElevenLabs STT (mock implementation)');
        return 'Hello, this is a test transcript from ElevenLabs STT';
    };
    /**
     * Fetch agent configuration from database
     */
    ElevenLabsStreamHandler.prototype.fetchAgentConfig = function (agentId) {
        return __awaiter(this, void 0, void 0, function () {
            var rows, agent, error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, database_js_1.default.execute('SELECT id, name, identity, voice_id as voiceId, model, settings FROM agents WHERE id = ?', [agentId])];
                    case 1:
                        rows = (_a.sent())[0];
                        if (rows && rows.length > 0) {
                            agent = rows[0];
                            // Parse settings JSON if it's a string
                            if (typeof agent.settings === 'string') {
                                agent.settings = JSON.parse(agent.settings);
                            }
                            return [2 /*return*/, agent];
                        }
                        return [2 /*return*/, null];
                    case 2:
                        error_6 = _a.sent();
                        console.error('Error fetching agent configuration:', error_6);
                        return [2 /*return*/, null];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Fetch call information from database
     */
    ElevenLabsStreamHandler.prototype.fetchCallInfo = function (callId) {
        return __awaiter(this, void 0, void 0, function () {
            var rows, error_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, database_js_1.default.execute('SELECT id, user_id as userId, phone_number, call_sid FROM calls WHERE id = ?', [callId])];
                    case 1:
                        rows = (_a.sent())[0];
                        if (rows && rows.length > 0) {
                            return [2 /*return*/, rows[0]];
                        }
                        return [2 /*return*/, null];
                    case 2:
                        error_7 = _a.sent();
                        console.error('Error fetching call information:', error_7);
                        return [2 /*return*/, null];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return ElevenLabsStreamHandler;
}());
exports.ElevenLabsStreamHandler = ElevenLabsStreamHandler;
