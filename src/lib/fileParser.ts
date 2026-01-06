import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface ParsedData {
  headers: string[];
  rows: Record<string, string>[];
  errors: string[];
}

export async function parseFile(file: File): Promise<ParsedData> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'csv':
      return parseCSV(file);
    case 'xlsx':
    case 'xls':
      return parseExcel(file);
    case 'json':
      return parseJSON(file);
    default:
      return {
        headers: [],
        rows: [],
        errors: [`Không hỗ trợ định dạng file .${extension}`]
      };
  }
}

async function parseCSV(file: File): Promise<ParsedData> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (results) => {
        const headers = results.meta.fields || [];
        const rows = results.data as Record<string, string>[];
        const errors = results.errors.map(e => `Dòng ${e.row}: ${e.message}`);
        
        resolve({ headers, rows, errors });
      },
      error: (error) => {
        resolve({
          headers: [],
          rows: [],
          errors: [`Lỗi đọc file CSV: ${error.message}`]
        });
      }
    });
  });
}

async function parseExcel(file: File): Promise<ParsedData> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON with header
        const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, { 
          raw: false,
          defval: ''
        });
        
        // Get headers from the first row
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        const headers: string[] = [];
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cell = worksheet[XLSX.utils.encode_cell({ r: 0, c: col })];
          headers.push(cell ? String(cell.v) : `Column${col + 1}`);
        }
        
        resolve({
          headers,
          rows: jsonData,
          errors: []
        });
      } catch (error) {
        resolve({
          headers: [],
          rows: [],
          errors: [`Lỗi đọc file Excel: ${error instanceof Error ? error.message : 'Unknown error'}`]
        });
      }
    };
    
    reader.onerror = () => {
      resolve({
        headers: [],
        rows: [],
        errors: ['Không thể đọc file']
      });
    };
    
    reader.readAsBinaryString(file);
  });
}

async function parseJSON(file: File): Promise<ParsedData> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const jsonData = JSON.parse(content);
        
        // Handle array of objects
        if (Array.isArray(jsonData) && jsonData.length > 0) {
          const headers = Object.keys(jsonData[0]);
          const rows = jsonData.map(item => {
            const row: Record<string, string> = {};
            headers.forEach(h => {
              row[h] = String(item[h] ?? '');
            });
            return row;
          });
          
          resolve({ headers, rows, errors: [] });
        } else {
          resolve({
            headers: [],
            rows: [],
            errors: ['File JSON phải chứa một mảng các object']
          });
        }
      } catch (error) {
        resolve({
          headers: [],
          rows: [],
          errors: [`Lỗi parse JSON: ${error instanceof Error ? error.message : 'Invalid JSON'}`]
        });
      }
    };
    
    reader.onerror = () => {
      resolve({
        headers: [],
        rows: [],
        errors: ['Không thể đọc file']
      });
    };
    
    reader.readAsText(file, 'UTF-8');
  });
}

export function validateHeaders(
  parsedHeaders: string[], 
  expectedColumns: string[]
): { valid: boolean; missingColumns: string[]; extraColumns: string[] } {
  const normalizedParsed = parsedHeaders.map(h => h.toLowerCase().trim());
  const normalizedExpected = expectedColumns.map(c => c.toLowerCase().trim());
  
  const missingColumns = expectedColumns.filter(
    col => !normalizedParsed.includes(col.toLowerCase().trim())
  );
  
  const extraColumns = parsedHeaders.filter(
    h => !normalizedExpected.includes(h.toLowerCase().trim())
  );
  
  return {
    valid: missingColumns.length === 0,
    missingColumns,
    extraColumns
  };
}
