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
exports.DocumentService = void 0;
var uuid_1 = require("uuid");
var DocumentService = /** @class */ (function () {
    function DocumentService(mysqlPool) {
        this.mysqlPool = mysqlPool;
    }
    /**
     * Upload a document
     * @param userId The ID of the user
     * @param name The name of the document
     * @param content The content of the document
     * @param agentId Optional agent ID to associate with the document
     * @returns The created document
     */
    DocumentService.prototype.uploadDocument = function (userId, name, content, agentId) {
        return __awaiter(this, void 0, void 0, function () {
            var maxContentLength, documentId, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        // Validate inputs
                        if (!userId) {
                            throw new Error('User ID is required');
                        }
                        if (!name) {
                            throw new Error('Document name is required');
                        }
                        if (content === undefined || content === null) {
                            throw new Error('Document content is required');
                        }
                        maxContentLength = 5 * 1024 * 1024;
                        if (content.length > maxContentLength) {
                            throw new Error("Content exceeds limit of 5MB. Current content length: ".concat((content.length / (1024 * 1024)).toFixed(2), "MB"));
                        }
                        documentId = (0, uuid_1.v4)();
                        return [4 /*yield*/, this.mysqlPool.execute("INSERT INTO documents (id, user_id, agent_id, name, content) \n         VALUES (?, ?, ?, ?, ?)", [documentId, userId, agentId || null, name, content])];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, {
                                id: documentId,
                                name: name,
                                userId: userId,
                                agentId: agentId || null
                            }];
                    case 2:
                        error_1 = _a.sent();
                        console.error('Error uploading document:', error_1);
                        throw error_1;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get documents for a user
     * @param userId The ID of the user
     * @param agentId Optional agent ID to filter documents
     * @returns List of documents
     */
    DocumentService.prototype.getDocuments = function (userId, agentId) {
        return __awaiter(this, void 0, void 0, function () {
            var query, params, rows, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        query = 'SELECT id, user_id, agent_id, name, uploaded_at FROM documents WHERE user_id = ?';
                        params = [userId];
                        if (agentId) {
                            query += ' AND (agent_id = ? OR agent_id IS NULL)';
                            params.push(agentId);
                        }
                        else {
                            query += ' AND agent_id IS NULL';
                        }
                        query += ' ORDER BY uploaded_at DESC';
                        return [4 /*yield*/, this.mysqlPool.execute(query, params)];
                    case 1:
                        rows = (_a.sent())[0];
                        return [2 /*return*/, rows];
                    case 2:
                        error_2 = _a.sent();
                        console.error('Error fetching documents:', error_2);
                        throw error_2;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get document content by ID
     * @param documentId The ID of the document
     * @returns The document content
     */
    DocumentService.prototype.getDocumentContent = function (documentId) {
        return __awaiter(this, void 0, void 0, function () {
            var rows, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.mysqlPool.execute('SELECT content FROM documents WHERE id = ?', [documentId])];
                    case 1:
                        rows = (_a.sent())[0];
                        if (rows.length === 0) {
                            return [2 /*return*/, null];
                        }
                        return [2 /*return*/, rows[0].content];
                    case 2:
                        error_3 = _a.sent();
                        console.error('Error fetching document content:', error_3);
                        throw error_3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Delete a document
     * @param documentId The ID of the document to delete
     */
    DocumentService.prototype.deleteDocument = function (documentId) {
        return __awaiter(this, void 0, void 0, function () {
            var error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.mysqlPool.execute('DELETE FROM documents WHERE id = ?', [documentId])];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        error_4 = _a.sent();
                        console.error('Error deleting document:', error_4);
                        throw error_4;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return DocumentService;
}());
exports.DocumentService = DocumentService;
