import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import PDFDocument from 'pdfkit';
import { connectDB, disconnectDB } from '../config/db.js';
import {
  User,
  Company,
  Job,
  CandidateProfile,
  Resume,
  Application,
  AuditLog,
  APPLICATION_STAGES
} from '../models/index.js';
import { UPLOAD_DIR } from '../middleware/upload.js';

// Helper to generate a dummy PDF resume for a candidate
const generateDummyPdf = (candidateName, headline, skills, experienceYears, storedFilename) => {
  return new Promise((resolve, reject) => {
    const filePath = path.join(UPLOAD_DIR, storedFilename);
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    // Title / Header
    doc.fontSize(22).fillColor('#1A1136').text(candidateName, { bold: true });
    doc.fontSize(14).fillColor('#4530A6').text(headline);
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#666666').text(`Experience: ${experienceYears} Years | Location: San Francisco, CA | Verified Resume`);
    doc.moveDown(1);

    // Summary
    doc.fontSize(14).fillColor('#1A1136').text('Professional Summary');
    doc.fontSize(10).fillColor('#333333').text(
      `Dedicated professional with ${experienceYears} years of expertise in software development, delivering scalable web architectures and leading cross-functional teams.`
    );
    doc.moveDown(1);

    // Skills
    doc.fontSize(14).fillColor('#1A1136').text('Technical Skills');
    doc.fontSize(10).fillColor('#333333').text(skills.join(' • '));
    doc.moveDown(1);

    // Work Experience
    doc.fontSize(14).fillColor('#1A1136').text('Experience');
    doc.fontSize(11).fillColor('#1A1136').text(`Senior Engineer - Tech Corp (${2026 - experienceYears} - Present)`);
    doc.fontSize(10).fillColor('#444444').text(
      '• Architected high-throughput microservices reducing latency by 35%.\n• Collaborated with product designers to implement responsive, accessible UI modules.'
    );
    doc.moveDown(1);

    // Education
    doc.fontSize(14).fillColor('#1A1136').text('Education');
    doc.fontSize(10).fillColor('#333333').text('B.S. in Computer Science - University of Technology');

    doc.end();

    stream.on('finish', () => resolve(filePath));
    stream.on('error', (err) => reject(err));
  });
};

