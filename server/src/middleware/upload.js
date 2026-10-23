import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { BadRequestError } from '../utils/errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const UPLOAD_DIR = path.resolve(__dirname, '../../uploads/resumes');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Allowed MIME types and extensions
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]);

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.doc', '.docx']);

// Magic bytes validation
export const validateMagicBytes = (buffer) => {
  if (!buffer || buffer.length < 4) return false;

  // PDF: %PDF (25 50 44 46)
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return 'application/pdf';
  }

  // DOC: D0 CF 11 E0 A1 B1 1A E1 (OLECF)
  if (
    buffer.length >= 8 &&
    buffer[0] === 0xd0 &&
    buffer[1] === 0xcf &&
    buffer[2] === 0x11 &&
    buffer[3] === 0xe0 &&
    buffer[4] === 0xa1 &&
    buffer[5] === 0xb1 &&
    buffer[6] === 0x1a &&
    buffer[7] === 0xe1
  ) {
    return 'application/msword';
  }

  // DOCX: 50 4B 03 04 or 50 4B 05 06 or 50 4B 07 08 (ZIP)
  if (
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07) &&
    (buffer[3] === 0x04 || buffer[3] === 0x06 || buffer[3] === 0x08)
  ) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }

  return false;
};

// Use memory storage so we can check magic bytes before writing to disk
const memoryStorage = multer.memoryStorage();

export const uploadResumeMiddleware = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB max
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return cb(
        new BadRequestError('Invalid file extension. Only PDF, DOC, and DOCX files are allowed.')
      );
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(
        new BadRequestError('Invalid MIME type. Only PDF, DOC, and DOCX files are allowed.')
      );
    }

    cb(null, true);
  }
}).single('resume');

// Middleware to validate magic bytes and save file to disk with randomized filename
export const processResumeUpload = async (req, res, next) => {
  uploadResumeMiddleware(req, res, async (err) => {
    if (err) return next(err);

    if (!req.file) {
      return next(new BadRequestError('Resume file is required.'));
    }

    const detectedMime = validateMagicBytes(req.file.buffer);
    if (!detectedMime) {
      return next(
        new BadRequestError(
          'File content does not match genuine PDF, DOC, or DOCX format (invalid magic bytes).'
        )
      );
    }

    try {
      const ext = path.extname(req.file.originalname).toLowerCase();
      const randomName = `${crypto.randomUUID()}${ext}`;
      const filePath = path.join(UPLOAD_DIR, randomName);

      await fs.promises.writeFile(filePath, req.file.buffer);

      req.processedResume = {
        originalName: path.basename(req.file.originalname),
        storedName: randomName,
        mimeType: detectedMime,
        size: req.file.size,
        filePath
      };

      next();
    } catch (writeErr) {
      next(writeErr);
    }
  });
};
