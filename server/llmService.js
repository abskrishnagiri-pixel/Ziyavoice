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
    var _ = { label: 0, sent: function () { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function () { return this; }), g;
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMService = void 0;
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { OpenAI } = require("openai");

// Unified LLM service that supports both Gemini and OpenAI models
var LLMService = /** @class */ (function () {
    function LLMService(geminiApiKey, openaiApiKey) {
        this.genAI = null;
        this.openai = null;

        if (geminiApiKey) {
            this.genAI = new GoogleGenerativeAI(geminiApiKey);
        }

        if (openaiApiKey) {
            this.openai = new OpenAI({
                apiKey: openaiApiKey
            });
        }
    }

    LLMService.prototype.isGeminiModel = function (modelId) {
        return modelId.startsWith('gemini-') || modelId.startsWith('models/gemini-');
    };

    LLMService.prototype.isOpenAIModel = function (modelId) {
        return modelId.startsWith('gpt-') || modelId.startsWith('o1-');
    };

    LLMService.prototype.generateContent = function (request) {
        return __awaiter(this, void 0, void 0, function () {
            var modelName, provider;
            var _a;
            return __generator(this, function (_b) {
                modelName = request.model || 'models/gemini-2.0-flash';

                // Determine provider based on model name
                if (this.isOpenAIModel(modelName)) {
                    provider = 'openai';
                } else {
                    provider = 'gemini';
                }

                console.log(`🤖 Using LLM provider: ${provider}, model: ${modelName}`);

                if (provider === 'openai') {
                    return [2 /*return*/, this.generateOpenAIContent(request)];
                } else {
                    return [2 /*return*/, this.generateGeminiContent(request)];
                }
            });
        });
    };

    LLMService.prototype.generateGeminiContent = function (request) {
        return __awaiter(this, void 0, void 0, function () {
            var modelName, model, result, responseText, error_1;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        // Handle the case where genAI might be null
                        if (!this.genAI) {
                            throw new Error('Gemini client not initialized. Please provide a Gemini API key.');
                        }
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);

                        modelName = request.model || 'models/gemini-2.0-flash';

                        // Use getGenerativeModel
                        model = this.genAI.getGenerativeModel({
                            model: modelName,
                            systemInstruction: (_a = request.config) === null || _a === void 0 ? void 0 : _a.systemInstruction
                        });

                        return [4 /*yield*/, model.generateContent({ contents: request.contents })];
                    case 2:
                        result = _b.sent();
                        responseText = '';

                        if (result && result.response) {
                            responseText = result.response.text();
                        }

                        return [2 /*return*/, { text: responseText }];
                    case 3:
                        error_1 = _b.sent();
                        console.error('Error calling Gemini API:', error_1);
                        throw error_1;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };

    LLMService.prototype.generateOpenAIContent = function (request) {
        return __awaiter(this, void 0, void 0, function () {
            var modelName, messages, systemInstruction, completion, responseText, error_2;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        // Handle the case where openai might be null
                        if (!this.openai) {
                            throw new Error('OpenAI client not initialized. Please provide an OpenAI API key.');
                        }
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);

                        modelName = request.model || 'gpt-4o-mini';

                        // Convert Gemini-style contents to OpenAI messages format
                        messages = [];

                        // Add system instruction if present
                        systemInstruction = (_a = request.config) === null || _a === void 0 ? void 0 : _a.systemInstruction;
                        if (systemInstruction) {
                            messages.push({
                                role: 'system',
                                content: systemInstruction
                            });
                        }

                        // Convert contents array to OpenAI messages
                        if (request.contents && Array.isArray(request.contents)) {
                            request.contents.forEach(function (content) {
                                var role = content.role === 'model' ? 'assistant' : content.role;
                                var text = '';

                                if (content.parts && Array.isArray(content.parts)) {
                                    text = content.parts.map(function (part) { return part.text || ''; }).join('');
                                }

                                if (text.trim()) {
                                    messages.push({
                                        role: role,
                                        content: text
                                    });
                                }
                            });
                        }

                        console.log(`📤 Sending to OpenAI: ${messages.length} messages`);

                        return [4 /*yield*/, this.openai.chat.completions.create({
                            model: modelName,
                            messages: messages,
                            temperature: 0.7,
                            max_tokens: 1000
                        })];
                    case 2:
                        completion = _b.sent();
                        responseText = '';

                        if (completion && completion.choices && completion.choices.length > 0) {
                            responseText = completion.choices[0].message.content || '';
                        }

                        console.log(`📥 OpenAI response: ${responseText.substring(0, 100)}...`);

                        return [2 /*return*/, { text: responseText }];
                    case 3:
                        error_2 = _b.sent();
                        console.error('Error calling OpenAI API:', error_2);
                        throw error_2;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };

    // Stub for stream - could be implemented if needed
    LLMService.prototype.generateContentStream = function (request) {
        throw new Error("Stream not implemented in this version");
    };

    return LLMService;
}());
exports.LLMService = LLMService;
exports.default = LLMService;
