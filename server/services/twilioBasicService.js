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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwilioBasicService = void 0;
var twilio_1 = require("twilio");
var database_js_1 = require("../config/database.js");
var uuid_1 = require("uuid");
var TwilioBasicService = /** @class */ (function () {
    function TwilioBasicService() {
    }
    /**
     * Get user's Twilio configuration from database
     */
    TwilioBasicService.prototype.getUserConfig = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var rows, config;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, database_js_1.default.execute('SELECT account_sid, auth_token, api_key_sid, api_key_secret, app_url FROM user_twilio_configs WHERE user_id = ?', [userId])];
                    case 1:
                        rows = (_a.sent())[0];
                        if (rows.length === 0) {
                            throw new Error('Twilio configuration not found. Please configure your Twilio credentials first.');
                        }
                        config = rows[0];
                        return [2 /*return*/, {
                                accountSid: config.account_sid,
                                authToken: config.auth_token,
                                apiKeySid: config.api_key_sid || undefined,
                                apiKeySecret: config.api_key_secret || undefined,
                                appUrl: config.app_url
                            }];
                }
            });
        });
    };
    /**
     * Get Twilio client for a specific user
     */
    TwilioBasicService.prototype.getClientForUser = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var config;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getUserConfig(userId)];
                    case 1:
                        config = _a.sent();
                        if (config.apiKeySid && config.apiKeySecret) {
                            return [2 /*return*/, (0, twilio_1.default)(config.apiKeySid, config.apiKeySecret, {
                                    accountSid: config.accountSid
                                })];
                        }
                        else {
                            return [2 /*return*/, (0, twilio_1.default)(config.accountSid, config.authToken)];
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Save or update user's Twilio configuration
     */
    TwilioBasicService.prototype.saveUserConfig = function (userId, accountSid, authToken, appUrl, apiKeySid, apiKeySecret) {
        return __awaiter(this, void 0, void 0, function () {
            var testClient, existing, id, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 7, , 8]);
                        testClient = apiKeySid && apiKeySecret
                            ? (0, twilio_1.default)(apiKeySid, apiKeySecret, { accountSid: accountSid })
                            : (0, twilio_1.default)(accountSid, authToken);
                        // Test the credentials by fetching account info
                        return [4 /*yield*/, testClient.api.accounts(accountSid).fetch()];
                    case 1:
                        // Test the credentials by fetching account info
                        _a.sent();
                        return [4 /*yield*/, database_js_1.default.execute('SELECT id FROM user_twilio_configs WHERE user_id = ?', [userId])];
                    case 2:
                        existing = (_a.sent())[0];
                        id = existing.length > 0 ? existing[0].id : (0, uuid_1.v4)();
                        if (!(existing.length > 0)) return [3 /*break*/, 4];
                        // Update existing config
                        return [4 /*yield*/, database_js_1.default.execute("UPDATE user_twilio_configs \n           SET account_sid = ?, auth_token = ?, api_key_sid = ?, api_key_secret = ?, app_url = ?, updated_at = NOW()\n           WHERE id = ?", [accountSid, authToken, apiKeySid || null, apiKeySecret || null, appUrl, id])];
                    case 3:
                        // Update existing config
                        _a.sent();
                        return [3 /*break*/, 6];
                    case 4: 
                    // Insert new config
                    return [4 /*yield*/, database_js_1.default.execute("INSERT INTO user_twilio_configs \n           (id, user_id, account_sid, auth_token, api_key_sid, api_key_secret, app_url)\n           VALUES (?, ?, ?, ?, ?, ?, ?)", [id, userId, accountSid, authToken, apiKeySid || null, apiKeySecret || null, appUrl])];
                    case 5:
                        // Insert new config
                        _a.sent();
                        _a.label = 6;
                    case 6: return [3 /*break*/, 8];
                    case 7:
                        error_1 = _a.sent();
                        console.error('Error saving Twilio config:', error_1);
                        throw new Error("Failed to save Twilio configuration: ".concat(error_1.message));
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get user's Twilio configuration
     */
    TwilioBasicService.prototype.getUserConfigData = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var rows;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, database_js_1.default.execute('SELECT id, account_sid, app_url, created_at, updated_at FROM user_twilio_configs WHERE user_id = ?', [userId])];
                    case 1:
                        rows = (_a.sent())[0];
                        if (rows.length === 0) {
                            return [2 /*return*/, null];
                        }
                        return [2 /*return*/, {
                                id: rows[0].id,
                                accountSid: rows[0].account_sid,
                                appUrl: rows[0].app_url,
                                createdAt: rows[0].created_at,
                                updatedAt: rows[0].updated_at
                            }];
                }
            });
        });
    };
    /**
     * Validate and connect/import a Twilio number for a user
     */
    TwilioBasicService.prototype.connectNumber = function (userId, number) {
        return __awaiter(this, void 0, void 0, function () {
            var config, client, incomingNumbers, twilioNumber, region, capabilities, appUrl, voiceWebhookUrl, statusWebhookUrl, existing, id, rows, error_2;
            var _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _d.trys.push([0, 11, , 12]);
                        return [4 /*yield*/, this.getUserConfig(userId)];
                    case 1:
                        config = _d.sent();
                        return [4 /*yield*/, this.getClientForUser(userId)];
                    case 2:
                        client = _d.sent();
                        return [4 /*yield*/, client.incomingPhoneNumbers.list({
                                phoneNumber: number
                            })];
                    case 3:
                        incomingNumbers = _d.sent();
                        if (incomingNumbers.length === 0) {
                            throw new Error("Phone number ".concat(number, " not found in your Twilio account"));
                        }
                        twilioNumber = incomingNumbers[0];
                        region = this.extractRegion(number);
                        capabilities = {
                            voice: ((_a = twilioNumber.capabilities) === null || _a === void 0 ? void 0 : _a.voice) || false,
                            sms: ((_b = twilioNumber.capabilities) === null || _b === void 0 ? void 0 : _b.sms) || false,
                            mms: ((_c = twilioNumber.capabilities) === null || _c === void 0 ? void 0 : _c.mms) || false
                        };
                        appUrl = config.appUrl.endsWith('/') ? config.appUrl.slice(0, -1) : config.appUrl;
                        voiceWebhookUrl = "".concat(appUrl, "/api/twilio/voice?userId=").concat(userId);
                        statusWebhookUrl = "".concat(appUrl, "/api/twilio/callback?userId=").concat(userId);
                        return [4 /*yield*/, database_js_1.default.execute('SELECT id FROM phone_numbers WHERE user_id = ? AND number = ?', [userId, number])];
                    case 4:
                        existing = (_d.sent())[0];
                        id = existing.length > 0 ? existing[0].id : (0, uuid_1.v4)();
                        if (!(existing.length > 0)) return [3 /*break*/, 6];
                        // Update existing number
                        return [4 /*yield*/, database_js_1.default.execute("UPDATE phone_numbers \n           SET twilio_number_sid = ?, region = ?, capabilities = ?, \n               voice_webhook_url = ?, status_webhook_url = ?, updated_at = NOW()\n           WHERE id = ?", [
                                twilioNumber.sid,
                                region,
                                JSON.stringify(capabilities),
                                voiceWebhookUrl,
                                statusWebhookUrl,
                                id
                            ])];
                    case 5:
                        // Update existing number
                        _d.sent();
                        return [3 /*break*/, 8];
                    case 6: 
                    // Insert new number
                    return [4 /*yield*/, database_js_1.default.execute("INSERT INTO phone_numbers \n           (id, user_id, number, twilio_number_sid, provider, region, capabilities, voice_webhook_url, status_webhook_url)\n           VALUES (?, ?, ?, ?, 'twilio', ?, ?, ?, ?)", [
                            id,
                            userId,
                            number,
                            twilioNumber.sid,
                            region,
                            JSON.stringify(capabilities),
                            voiceWebhookUrl,
                            statusWebhookUrl
                        ])];
                    case 7:
                        // Insert new number
                        _d.sent();
                        _d.label = 8;
                    case 8: 
                    // Update webhook URLs in Twilio
                    return [4 /*yield*/, client.incomingPhoneNumbers(twilioNumber.sid).update({
                            voiceUrl: voiceWebhookUrl,
                            voiceMethod: "POST",
                            statusCallback: statusWebhookUrl,
                            statusCallbackMethod: "POST"
                        })];
                    case 9:
                        // Update webhook URLs in Twilio
                        _d.sent();
                        return [4 /*yield*/, database_js_1.default.execute('SELECT * FROM phone_numbers WHERE id = ?', [id])];
                    case 10:
                        rows = (_d.sent())[0];
                        return [2 /*return*/, this.mapPhoneNumberFromDb(rows[0])];
                    case 11:
                        error_2 = _d.sent();
                        console.error('Error connecting Twilio number:', error_2);
                        throw new Error("Failed to connect number: ".concat(error_2.message));
                    case 12: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get all phone numbers for a user
     */
    TwilioBasicService.prototype.getUserPhoneNumbers = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var rows;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, database_js_1.default.execute('SELECT * FROM phone_numbers WHERE user_id = ? ORDER BY created_at DESC', [userId])];
                    case 1:
                        rows = (_a.sent())[0];
                        return [2 /*return*/, rows.map(function (row) { return _this.mapPhoneNumberFromDb(row); })];
                }
            });
        });
    };
    /**
     * Make an outbound call for a user
     */
    TwilioBasicService.prototype.makeCall = function (userId, from, to) {
        return __awaiter(this, void 0, void 0, function () {
            var config, client, phoneRows, phoneNumber, appUrl, defaultVoiceUrl, defaultStatusCallbackUrl, call, callId, callRows, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 7, , 8]);
                        return [4 /*yield*/, this.getUserConfig(userId)];
                    case 1:
                        config = _a.sent();
                        return [4 /*yield*/, this.getClientForUser(userId)];
                    case 2:
                        client = _a.sent();
                        return [4 /*yield*/, database_js_1.default.execute('SELECT * FROM phone_numbers WHERE user_id = ? AND number = ?', [userId, from])];
                    case 3:
                        phoneRows = (_a.sent())[0];
                        if (phoneRows.length === 0) {
                            throw new Error("Phone number ".concat(from, " is not connected. Please connect it first."));
                        }
                        phoneNumber = phoneRows[0];
                        appUrl = config.appUrl.endsWith('/') ? config.appUrl.slice(0, -1) : config.appUrl;
                        defaultVoiceUrl = "".concat(appUrl, "/api/twilio/voice?userId=").concat(userId);
                        defaultStatusCallbackUrl = "".concat(appUrl, "/api/twilio/callback?userId=").concat(userId);
                        return [4 /*yield*/, client.calls.create({
                                from: from,
                                to: to,
                                url: phoneNumber.voice_webhook_url || defaultVoiceUrl,
                                statusCallback: phoneNumber.status_webhook_url || defaultStatusCallbackUrl,
                                statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed', 'busy', 'failed', 'no-answer'],
                                statusCallbackMethod: 'POST'
                            })];
                    case 4:
                        call = _a.sent();
                        callId = (0, uuid_1.v4)();
                        return [4 /*yield*/, database_js_1.default.execute("INSERT INTO calls (id, user_id, call_sid, from_number, to_number, direction, status, timestamp)\n         VALUES (?, ?, ?, ?, ?, 'outbound', 'initiated', NOW())", [callId, userId, call.sid, from, to])];
                    case 5:
                        _a.sent();
                        return [4 /*yield*/, database_js_1.default.execute('SELECT * FROM calls WHERE id = ?', [callId])];
                    case 6:
                        callRows = (_a.sent())[0];
                        return [2 /*return*/, this.mapCallFromDb(callRows[0])];
                    case 7:
                        error_3 = _a.sent();
                        console.error('Error making call:', error_3);
                        throw new Error("Failed to make call: ".concat(error_3.message));
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Save inbound call log
     */
    TwilioBasicService.prototype.saveInboundCall = function (userId, callSid, from, to) {
        return __awaiter(this, void 0, void 0, function () {
            var callId, rows, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        callId = (0, uuid_1.v4)();
                        return [4 /*yield*/, database_js_1.default.execute("INSERT INTO calls (id, user_id, call_sid, from_number, to_number, direction, status, timestamp)\n         VALUES (?, ?, ?, ?, ?, 'inbound', 'ringing', NOW())", [callId, userId, callSid, from, to])];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, database_js_1.default.execute('SELECT * FROM calls WHERE id = ?', [callId])];
                    case 2:
                        rows = (_a.sent())[0];
                        return [2 /*return*/, this.mapCallFromDb(rows[0])];
                    case 3:
                        error_4 = _a.sent();
                        console.error('Error saving inbound call:', error_4);
                        throw new Error("Failed to save inbound call: ".concat(error_4.message));
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Update call status
     */
    TwilioBasicService.prototype.updateCallStatus = function (userId, callSid, status, duration, recordingUrl) {
        return __awaiter(this, void 0, void 0, function () {
            var updateData, fields, values, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        updateData = { status: status };
                        if (duration !== undefined) {
                            updateData.duration = duration;
                        }
                        if (recordingUrl) {
                            updateData.recording_url = recordingUrl;
                        }
                        fields = Object.keys(updateData).map(function (key) { return "".concat(key, " = ?"); }).join(', ');
                        values = Object.values(updateData);
                        values.push(callSid);
                        values.push(userId);
                        return [4 /*yield*/, database_js_1.default.execute("UPDATE calls SET ".concat(fields, " WHERE call_sid = ? AND user_id = ?"), values)];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        error_5 = _a.sent();
                        console.error('Error updating call status:', error_5);
                        throw new Error("Failed to update call status: ".concat(error_5.message));
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get user's call history
     */
    TwilioBasicService.prototype.getUserCalls = function (userId_1) {
        return __awaiter(this, arguments, void 0, function (userId, limit) {
            var rows;
            var _this = this;
            if (limit === void 0) { limit = 50; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, database_js_1.default.execute('SELECT * FROM calls WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?', [userId, limit])];
                    case 1:
                        rows = (_a.sent())[0];
                        return [2 /*return*/, rows.map(function (row) { return _this.mapCallFromDb(row); })];
                }
            });
        });
    };
    /**
     * Validate Twilio webhook signature
     */
    TwilioBasicService.prototype.validateWebhookSignature = function (userId, url, params, signature) {
        return __awaiter(this, void 0, void 0, function () {
            var config, error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.getUserConfig(userId)];
                    case 1:
                        config = _a.sent();
                        return [2 /*return*/, twilio_1.default.validateRequest(config.authToken, signature, url, params)];
                    case 2:
                        error_6 = _a.sent();
                        console.error('Error validating webhook signature:', error_6);
                        return [2 /*return*/, false];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Extract region from phone number
     */
    TwilioBasicService.prototype.extractRegion = function (number) {
        if (number.startsWith('+1')) {
            return 'us';
        }
        else if (number.startsWith('+44')) {
            return 'uk';
        }
        else if (number.startsWith('+91')) {
            return 'in';
        }
        else if (number.startsWith('+86')) {
            return 'cn';
        }
        return 'unknown';
    };
    /**
     * Map database row to PhoneNumber object
     */
    TwilioBasicService.prototype.mapPhoneNumberFromDb = function (row) {
        return {
            id: row.id,
            userId: row.user_id,
            number: row.number,
            twilioNumberSid: row.twilio_number_sid,
            provider: row.provider,
            region: row.region,
            capabilities: typeof row.capabilities === 'string'
                ? JSON.parse(row.capabilities)
                : row.capabilities,
            voiceWebhookUrl: row.voice_webhook_url,
            statusWebhookUrl: row.status_webhook_url,
            createdAt: row.created_at
        };
    };
    /**
     * Map database row to Call object
     */
    TwilioBasicService.prototype.mapCallFromDb = function (row) {
        return {
            id: row.id,
            userId: row.user_id,
            callSid: row.call_sid,
            fromNumber: row.from_number,
            toNumber: row.to_number,
            direction: row.direction,
            status: row.status,
            timestamp: row.timestamp,
            duration: row.duration || 0,
            recordingUrl: row.recording_url || undefined
        };
    };
    return TwilioBasicService;
}());
exports.TwilioBasicService = TwilioBasicService;
