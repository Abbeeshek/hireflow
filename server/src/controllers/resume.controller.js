import fs from 'fs';
import * as resumeService from '../services/resume.service.js';

export const downloadResume = async (req, res, next) => {
  try {
    const fileInfo = await resumeService.getResumeForDownload(req.params.id, req.user, req);

    // Sanitize filename for Content-Disposition header
    const sanitizedFilename = fileInfo.originalName.replace(/[^\w.-]/g, '_');

    res.setHeader('Content-Type', fileInfo.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(sanitizedFilename)}"`
    );

    const fileStream = fs.createReadStream(fileInfo.filePath);
    fileStream.on('error', (streamErr) => {
      next(streamErr);
    });

    fileStream.pipe(res);
  } catch (err) {
    next(err);
  }
};
