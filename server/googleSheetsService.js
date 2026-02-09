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
exports.GoogleSheetsService = void 0;
var googleapis_1 = require("googleapis");
var google_auth_library_1 = require("google-auth-library");
var dotenv_1 = require("dotenv");
dotenv_1.default.config();
var GoogleSheetsService = /** @class */ (function () {
    function GoogleSheetsService() {
        // Check if Google service account credentials are available
        if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
            try {
                // Initialize Google Sheets API client
                this.auth = new google_auth_library_1.JWT({
                    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
                });
                this.sheets = googleapis_1.google.sheets({ version: 'v4', auth: this.auth });
            }
            catch (error) {
                console.error('Error initializing Google Sheets service:', error);
                this.auth = null;
                this.sheets = null;
            }
        }
        else {
            console.warn('Google service account credentials not found. Google Sheets integration will be simulated.');
            this.auth = null;
            this.sheets = null;
        }
    }
    /**
     * Append data to Google Sheets
     * @param spreadsheetId The Google Sheets spreadsheet ID
     * @param data The data to append
     * @param sheetName The sheet name to append to (optional)
     * @returns Promise<boolean> indicating success
     */
    GoogleSheetsService.prototype.appendDataToSheet = function (spreadsheetId, data, sheetName) {
        return __awaiter(this, void 0, void 0, function () {
            var values, headers, rowData, range, response, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        if (!(!this.auth || !this.sheets)) return [3 /*break*/, 2];
                        console.log('Simulating Google Sheets append operation:', { spreadsheetId: spreadsheetId, data: data, sheetName: sheetName });
                        // Simulate API call delay
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 1000); })];
                    case 1:
                        // Simulate API call delay
                        _a.sent();
                        // Simulate successful operation
                        return [2 /*return*/, true];
                    case 2:
                        values = [];
                        headers = Object.keys(data);
                        values.push(headers);
                        rowData = headers.map(function (header) { return data[header] || ''; });
                        values.push(rowData);
                        range = 'A1';
                        if (sheetName) {
                            range = "".concat(sheetName, "!A1");
                        }
                        return [4 /*yield*/, this.sheets.spreadsheets.values.append({
                                spreadsheetId: spreadsheetId,
                                range: range,
                                valueInputOption: 'RAW',
                                requestBody: {
                                    values: values
                                }
                            })];
                    case 3:
                        response = _a.sent();
                        return [2 /*return*/, response.status === 200];
                    case 4:
                        error_1 = _a.sent();
                        console.error('Error appending data to Google Sheets:', error_1);
                        return [2 /*return*/, false];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get spreadsheet info
     * @param spreadsheetId The Google Sheets spreadsheet ID
     * @returns Promise with spreadsheet info
     */
    GoogleSheetsService.prototype.getSpreadsheetInfo = function (spreadsheetId) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        // If Google Sheets service is not properly initialized, throw an error
                        if (!this.auth || !this.sheets) {
                            throw new Error('Google Sheets service not properly initialized');
                        }
                        return [4 /*yield*/, this.sheets.spreadsheets.get({
                                spreadsheetId: spreadsheetId
                            })];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                    case 2:
                        error_2 = _a.sent();
                        console.error('Error getting spreadsheet info:', error_2);
                        throw error_2;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return GoogleSheetsService;
}());
exports.GoogleSheetsService = GoogleSheetsService;
exports.default = GoogleSheetsService;
