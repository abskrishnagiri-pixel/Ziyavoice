/**
 * Parse CSV string into array of objects
 * @param csvString CSV content as string
 * @param delimiter Delimiter character (default: ',')
 * @returns Array of objects with column names as keys
 */
export function parseCSV(csvString: string, delimiter: string = ','): { phone: string }[] {
  // Split into lines
  const lines = csvString.trim().split('\n');
  
  if (lines.length === 0) {
    return [];
  }
  
  // Parse header
  const header = lines[0].split(delimiter).map(field => field.trim());
  
  // Find phone column index
  const phoneColumnIndex = header.findIndex(column => 
    column.toLowerCase() === 'phone' || 
    column.toLowerCase() === 'phone number' ||
    column.toLowerCase() === 'phonenumber'
  );
  
  if (phoneColumnIndex === -1) {
    throw new Error('CSV must contain a "phone" column');
  }
  
  // Parse data rows
  const records: { phone: string }[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line) {
      const values = line.split(delimiter).map(value => value.trim());
      const phone = values[phoneColumnIndex];
      
      // Basic phone number validation
      if (phone && phone.length >= 10) {
        records.push({ phone });
      }
    }
  }
  
  return records;
}

export default { parseCSV };