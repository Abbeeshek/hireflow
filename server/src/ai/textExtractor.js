import fs from 'fs';
import path from 'path';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

const UNSUPPORTED_OR_SCANNED_MSG = 'unsupported or scanned file, upload a text PDF or DOCX';

/**
 * Splits extracted resume text into an array of clean, numbered sentences/lines.
 * Evidence quotes will reference indexes in this array.
 * @param {string} text
 * @returns {string[]}
 */
export function splitSentences(text) {
  if (!text || typeof text !== 'string') return [];

  // Remove PDF page numbers like "-- 1 of 2 --"
  const cleaned = text.replace(/--\s*\d+\s+of\s+\d+\s*--/gi, '');

  const lines = cleaned
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const sentences = [];

  for (const line of lines) {
    // Split lines on sentence terminal punctuation followed by space and capital letter or digit
    const parts = line.split(/(?<=[.!?])\s+(?=[A-Z0-9])/);
    for (let part of parts) {
      part = part.trim().replace(/^[•\-\*–—\u2022]\s*/, '').trim();
      // Keep meaningful statements (longer than 3 chars)
      if (part.length >= 3) {
        sentences.push(part);
      }
    }
  }

  return sentences;
}

/**
 * Extracts raw text and split sentences from a resume file on disk or buffer.
 * @param {string|Buffer} source - File path string or Buffer
 * @param {object} options
 * @param {string} options.mimeType
 * @param {string} options.originalName
 * @returns {Promise<{ text: string, sentences: string[] }>}
 */
export async function extractText(source, options = {}) {
  const { mimeType = '', originalName = '' } = options;
  const ext = (originalName ? path.extname(originalName) : (typeof source === 'string' ? path.extname(source) : '')).toLowerCase();

  // Legacy .doc is unsupported
  if (ext === '.doc' || mimeType === 'application/msword') {
    throw new Error(UNSUPPORTED_OR_SCANNED_MSG);
  }

  let buffer;
  if (Buffer.isBuffer(source)) {
    buffer = source;
  } else if (typeof source === 'string') {
    if (!fs.existsSync(source)) {
      throw new Error(`File not found: ${source}`);
    }
    buffer = await fs.promises.readFile(source);
  } else {
    throw new Error('Invalid source provided for text extraction');
  }

  let text = '';

  const isPdf = ext === '.pdf' || mimeType === 'application/pdf';
  const isDocx =
    ext === '.docx' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  if (isPdf) {
    try {
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      text = (result?.text || '').trim();
    } catch (err) {
      throw new Error(UNSUPPORTED_OR_SCANNED_MSG);
    }
  } else if (isDocx) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      text = (result?.value || '').trim();
    } catch (err) {
      throw new Error(UNSUPPORTED_OR_SCANNED_MSG);
    }
  } else {
    throw new Error(UNSUPPORTED_OR_SCANNED_MSG);
  }

  // Scanned / image-only / empty files check (must have at least 40 characters of actual text)
  const alphaCount = (text.match(/[a-zA-Z]/g) || []).length;
  if (text.length < 40 || alphaCount < 25) {
    throw new Error(UNSUPPORTED_OR_SCANNED_MSG);
  }

  const sentences = splitSentences(text);
  if (sentences.length === 0) {
    throw new Error(UNSUPPORTED_OR_SCANNED_MSG);
  }

  return { text, sentences };
}

export default {
  splitSentences,
  extractText
};
