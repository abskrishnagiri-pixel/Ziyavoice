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
exports.PhoneNumberService = void 0;

var database_js_1 = require("../config/database.js");
var uuid_1 = require("uuid");

var PhoneNumberService = /** @class */ (function () {
    function PhoneNumberService() {}

    // ==========================
    // GET ALL PHONE NUMBERS
    // ==========================
    PhoneNumberService.getPhoneNumbers = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var queryResult, rows, mapped, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, database_js_1.default.execute(
                            "SELECT * FROM phone_numbers WHERE user_id = ? ORDER BY created_at DESC",
                            [userId]
                        )];
                    case 1:
                        queryResult = _a.sent();
                        rows = queryResult && queryResult.length ? queryResult[0] : queryResult;
                        // Defensive: ensure rows is an array
                        if (!rows || !Array.isArray(rows)) rows = [];

                        // Normalize all DB rows to a consistent structure
                        mapped = rows.map(function (row) {
                            // Safe capabilities parsing
                            var caps = { voice: true };
                            try {
                                if (row && row.capabilities) {
                                    if (typeof row.capabilities === 'string') {
                                        caps = JSON.parse(row.capabilities);
                                    }
                                    else if (typeof row.capabilities === 'object') {
                                        caps = row.capabilities;
                                    }
                                }
                            }
                            catch (e) {
                                // If parsing fails, keep default capabilities and log small warning
                                try {
                                    console.warn("Warning: failed to parse capabilities for phone id=" + (row && row.id) + " - using default", e && e.message);
                                }
                                catch (_) {}
                                caps = { voice: true };
                            }

                            // Normalize the main number field(s) consistently for frontend
                            var mainNumber = null;
                            if (row) {
                                mainNumber = row.number || row.phone_number || row.twilio_number || row.twilioSid || null;
                            }

                            return {
                                id: row ? row.id : null,
                                userId: row ? row.user_id : null,
                                // consistent names used by frontend
                                number: mainNumber,
                                phoneNumber: mainNumber,
                                phone_number: mainNumber,

                                countryCode: row ? row.country_code : null,
                                source: row ? row.source : null,
                                agentName: row ? row.agent_name : null,
                                agentId: row ? row.agent_id : null,
                                region: row ? row.region : null,
                                nextCycle: row ? row.next_cycle : null,
                                provider: row ? row.provider : null,
                                twilioSid: row ? row.twilio_sid : null,
                                capabilities: caps,

                                created_at: (row && (row.created_at || row.purchased_at)) || null,
                                purchased_at: (row && row.purchased_at) || null
                            };
                        });

                        return [2 /*return*/, mapped];

                    case 2:
                        error_1 = _a.sent();
                        // Log full error so we can debug actual DB error in logs
                        try {
                            console.error("FULL DB ERROR fetching phone numbers:", JSON.stringify(error_1, Object.getOwnPropertyNames(error_1)));
                        }
                        catch (_) {
                            console.error("Error fetching phone numbers (non-serializable):", error_1);
                        }
                        throw new Error("Failed to fetch phone numbers");
                    case 3: return [2 /*return*/];
                }
            });
        });
    };

    // ==========================
    // GET ONE PHONE NUMBER
    // ==========================
    PhoneNumberService.getPhoneNumberById = function (userId, id) {
        return __awaiter(this, void 0, void 0, function () {
            var queryResult, rows, row, caps, mainNumber, normalized, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, database_js_1.default.execute(
                            "SELECT * FROM phone_numbers WHERE user_id = ? AND id = ?",
                            [userId, id]
                        )];
                    case 1:
                        queryResult = _a.sent();
                        rows = queryResult && queryResult.length ? queryResult[0] : queryResult;
                        if (!rows || rows.length === 0) return [2 /*return*/, null];
                        row = rows[0];

                        // Safe capabilities parse
                        caps = { voice: true };
                        try {
                            if (row && row.capabilities) {
                                if (typeof row.capabilities === 'string') {
                                    caps = JSON.parse(row.capabilities);
                                }
                                else if (typeof row.capabilities === 'object') {
                                    caps = row.capabilities;
                                }
                            }
                        }
                        catch (e) {
                            try {
                                console.warn("Warning: failed to parse capabilities for phone id=" + (row && row.id) + " - using default", e && e.message);
                            }
                            catch (_) {}
                            caps = { voice: true };
                        }

                        mainNumber = row.number || row.phone_number || row.twilio_number || row.twilioSid || null;

                        normalized = {
                            id: row.id,
                            userId: row.user_id,
                            number: mainNumber,
                            phoneNumber: mainNumber,
                            phone_number: mainNumber,
                            countryCode: row.country_code,
                            source: row.source,
                            agentName: row.agent_name,
                            agentId: row.agent_id,
                            region: row.region,
                            nextCycle: row.next_cycle,
                            provider: row.provider,
                            twilioSid: row.twilio_sid,
                            capabilities: caps,
                            created_at: row.created_at || row.purchased_at,
                            purchased_at: row.purchased_at
                        };

                        return [2 /*return*/, normalized];

                    case 2:
                        error_2 = _a.sent();
                        try {
                            console.error("FULL DB ERROR fetching phone number by id:", JSON.stringify(error_2, Object.getOwnPropertyNames(error_2)));
                        }
                        catch (_) {
                            console.error("Error fetching phone number (non-serializable):", error_2);
                        }
                        throw new Error("Failed to fetch phone number");
                    case 3: return [2 /*return*/];
                }
            });
        });
    };

    // ==========================
    // CREATE PHONE NUMBER
    // ==========================
    PhoneNumberService.createPhoneNumber = function (userId, phoneNumberData) {
        return __awaiter(this, void 0, void 0, function () {
            var id, number, countryCode, source, _a, agentName, _b, agentId, region, nextCycle, provider, _c, twilioSid, _d, capabilities, nextCycleDate, error_3;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        _e.trys.push([0, 3, , 4]);
                        id = (0, uuid_1.v4)();
                        number = phoneNumberData.number, countryCode = phoneNumberData.countryCode, source = phoneNumberData.source, _a = phoneNumberData.agentName, agentName = _a === void 0 ? null : _a, _b = phoneNumberData.agentId, agentId = _b === void 0 ? null : _b, region = phoneNumberData.region, nextCycle = phoneNumberData.nextCycle, provider = phoneNumberData.provider, _c = phoneNumberData.twilioSid, twilioSid = _c === void 0 ? null : _c, _d = phoneNumberData.capabilities, capabilities = _d === void 0 ? null : _d;
                        nextCycleDate = nextCycle || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                        return [4 /*yield*/, database_js_1.default.execute("INSERT INTO phone_numbers \
(id, user_id, number, country_code, source, agent_name, agent_id, region, next_cycle, provider, twilio_sid, capabilities, purchased_at) \
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())", [
                                id,
                                userId,
                                number,
                                countryCode,
                                source,
                                agentName,
                                agentId,
                                region,
                                nextCycleDate,
                                provider,
                                twilioSid,
                                JSON.stringify(capabilities || { voice: true })
                            ])];
                    case 1:
                        _e.sent();
                        return [4 /*yield*/, this.getPhoneNumberById(userId, id)];
                    case 2:
                        return [2 /*return*/, _e.sent()];
                    case 3:
                        error_3 = _e.sent();
                        try {
                            console.error("FULL DB ERROR creating phone number:", JSON.stringify(error_3, Object.getOwnPropertyNames(error_3)));
                        }
                        catch (_) {
                            console.error("Error creating phone number (non-serializable):", error_3);
                        }
                        throw new Error("Failed to create phone number");
                    case 4: return [2 /*return*/];
                }
            });
        });
    };

    // ==========================
    // UPDATE PHONE NUMBER
    // ==========================
    PhoneNumberService.updatePhoneNumber = function (userId, id, updateData) {
        return __awaiter(this, void 0, void 0, function () {
            var existing, fields, values, fieldMapping, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        return [4 /*yield*/, this.getPhoneNumberById(userId, id)];
                    case 1:
                        existing = _a.sent();
                        if (!existing)
                            throw new Error("Phone number not found");
                        fields = [];
                        values = [];
                        fieldMapping = {
                            agentId: "agent_id",
                            agentName: "agent_name",
                            countryCode: "country_code",
                            nextCycle: "next_cycle",
                            twilioSid: "twilio_sid"
                        };
                        Object.keys(updateData).forEach(function (key) {
                            if (key !== "id" && key !== "userId") {
                                var dbField = fieldMapping[key] || key;
                                fields.push("".concat(dbField, " = ?"));
                                values.push(updateData[key]);
                            }
                        });
                        if (fields.length === 0)
                            return [2 /*return*/, existing];
                        values.push(id);
                        values.push(userId);
                        return [4 /*yield*/, database_js_1.default.execute("UPDATE phone_numbers SET " + fields.join(", ") + " WHERE id = ? AND user_id = ?", values)];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, this.getPhoneNumberById(userId, id)];
                    case 3:
                        return [2 /*return*/, _a.sent()];
                    case 4:
                        error_4 = _a.sent();
                        try {
                            console.error("FULL DB ERROR updating phone number:", JSON.stringify(error_4, Object.getOwnPropertyNames(error_4)));
                        }
                        catch (_) {
                            console.error("Error updating phone number (non-serializable):", error_4);
                        }
                        throw new Error("Failed to update phone number: " + error_4.message);
                    case 5: return [2 /*return*/];
                }
            });
        });
    };

    // ==========================
    // DELETE PHONE NUMBER
    // ==========================
    PhoneNumberService.deletePhoneNumber = function (userId, id) {
        return __awaiter(this, void 0, void 0, function () {
            var existing, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.getPhoneNumberById(userId, id)];
                    case 1:
                        existing = _a.sent();
                        if (!existing)
                            throw new Error("Phone number not found");
                        return [4 /*yield*/, database_js_1.default.execute("DELETE FROM phone_numbers WHERE id = ? AND user_id = ?", [id, userId])];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, true];
                    case 3:
                        error_5 = _a.sent();
                        try {
                            console.error("FULL DB ERROR deleting phone number:", JSON.stringify(error_5, Object.getOwnPropertyNames(error_5)));
                        }
                        catch (_) {
                            console.error("Error deleting phone number (non-serializable):", error_5);
                        }
                        throw new Error("Failed to delete phone number");
                    case 4: return [2 /*return*/];
                }
            });
        });
    };

    // ==========================
    // IMPORT EXISTING NUMBER
    // ==========================
    PhoneNumberService.importPhoneNumber = function (userId, phoneNumberData) {
        return __awaiter(this, void 0, void 0, function () {
            var region, country, phoneNumber, twilioSid, phoneData, error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        region = phoneNumberData.region, country = phoneNumberData.country, phoneNumber = phoneNumberData.phoneNumber, twilioSid = phoneNumberData.twilioSid;
                        phoneData = {
                            number: phoneNumber,
                            countryCode: country,
                            source: "Imported:twilio",
                            region: region,
                            provider: "twilio",
                            twilioSid: twilioSid || null,
                            capabilities: { voice: true }
                        };
                        return [4 /*yield*/, this.createPhoneNumber(userId, phoneData)];
                    case 1:
                        return [2 /*return*/, _a.sent()];
                    case 2:
                        error_6 = _a.sent();
                        try {
                            console.error("FULL DB ERROR importing phone number:", JSON.stringify(error_6, Object.getOwnPropertyNames(error_6)));
                        }
                        catch (_) {
                            console.error("Error importing phone number (non-serializable):", error_6);
                        }
                        throw new Error("Failed to import phone number: " + error_6.message);
                    case 3: return [2 /*return*/];
                }
            });
        });
    };

    return PhoneNumberService;
}());

exports.PhoneNumberService = PhoneNumberService;
