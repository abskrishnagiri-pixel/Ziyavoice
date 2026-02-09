"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hash = exports.decrypt = exports.encrypt = void 0;
var crypto_1 = __importDefault(require("crypto"));
// Encryption configuration
var ALGORITHM = 'aes-256-gcm';
var IV_LENGTH = 16;
var SALT_LENGTH = 64;
var TAG_LENGTH = 16;
var KEY_LENGTH = 32;
// Get encryption key from environment or generate a default one
// In production, this MUST be set in environment variables
var getEncryptionKey = function () {
    var secret = process.env.ENCRYPTION_SECRET || 'default-secret-key-change-in-production';
    if (secret === 'default-secret-key-change-in-production') {
        console.warn('⚠️ WARNING: Using default encryption secret. This is insecure for production.');
    } else {
        console.log('✅ Using custom encryption secret (length: ' + secret.length + ')');
    }
    return crypto_1.default.pbkdf2Sync(secret, 'salt', 100000, KEY_LENGTH, 'sha256');
};
/**
 * Encrypt sensitive data (like Twilio auth tokens)
 * @param text - The text to encrypt
 * @returns Encrypted string in format: iv:authTag:encryptedData
 */
var encrypt = function (text) {
    try {
        if (!text)
            return '';
        var key = getEncryptionKey();
        var iv = crypto_1.default.randomBytes(IV_LENGTH);
        var cipher = crypto_1.default.createCipheriv(ALGORITHM, key, iv);
        var encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        var authTag = cipher.getAuthTag();
        // Return format: iv:authTag:encryptedData
        return "".concat(iv.toString('hex'), ":").concat(authTag.toString('hex'), ":").concat(encrypted);
    }
    catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Failed to encrypt data');
    }
};
exports.encrypt = encrypt;
/**
 * Decrypt sensitive data
 * @param encryptedText - The encrypted text in format: iv:authTag:encryptedData
 * @returns Decrypted string
 */
var decrypt = function (encryptedText) {
    try {
        if (!encryptedText)
            return '';
        var parts = encryptedText.split(':');
        if (parts.length !== 3) {
            throw new Error('Invalid encrypted text format');
        }
        var ivHex = parts[0], authTagHex = parts[1], encryptedData = parts[2];
        var key = getEncryptionKey();
        var iv = Buffer.from(ivHex, 'hex');
        var authTag = Buffer.from(authTagHex, 'hex');
        var decipher = crypto_1.default.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        var decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    catch (error) {
        // Fallback to original text if decryption fails - handles potentially unencrypted legacy data
        // or data encrypted with a different key gracefully in consumers
        console.error('Decryption error (likely key mismatch):', error.message);
        return encryptedText;
    }
};
exports.decrypt = decrypt;
/**
 * Hash sensitive data (one-way, for verification purposes)
 * @param text - The text to hash
 * @returns Hashed string
 */
var hash = function (text) {
    return crypto_1.default.createHash('sha256').update(text).digest('hex');
};
exports.hash = hash;
