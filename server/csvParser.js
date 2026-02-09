"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCSV = parseCSV;
/**
 * Parse CSV string into array of objects
 * @param csvString CSV content as string
 * @param delimiter Delimiter character (default: ',')
 * @returns Array of objects with column names as keys
 */
function parseCSV(csvString, delimiter) {
    if (delimiter === void 0) { delimiter = ','; }
    // Split into lines
    var lines = csvString.trim().split('\n');
    if (lines.length === 0) {
        return [];
    }
    // Parse header
    var header = lines[0].split(delimiter).map(function (field) { return field.trim(); });
    // Find phone column index
    var phoneColumnIndex = header.findIndex(function (column) {
        return column.toLowerCase() === 'phone' ||
            column.toLowerCase() === 'phone number' ||
            column.toLowerCase() === 'phonenumber';
    });
    if (phoneColumnIndex === -1) {
        throw new Error('CSV must contain a "phone" column');
    }
    // Parse data rows
    var records = [];
    for (var i = 1; i < lines.length; i++) {
        var line = lines[i].trim();
        if (line) {
            var values = line.split(delimiter).map(function (value) { return value.trim(); });
            var phone = values[phoneColumnIndex];
            // Basic phone number validation
            if (phone && phone.length >= 10) {
                records.push({ phone: phone });
            }
        }
    }
    return records;
}
exports.default = { parseCSV: parseCSV };
