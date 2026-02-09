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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
var bcrypt = require('bcryptjs');
var AuthService = /** @class */ (function () {
    function AuthService(mysqlPool) {
        this.mysqlPool = mysqlPool;
    }
    /**
     * Authenticate user with email and password
     * @param email User's email
     * @param password User's password
     * @returns User object if authentication successful, null otherwise
     */
    AuthService.prototype.authenticateUser = function (email, password) {
        return __awaiter(this, void 0, void 0, function () {
            var rows, user, isValidPassword, password_hash, userWithoutPassword, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.mysqlPool.execute('SELECT id, email, password_hash FROM users WHERE email = ?', [email])];
                    case 1:
                        rows = (_a.sent())[0];
                        if (rows.length === 0) {
                            return [2 /*return*/, null];
                        }
                        user = rows[0];
                        return [4 /*yield*/, bcrypt.compare(password, user.password_hash)];
                    case 2:
                        isValidPassword = _a.sent();
                        if (!isValidPassword) {
                            return [2 /*return*/, null];
                        }
                        password_hash = user.password_hash, userWithoutPassword = __rest(user, ["password_hash"]);
                        return [2 /*return*/, userWithoutPassword];
                    case 3:
                        error_1 = _a.sent();
                        console.error('Authentication error:', error_1);
                        throw error_1;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Register a new user
     * @param email User's email
     * @param password User's password
     * @returns Created user object
     */
    AuthService.prototype.registerUser = function (email, username, password) {
        return __awaiter(this, void 0, void 0, function () {
            var existingUsers, saltRounds, passwordHash, userId, result, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        return [4 /*yield*/, this.mysqlPool.execute('SELECT id FROM users WHERE email = ?', [email])];
                    case 1:
                        existingUsers = (_a.sent())[0];
                        if (existingUsers.length > 0) {
                            throw new Error('User already exists');
                        }
                        saltRounds = 10;
                        return [4 /*yield*/, bcrypt.hash(password, saltRounds)];
                    case 2:
                        passwordHash = _a.sent();
                        userId = Math.random().toString(36).substring(2, 15);
                        return [4 /*yield*/, this.mysqlPool.execute('INSERT INTO users (id, email, username, password_hash) VALUES (?, ?, ?, ?)', [userId, email, username, passwordHash])];
                    case 3:
                        result = (_a.sent())[0];
                        return [2 /*return*/, {
                        id: userId,
                        email: email,
                        username: username
                    }];
                    case 4:
                        error_2 = _a.sent();
                        console.error('Registration error:', error_2);
                        throw error_2;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    return AuthService;
}());
exports.AuthService = AuthService;
