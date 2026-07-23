import { extractText } from 'unpdf';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse/lib/pdf-parse.js');
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { createLogger } from '@/utils/logger';

const logger = createLogger('Parser:Document');

/**
 * Extract plain text content from a PDF document buffer.
 * Tries modern unpdf (pdfjs-dist engine) first, falling back to pdf-parse.
 */
export async function parsePDF(buffer: Buffer): Promise<string> {
  // 1. Try unpdf (modern pdfjs-dist engine)
  try {
    const uint8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const { text } = await extractText(uint8);
    const fullText = Array.isArray(text) ? text.join('\n') : (text || '');
    const trimmed = fullText.trim();
    if (trimmed) {
      return trimmed;
    }
  } catch (unpdfErr) {
    logger.warn('unpdf primary parser failed, trying pdf-parse fallback', { error: String(unpdfErr) });
  }

  // 2. Fallback to pdf-parse
  try {
    const data = await pdfParse(buffer);
    const text = data.text ? data.text.trim() : '';
    if (text) {
      return text;
    }
  } catch (pdfParseErr) {
    logger.error('pdf-parse fallback also failed', { error: String(pdfParseErr) });
  }

  throw new Error('Could not parse PDF file. Ensure the PDF contains readable text.');
}

/**
 * Extract plain text content from a DOCX document buffer.
 */
export async function parseDOCX(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value ? result.value.trim() : '';
    if (!text) {
      throw new Error('DOCX document contained no extractable text.');
    }
    return text;
  } catch (err) {
    logger.error('Failed to parse DOCX', { error: String(err) });
    throw new Error('Could not parse DOCX file. Ensure the file is a valid Word document.');
  }
}

/**
 * Extract infrastructure, sizing, inventory or workload sheet contents from an Excel buffer.
 */
export async function parseExcel(buffer: Buffer): Promise<string> {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetTexts: string[] = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;

      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
      if (!rows || rows.length === 0) continue;

      const nonEndRows = rows.filter(
        (row) => Array.isArray(row) && row.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== '')
      );

      if (nonEndRows.length > 0) {
        sheetTexts.push(`Sheet: ${sheetName}`);
        for (const row of nonEndRows) {
          if (Array.isArray(row)) {
            const formattedRow = row
              .map((cell) => (cell === null || cell === undefined ? '' : String(cell).trim()))
              .filter(Boolean)
              .join(' | ');
            if (formattedRow) {
              sheetTexts.push(formattedRow);
            }
          }
        }
        sheetTexts.push('');
      }
    }

    const text = sheetTexts.join('\n').trim();
    if (!text) {
      throw new Error('Excel workbook contained no readable sheet data.');
    }
    return text;
  } catch (err) {
    logger.error('Failed to parse Excel', { error: String(err) });
    throw new Error('Could not parse Excel workbook. Ensure the file contains valid sheets.');
  }
}