const candidateSeedData = [
  { name: 'Alex Johnson', skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'], exp: 5, headline: 'Senior Full Stack Engineer' },
  { name: 'Bethany Smith', skills: ['React', 'Next.js', 'TailwindCSS', 'Figma'], exp: 4, headline: 'Frontend Engineer & UI Specialist' },
  { name: 'Carlos Mendez', skills: ['Node.js', 'Express', 'MongoDB', 'Docker', 'Redis'], exp: 6, headline: 'Lead Backend Developer' },
  { name: 'Diana Prince', skills: ['Python', 'SQL', 'Tableau', 'Pandas', 'PowerBI'], exp: 3, headline: 'Data Analyst & BI Specialist' },
  { name: 'Ethan Hunt', skills: ['Cypress', 'Selenium', 'Jest', 'Automation Testing'], exp: 4, headline: 'QA Automation Engineer' },
  { name: 'Fiona Gallagher', skills: ['AWS', 'Kubernetes', 'Terraform', 'CI/CD', 'Linux'], exp: 7, headline: 'Staff DevOps & Cloud Architect' },
  { name: 'George Clark', skills: ['React', 'JavaScript', 'HTML5', 'CSS3', 'Redux'], exp: 3, headline: 'Frontend Developer' },
  { name: 'Hannah Abbott', skills: ['Node.js', 'Go', 'PostgreSQL', 'Microservices'], exp: 5, headline: 'Backend Systems Engineer' },
  { name: 'Ian Malcolm', skills: ['Python', 'Machine Learning', 'SQL', 'Data Modeling'], exp: 4, headline: 'Data Analyst' },
  { name: 'Julia Roberts', skills: ['Playwright', 'Jest', 'API Testing', 'Postman'], exp: 3, headline: 'Quality Assurance Engineer' },
  { name: 'Kevin Bacon', skills: ['Docker', 'AWS', 'GitHub Actions', 'Prometheus'], exp: 5, headline: 'DevOps Engineer' },
  { name: 'Laura Croft', skills: ['React', 'Node.js', 'GraphQL', 'MongoDB'], exp: 6, headline: 'Full Stack JavaScript Engineer' },
  { name: 'Michael Scott', skills: ['React', 'Vue.js', 'Sass', 'Webpack'], exp: 4, headline: 'Frontend UI Engineer' },
  { name: 'Nancy Wheeler', skills: ['Java', 'Spring Boot', 'MySQL', 'Kafka'], exp: 5, headline: 'Backend Software Engineer' },
  { name: 'Oscar Martinez', skills: ['Excel', 'SQL', 'Python', 'Looker'], exp: 6, headline: 'Senior Financial Data Analyst' },
  { name: 'Pam Beesly', skills: ['Manual Testing', 'Jira', 'TestRail', 'Cypress'], exp: 3, headline: 'QA Specialist' },
  { name: 'Quentin Tarantino', skills: ['AWS', 'GCP', 'Terraform', 'Ansible'], exp: 8, headline: 'Cloud Infrastructure Lead' },
  { name: 'Rachel Green', skills: ['React', 'Node.js', 'TailwindCSS', 'MongoDB'], exp: 4, headline: 'Full Stack Developer' },
  { name: 'Steve Harrington', skills: ['TypeScript', 'Angular', 'RxJS', 'SCSS'], exp: 5, headline: 'Senior Frontend Engineer' },
  { name: 'Tony Stark', skills: ['Python', 'Node.js', 'C++', 'System Architecture'], exp: 10, headline: 'Principal Architect & Full Stack' },
  { name: 'Uma Thurman', skills: ['R', 'Python', 'Tableau', 'Statistical Analysis'], exp: 4, headline: 'Quantitative Data Analyst' },
  { name: 'Victor Vance', skills: ['Selenium', 'Python', 'Performance Testing', 'JMeter'], exp: 5, headline: 'Senior QA Engineer' },
  { name: 'Wanda Maximoff', skills: ['Kubernetes', 'Docker', 'Helm', 'ArgoCD'], exp: 6, headline: 'Site Reliability & DevOps Engineer' },
  { name: 'Xavier Woods', skills: ['React', 'Node.js', 'Express', 'PostgreSQL'], exp: 3, headline: 'Full Stack Associate' },
  { name: 'Yvonne Strahovski', skills: ['React Native', 'React', 'TypeScript', 'Redux'], exp: 5, headline: 'Mobile & Frontend Developer' }
];

export const seedDatabase = async () => {
  console.log('--- Starting HireFlow Database Seed ---');
  await connectDB();

  // Ensure uploads directory exists
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  // Clear existing data
  console.log('Clearing existing collections...');
  await Promise.all([
    User.deleteMany({}),
    Company.deleteMany({}),
    Job.deleteMany({}),
    CandidateProfile.deleteMany({}),
    Resume.deleteMany({}),
    Application.deleteMany({}),
    AuditLog.deleteMany({})
  ]);

  // Clean old generated resumes
  const existingFiles = fs.readdirSync(UPLOAD_DIR);
  for (const file of existingFiles) {
    if (file.startsWith('seed_')) {
      try {
        fs.unlinkSync(path.join(UPLOAD_DIR, file));
      } catch (e) {
        // ignore
      }
    }
  }

  // 1. Create Admin
  console.log('Creating Admin user (admin@hireflow.test)...');
  const adminPasswordHash = await bcrypt.hash('Admin@123', 10);
  const adminUser = await User.create({
    name: 'HireFlow Administrator',
    email: 'admin@hireflow.test',
    passwordHash: adminPasswordHash,
    role: 'admin',
    isActive: true
  });

  // 2. Create Recruiter and Company
  console.log('Creating Recruiter (recruiter@hireflow.test) with Acme Tech...');
  const recruiterPasswordHash = await bcrypt.hash('Recruiter@123', 10);
  const recruiterUser = new User({
    name: 'Sarah Connor',
    email: 'recruiter@hireflow.test',
    passwordHash: recruiterPasswordHash,
    role: 'recruiter',
    isActive: true
  });

  const acmeCompany = await Company.create({
    name: 'Acme Tech',
    website: 'https://acmetech.example.com',
    description: 'Pioneering next-generation cloud infrastructure and engineering solutions.',
    owner: recruiterUser._id
  });

  recruiterUser.company = acmeCompany._id;
  await recruiterUser.save();

  // 3. Create 6 Jobs
  console.log('Creating 6 Jobs (4 published, 1 draft, 1 closed)...');
  const now = new Date();
  const jobsData = [
    {
      title: 'Senior Full Stack Developer',
      department: 'Engineering',
      location: 'San Francisco, CA',
      employmentType: 'full-time',
      workMode: 'hybrid',
      openings: 3,
      experienceMin: 4,
      experienceMax: 8,
      description: 'Join Acme Tech to build high-performance web applications using modern JavaScript, React, and Node.js. You will lead system architecture and mentor junior teammates.',
      requiredSkills: ['React', 'Node.js', 'MongoDB', 'TypeScript'],
      preferredSkills: ['TailwindCSS', 'Docker', 'Redis'],
      status: 'published',
      publishedAt: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000),
      scoringWeights: { skills: 35, experience: 25, projects: 20, education: 10, roleAlignment: 10 }
    },
    {
      title: 'Frontend Engineer (React)',
      department: 'Product Engineering',
      location: 'Remote',
      employmentType: 'full-time',
      workMode: 'remote',
      openings: 2,
      experienceMin: 3,
      experienceMax: 6,
      description: 'Craft stunning, responsive user interfaces and exceptional web experiences. You will collaborate closely with UI/UX designers and translate Figma mocks into production code.',
      requiredSkills: ['React', 'JavaScript', 'CSS3', 'TailwindCSS'],
      preferredSkills: ['Next.js', 'Redux', 'Figma'],
      status: 'published',
      publishedAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
      scoringWeights: { skills: 40, experience: 20, projects: 25, education: 10, roleAlignment: 5 }
    },
    {
      title: 'Backend Systems Engineer',
      department: 'Platform',
      location: 'New York, NY',
      employmentType: 'full-time',
      workMode: 'hybrid',
      openings: 2,
      experienceMin: 4,
      experienceMax: 9,
      description: 'Design robust APIs, data pipelines, and microservices powering Acme Tech core platforms. Optimize database schemas and manage asynchronous workers.',
      requiredSkills: ['Node.js', 'Express', 'MongoDB', 'PostgreSQL'],
      preferredSkills: ['Go', 'Microservices', 'Docker'],
      status: 'published',
      publishedAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
      scoringWeights: { skills: 30, experience: 30, projects: 20, education: 10, roleAlignment: 10 }
    },
    {
      title: 'Data Analyst',
      department: 'Analytics & BI',
      location: 'Austin, TX',
      employmentType: 'full-time',
      workMode: 'remote',
      openings: 1,
      experienceMin: 2,
      experienceMax: 5,
      description: 'Transform complex user datasets into actionable business intelligence. Build real-time dashboards and conduct exploratory statistical data analysis.',
      requiredSkills: ['SQL', 'Python', 'Tableau'],
      preferredSkills: ['Pandas', 'PowerBI', 'Data Modeling'],
      status: 'published',
      publishedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      scoringWeights: { skills: 30, experience: 20, projects: 20, education: 20, roleAlignment: 10 }
    },
    {
      title: 'QA Automation Engineer',
      department: 'Quality Engineering',
      location: 'Remote',
      employmentType: 'contract',
      workMode: 'remote',
      openings: 1,
      experienceMin: 3,
      experienceMax: 6,
      description: 'Build automated end-to-end testing suites using Cypress and Playwright to guarantee bug-free releases for Acme Tech products.',
      requiredSkills: ['Cypress', 'Selenium', 'Jest', 'Automation Testing'],
      preferredSkills: ['Playwright', 'Postman'],
      status: 'draft',
      publishedAt: null,
      scoringWeights: { skills: 35, experience: 25, projects: 20, education: 10, roleAlignment: 10 }
    },
    {
      title: 'Staff DevOps Engineer',
      department: 'Infrastructure',
      location: 'Seattle, WA',
      employmentType: 'full-time',
      workMode: 'onsite',
      openings: 1,
      experienceMin: 6,
      experienceMax: 12,
      description: 'Oversee Kubernetes clusters, Terraform infrastructure, and continuous integration workflows. (Position successfully filled).',
      requiredSkills: ['AWS', 'Kubernetes', 'Terraform', 'CI/CD'],
      preferredSkills: ['Linux', 'Prometheus'],
      status: 'closed',
      publishedAt: new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000),
      closesAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      scoringWeights: { skills: 30, experience: 35, projects: 15, education: 10, roleAlignment: 10 }
    }
  ];

  const createdJobs = [];
  for (const jd of jobsData) {
    const job = await Job.create({
      ...jd,
      company: acmeCompany._id,
      createdBy: recruiterUser._id
    });
    createdJobs.push(job);
  }

  // 4. Create 25 Candidates with Profiles and PDF Resumes
  console.log('Creating 25 Candidates with realistic profiles and PDF resumes...');
  const candidatePasswordHash = await bcrypt.hash('Candidate@123', 10);
  const createdCandidates = [];
  const createdResumes = [];

  for (let i = 0; i < candidateSeedData.length; i++) {
    const cand = candidateSeedData[i];
    const email = `candidate${i + 1}@hireflow.test`;

    const user = await User.create({
      name: cand.name,
      email,
      passwordHash: candidatePasswordHash,
      role: 'candidate',
      isActive: true
    });

    // Profile
    await CandidateProfile.create({
      user: user._id,
      phone: `+1 (555) 010-${String(i + 1).padStart(4, '0')}`,
      headline: cand.headline,
      location: 'San Francisco, CA',
      totalExperienceYears: cand.exp,
      skills: cand.skills,
      education: [
        {
          degree: 'B.S. in Computer Science',
          institution: 'State University',
          year: 2020 - Math.max(0, cand.exp - 4)
        }
      ],
      projects: [
        {
          title: `${cand.name.split(' ')[0]} Analytics Platform`,
          description: 'A cloud-native data processing tool designed with event-driven architecture.',
          techStack: cand.skills.slice(0, 3)
        }
      ],
      links: {
        linkedin: `https://linkedin.com/in/${cand.name.toLowerCase().replace(/\s+/g, '')}`,
        github: `https://github.com/${cand.name.toLowerCase().replace(/\s+/g, '')}`,
        portfolio: `https://${cand.name.toLowerCase().replace(/\s+/g, '')}.dev`
      }
    });

    // Generate Dummy PDF
    const storedName = `seed_resume_${i + 1}_${crypto.randomUUID()}.pdf`;
    const originalName = `${cand.name.replace(/\s+/g, '_')}_Resume.pdf`;
    await generateDummyPdf(cand.name, cand.headline, cand.skills, cand.exp, storedName);

    const pdfStats = fs.statSync(path.join(UPLOAD_DIR, storedName));

    const resume = await Resume.create({
      candidate: user._id,
      originalName,
      storedName,
      mimeType: 'application/pdf',
      size: pdfStats.size,
      uploadedAt: new Date(now.getTime() - (28 - i) * 24 * 60 * 60 * 1000)
    });

    createdCandidates.push(user);
    createdResumes.push(resume);
  }

  // 5. Create ~60 Applications spread across stages and jobs
  console.log('Creating ~60 Applications spread across stages with 30-day stage histories...');
  const publishedJobs = createdJobs.filter((j) => j.status === 'published');
  let applicationCount = 0;

  // Distribute applications: each candidate applies to 2 or 3 published jobs
  for (let cIdx = 0; cIdx < createdCandidates.length; cIdx++) {
    const candidate = createdCandidates[cIdx];
    const resume = createdResumes[cIdx];

    // Pick 2 or 3 distinct jobs for this candidate
    const numApps = cIdx % 2 === 0 ? 3 : 2;
    const appliedJobs = [];

    for (let k = 0; k < numApps; k++) {
      const job = publishedJobs[(cIdx + k) % publishedJobs.length];
      if (appliedJobs.includes(job._id)) continue;
      appliedJobs.push(job._id);

      // Determine a stage across all available stages
      const stageIndex = (cIdx * 3 + k) % APPLICATION_STAGES.length;
      const targetStage = APPLICATION_STAGES[stageIndex];

      // Build stage history spread across the last 30 days
      const daysAgo = 30 - ((cIdx + k) % 28);
      const appliedAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

      const history = [
        {
          stage: 'applied',
          changedBy: candidate._id,
          at: appliedAt,
          note: 'Application submitted via candidate portal'
        }
      ];

      // If beyond 'applied', add progressive stages
      const targetIdx = APPLICATION_STAGES.indexOf(targetStage);
      for (let s = 1; s <= targetIdx; s++) {
        const histStage = APPLICATION_STAGES[s];
        const stepDays = daysAgo - s * 2;
        const stepAt = new Date(now.getTime() - Math.max(1, stepDays) * 24 * 60 * 60 * 1000);
        history.push({
          stage: histStage,
          changedBy: recruiterUser._id,
          at: stepAt,
          note: `Moved to ${histStage} by talent acquisition team`
        });
      }

      const notes = [];
      if (targetIdx >= 2) {
        notes.push({
          author: recruiterUser._id,
          text: `Reviewed candidate resume. Strong match on technical capabilities.`,
          at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)
        });
      }

      await Application.create({
        job: job._id,
        candidate: candidate._id,
        resume: resume._id,
        coverNote: `I am very enthusiastic about the ${job.title} position at Acme Tech. My background aligns well with your mission!`,
        stage: targetStage,
        stageHistory: history,
        recruiterNotes: notes,
        rejectionReason: targetStage === 'rejected' ? 'Position filled by another qualified candidate' : null,
        createdAt: appliedAt
      });

      applicationCount++;
    }
  }

  // 6. Seed Audit Logs
  console.log('Seeding audit logs...');
  await AuditLog.create([
    {
      actor: adminUser._id,
      action: 'SYSTEM_INITIALIZE',
      entityType: 'System',
      entityId: '0',
      meta: { message: 'HireFlow database initialized with seed records' },
      createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    },
    {
      actor: recruiterUser._id,
      action: 'COMPANY_CREATE',
      entityType: 'Company',
      entityId: String(acmeCompany._id),
      meta: { name: acmeCompany.name },
      createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }
  ]);

  console.log(`--- Seed Complete Successfully! ---`);
  console.log(`Created: 1 Admin, 1 Recruiter (Acme Tech), 25 Candidates, 6 Jobs, ${applicationCount} Applications with PDF Resumes.`);
  await disconnectDB();
};

// Execute if run directly
if (process.argv[1]?.endsWith('seed.js')) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed script failed:', err);
      process.exit(1);
    });
}
