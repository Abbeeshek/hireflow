import { connectDB, disconnectDB } from '../config/db.js';
import { Job, User, Application, Resume } from '../models/index.js';
import { screenApplication } from '../services/screening.service.js';
import { ensureResumeParsed } from '../services/resumeParser.service.js';

export async function warmAi() {
  console.log('=== Starting HireFlow AI Warming (Pre-screening Demo Data) ===');
  await connectDB();

  const recruiter = await User.findOne({ email: 'recruiter@hireflow.test' });
  if (!recruiter) {
    console.error('Recruiter user not found. Please run "npm run seed:ai" first.');
    process.exit(1);
  }

  const job = await Job.findOne({ title: 'Full Stack Developer - 2 openings' });
  if (!job) {
    console.error('Demo job "Full Stack Developer - 2 openings" not found. Please run "npm run seed:ai" first.');
    process.exit(1);
  }

  const applications = await Application.find({ job: job._id })
    .populate('candidate', 'name email')
    .populate('resume');

  console.log(`Found ${applications.length} applications for "${job.title}". Beginning parse & screening...`);

  let completed = 0;
  let failed = 0;
  let strongCount = 0;
  let potentialCount = 0;
  let lowCount = 0;

  for (let i = 0; i < applications.length; i++) {
    const app = applications[i];
    const candidateName = app.candidate?.name || `Candidate ${i + 1}`;

    try {
      process.stdout.write(`[${i + 1}/${applications.length}] Warming ${candidateName}... `);

      // 1. Ensure parsed
      if (app.resume) {
        try {
          await ensureResumeParsed(app.resume._id);
        } catch (parseErr) {
          console.log(`(Parse note: ${parseErr.message}) `);
        }
      }

      // 2. Screen
      const appResult = await screenApplication(app._id, recruiter, { force: true });
      completed++;

      const scr = appResult.screening || {};
      if (scr.bucket === 'strong') strongCount++;
      else if (scr.bucket === 'potential') potentialCount++;
      else lowCount++;

      console.log(`✓ Screened: ${scr.overall ?? 0}% [${(scr.bucket || 'low').toUpperCase()}]`);
    } catch (err) {
      failed++;
      console.log(`✗ Skipped/Failed: ${err.message}`);
    }
  }

  console.log('\n=== AI Warming Summary ===');
  console.log(`Total Applications: ${applications.length}`);
  console.log(`Successfully Screened: ${completed}`);
  console.log(`Failed / Unparseable: ${failed}`);
  console.log(`  • Strong Fit:    ${strongCount}`);
  console.log(`  • Potential Fit: ${potentialCount}`);
  console.log(`  • Low Fit:       ${lowCount}`);
  console.log('Warming complete! Demo database is primed for failure-proof offline demo.\n');
}

// Execute if run directly
if (process.argv[1] && process.argv[1].endsWith('warmAi.js')) {
  warmAi()
    .then(() => disconnectDB())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Error during AI warming:', err);
      process.exit(1);
    });
}
