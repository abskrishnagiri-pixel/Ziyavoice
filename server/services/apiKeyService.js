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
exports.ApiKeyService = void 0;
var database_js_1 = require("../config/database.js");
var uuid_1 = require("uuid");
var ApiKeyService = /** @class */ (function () {
    function ApiKeyService() {
    }
    // Get a user's API key for a specific service
    ApiKeyService.getUserApiKey = function (userId, serviceName) {
        return __awaiter(this, void 0, void 0, function () {
            var rows, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, database_js_1.default.execute('SELECT api_key FROM user_api_keys WHERE user_id = ? AND service_name = ?', [userId, serviceName])];
                    case 1:
                        rows = (_a.sent())[0];
                        if (rows.length > 0) {
                            return [2 /*return*/, rows[0].api_key];
                        }
                        return [2 /*return*/, null];
                    case 2:
                        error_1 = _a.sent();
                        console.error('Error fetching user API key:', error_1);
                        throw new Error('Failed to fetch user API key');
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // Save or update a user's API key for a specific service
    ApiKeyService.saveUserApiKey = function (userId, serviceName, apiKey) {
        return __awaiter(this, void 0, void 0, function () {
            var plaintextApiKey, existingRows, id, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 6, , 7]);
                        plaintextApiKey = apiKey;
                        return [4 /*yield*/, database_js_1.default.execute('SELECT id FROM user_api_keys WHERE user_id = ? AND service_name = ?', [userId, serviceName])];
                    case 1:
                        existingRows = (_a.sent())[0];
                        if (!(existingRows.length > 0)) return [3 /*break*/, 3];
                        // Update existing API key
                        return [4 /*yield*/, database_js_1.default.execute('UPDATE user_api_keys SET api_key = ?, updated_at = NOW() WHERE user_id = ? AND service_name = ?', [plaintextApiKey, userId, serviceName])];
                    case 2:
                        // Update existing API key
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 3:
                        id = (0, uuid_1.v4)();
                        return [4 /*yield*/, database_js_1.default.execute('INSERT INTO user_api_keys (id, user_id, service_name, api_key, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())', [id, userId, serviceName, plaintextApiKey])];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5: return [2 /*return*/, true];
                    case 6:
                        error_2 = _a.sent();
                        console.error('Error saving user API key:', error_2);
                        throw new Error('Failed to save user API key');
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    // Delete a user's API key for a specific service
    ApiKeyService.deleteUserApiKey = function (userId, serviceName) {
        return __awaiter(this, void 0, void 0, function () {
            var existingRows, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, database_js_1.default.execute('SELECT id FROM user_api_keys WHERE user_id = ? AND service_name = ?', [userId, serviceName])];
                    case 1:
                        existingRows = (_a.sent())[0];
                        if (existingRows.length === 0) {
                            throw new Error('API key not found');
                        }
                        // Delete the API key
                        return [4 /*yield*/, database_js_1.default.execute('DELETE FROM user_api_keys WHERE user_id = ? AND service_name = ?', [userId, serviceName])];
                    case 2:
                        // Delete the API key
                        _a.sent();
                        return [2 /*return*/, true];
                    case 3:
                        error_3 = _a.sent();
                        console.error('Error deleting user API key:', error_3);
                        throw new Error('Failed to delete user API key');
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // Get a user's plaintext API key for a specific service (for external API calls)
    // NOTE: This should only be used internally and never exposed to the frontend
    ApiKeyService.getUserPlaintextApiKey = function (userId, serviceName) {
        return __awaiter(this, void 0, void 0, function () {
            var error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.getUserApiKey(userId, serviceName)];
                    case 1: 
                    // Return the plaintext API key from the database
                    return [2 /*return*/, _a.sent()];
                    case 2:
                        error_4 = _a.sent();
                        console.error('Error fetching user plaintext API key:', error_4);
                        throw new Error('Failed to fetch user plaintext API key');
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // Validate an API key
    ApiKeyService.validateApiKey = function (userId, serviceName, apiKey) {
        return __awaiter(this, void 0, void 0, function () {
            var storedApiKey, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.getUserApiKey(userId, serviceName)];
                    case 1:
                        storedApiKey = _a.sent();
                        if (!storedApiKey) {
                            return [2 /*return*/, false];
                        }
                        // For plaintext keys, we can do a direct comparison
                        return [2 /*return*/, storedApiKey === apiKey];
                    case 2:
                        error_5 = _a.sent();
                        console.error('Error validating API key:', error_5);
                        throw new Error('Failed to validate API key');
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // Get all API keys for a user (metadata only)
    ApiKeyService.getUserApiKeysMetadata = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var rows, error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, database_js_1.default.execute('SELECT id, user_id, service_name, created_at, updated_at FROM user_api_keys WHERE user_id = ?', [userId])];
                    case 1:
                        rows = (_a.sent())[0];
                        return [2 /*return*/, rows];
                    case 2:
                        error_6 = _a.sent();
                        console.error('Error fetching user API keys metadata:', error_6);
                        throw new Error('Failed to fetch user API keys metadata');
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return ApiKeyService;
}());
exports.ApiKeyService = ApiKeyService;
