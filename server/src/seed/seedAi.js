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
  Application
} from '../models/index.js';
import { UPLOAD_DIR } from '../middleware/upload.js';

// Helper to generate realistic multi-section PDF resumes
function generateRealisticPdf(candidate, storedFilename) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(UPLOAD_DIR, storedFilename);

    // If candidate has isCorrupt or isBlank flag, create dummy corrupt/blank file
    if (candidate.isBlank) {
      fs.writeFileSync(filePath, '');
      return resolve(filePath);
    }
    if (candidate.isScanned) {
      // Scanned/image-like with almost no text
      fs.writeFileSync(filePath, '%PDF-1.4\n%scanned bitmap container image\n%%EOF');
      return resolve(filePath);
    }

    const doc = new PDFDocument({ margin: 40 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Header
    doc.fontSize(20).fillColor('#1E293B').text(candidate.name, { bold: true });
    doc.fontSize(12).fillColor('#4F46E5').text(candidate.headline || 'Software Engineer');
    doc.fontSize(9).fillColor('#64748B').text(`Email: ${candidate.email} | Phone: +1-555-0199 | Location: San Francisco, CA`);
    doc.moveDown(0.8);

    // Professional Summary
    doc.fontSize(12).fillColor('#0F172A').text('Professional Summary', { underline: true });
    doc.moveDown(0.2);
    doc.fontSize(9.5).fillColor('#334155').text(candidate.summary || 'Results-oriented developer building web applications.');
    doc.moveDown(0.8);

    // Technical Skills
    doc.fontSize(12).fillColor('#0F172A').text('Technical Skills', { underline: true });
    doc.moveDown(0.2);
    const skillsList = Array.isArray(candidate.skills) ? candidate.skills.join(', ') : candidate.skills;
    doc.fontSize(9.5).fillColor('#334155').text(skillsList);
    doc.moveDown(0.8);

    // Work Experience
    doc.fontSize(12).fillColor('#0F172A').text('Work Experience', { underline: true });
    doc.moveDown(0.3);
    (candidate.experience || []).forEach((exp) => {
      doc.fontSize(10.5).fillColor('#1E293B').text(`${exp.title} — ${exp.company}`, { bold: true });
      doc.fontSize(8.5).fillColor('#64748B').text(`${exp.period} | ${exp.duration || ''}`);
      doc.moveDown(0.2);
      (exp.bullets || []).forEach((b) => {
        doc.fontSize(9).fillColor('#334155').text(`• ${b}`);
      });
      doc.moveDown(0.5);
    });

    // Key Projects
    if (candidate.projects && candidate.projects.length > 0) {
      doc.fontSize(12).fillColor('#0F172A').text('Key Projects', { underline: true });
      doc.moveDown(0.3);
      candidate.projects.forEach((proj) => {
        doc.fontSize(10).fillColor('#1E293B').text(proj.title, { bold: true });
        doc.fontSize(8.5).fillColor('#4F46E5').text(`Tech Stack: ${proj.tech}`);
        doc.fontSize(9).fillColor('#334155').text(proj.description);
        doc.moveDown(0.4);
      });
    }

    // Education
    if (candidate.education) {
      doc.fontSize(12).fillColor('#0F172A').text('Education', { underline: true });
      doc.moveDown(0.2);
      doc.fontSize(9.5).fillColor('#334155').text(
        `${candidate.education.degree} in ${candidate.education.field} — ${candidate.education.institution} (${candidate.education.year})`
      );
    }

    doc.end();
    stream.on('finish', () => resolve(filePath));
    stream.on('error', (err) => reject(err));
  });
}

// 40 Realistic Synthetic Candidates
// Mix: ~8 Strong, ~14 Potential, ~18 Weak/Traps
const CANDIDATE_DEFINITIONS = [
  // --- 8 STRONG CANDIDATES (Overall >= 75) ---
  {
    name: 'Marcus Vance',
    email: 'marcus.vance@seeddemo.test',
    headline: 'Senior Full Stack Developer (React & Node.js)',
    summary: 'Experienced Full Stack Engineer with 4 years building high-traffic web applications with React, Node.js, and MongoDB. Specialized in designing resilient REST APIs and microservice architectures with Docker.',
    skills: ['React', 'Node.js', 'MongoDB', 'REST APIs', 'AWS', 'Docker', 'Git', 'Express', 'JavaScript'],
    experience: [
      {
        title: 'Full Stack Engineer',
        company: 'CloudScale Technologies',
        period: '2023-01 to Present',
        duration: '2 years',
        bullets: [
          'Engineered core features for modern React and Node.js web applications serving over 50,000 monthly active users.',
          'Designed high-throughput REST APIs backed by MongoDB document databases and Redis caching layers.',
          'Built microservices containerized with Docker and deployed onto AWS ECS pipelines.'
        ]
      },
      {
        title: 'Software Developer',
        company: 'Nova Digital Agency',
        period: '2021-01 to 2022-12',
        duration: '2 years',
        bullets: [
          'Developed interactive client-side web interfaces using React and modern CSS architecture.',
          'Implemented backend RESTful endpoints in Node.js and Express to process payment gateway transactions.',
          'Maintained Git branching workflows and automated integration testing.'
        ]
      }
    ],
    projects: [
      {
        title: 'E-Commerce Platform',
        tech: 'React, Node.js, MongoDB, REST APIs, Docker',
        description: 'Architected scalable storefront with React frontend and Node.js microservices. Integrated MongoDB transactions and secure REST APIs.'
      },
      {
        title: 'Real-time Workflow Engine',
        tech: 'Node.js, React, WebSocket, AWS',
        description: 'Built team coordination dashboard streaming task updates with sub-second latency across distributed clients.'
      }
    ],
    education: { degree: 'Bachelor of Science', field: 'Computer Science', institution: 'University of Washington', year: 2020 }
  },
  {
    name: 'Elena Rostova',
    email: 'elena.rostova@seeddemo.test',
    headline: 'Full Stack Software Engineer',
    summary: 'Full Stack Engineer with 3.5 years of industry experience creating cloud applications using Node.js, React, and MongoDB. Proven track record in REST API development and continuous deployment with Docker and Git.',
    skills: ['React', 'Node.js', 'MongoDB', 'REST APIs', 'Docker', 'Git', 'JavaScript', 'AWS'],
    experience: [
      {
        title: 'Software Engineer',
        company: 'FinTrack Solutions',
        period: '2022-06 to Present',
        duration: '2.5 years',
        bullets: [
          'Designed performant REST APIs with Node.js and Express for financial data aggregation.',
          'Created modular UI component libraries with React and state management.',
          'Managed MongoDB schema design, indexing, and aggregation pipelines for high query throughput.'
        ]
      },
      {
        title: 'Junior Web Developer',
        company: 'Peak Systems',
        period: '2021-06 to 2022-05',
        duration: '1 year',
        bullets: [
          'Built full stack internal tools using React and Node.js with Git version control.',
          'Authored comprehensive REST API integration tests and documentation.'
        ]
      }
    ],
    projects: [
      {
        title: 'Analytics Portal',
        tech: 'React, Node.js, MongoDB, Docker',
        description: 'Interactive analytics dashboard displaying real-time metrics with custom React charting and Node.js backend.'
      }
    ],
    education: { degree: 'Bachelor of Science', field: 'Software Engineering', institution: 'San Jose State University', year: 2021 }
  },
  {
    name: 'Devon Miller',
    email: 'devon.miller@seeddemo.test',
    headline: 'Full Stack JavaScript Engineer',
    summary: 'Full Stack Developer with 4 years experience specializing in React frontends and Node.js backend services. Extensive experience with MongoDB, REST APIs, AWS deployments, and Git.',
    skills: ['React', 'Node.js', 'MongoDB', 'REST APIs', 'AWS', 'Git', 'Docker'],
    experience: [
      {
        title: 'Full Stack Developer',
        company: 'Apex Health Systems',
        period: '2021-01 to Present',
        duration: '4 years',
        bullets: [
          'Led development of patient onboarding portal built in React and Node.js.',
          'Developed secure REST APIs adhering to HIPAA compliance guidelines.',
          'Optimized MongoDB document queries improving database read speeds by 40%.'
        ]
      }
    ],
    projects: [
      {
        title: 'Telehealth Portal',
        tech: 'React, Node.js, MongoDB, REST APIs',
        description: 'Complete scheduling and video consultation portal with MongoDB backend and React frontend.'
      }
    ],
    education: { degree: 'Bachelor of Science', field: 'Computer Science', institution: 'Georgia Tech', year: 2020 }
  },
  {
    name: 'Priya Sharma',
    email: 'priya.sharma@seeddemo.test',
    headline: 'Senior Full Stack Engineer',
    summary: 'Senior Software Engineer with 4 years hands-on experience in full stack web development using React, Node.js, MongoDB, and REST APIs. Proficient in Docker containerization and AWS infrastructure.',
    skills: ['React', 'Node.js', 'MongoDB', 'REST APIs', 'Docker', 'AWS', 'Git'],
    experience: [
      {
        title: 'Full Stack Developer',
        company: 'HyperFlow Media',
        period: '2021-03 to Present',
        duration: '3.8 years',
        bullets: [
          'Architected high-volume REST APIs in Node.js servicing media assets.',
          'Built responsive single page applications using React and Tailwind.',
          'Containerized application workloads using Docker and configured CI/CD via Git.'
        ]
      }
    ],
    projects: [
      {
        title: 'Content CMS',
        tech: 'React, Node.js, MongoDB, Docker, REST APIs',
        description: 'Headless CMS platform utilizing MongoDB document storage and React management UI.'
      }
    ],
    education: { degree: 'Master of Science', field: 'Computer Science', institution: 'Purdue University', year: 2021 }
  },
  {
    name: 'Julian Hayes',
    email: 'julian.hayes@seeddemo.test',
    headline: 'Full Stack Web Developer',
    summary: 'Product-focused full stack engineer with 3 years building web applications with React, Node.js, and MongoDB. Strong focus on clean REST APIs, test-driven development, and Docker workflows.',
    skills: ['React', 'Node.js', 'MongoDB', 'REST APIs', 'Docker', 'Git'],
    experience: [
      {
        title: 'Full Stack Engineer',
        company: 'Streamline Commerce',
        period: '2022-01 to Present',
        duration: '3 years',
        bullets: [
          'Engineered checkout flows in React with backend Node.js microservices.',
          'Constructed robust REST APIs and integrated MongoDB transactional queries.',
          'Utilized Git for team collaboration and code review workflows.'
        ]
      }
    ],
    projects: [
      {
        title: 'Inventory Sync Service',
        tech: 'Node.js, React, MongoDB, REST APIs',
        description: 'Real-time inventory coordination service handling high concurrency.'
      }
    ],
    education: { degree: 'Bachelor of Science', field: 'Information Technology', institution: 'University of Illinois', year: 2021 }
  },
  {
    name: 'Sophia Chen',
    email: 'sophia.chen@seeddemo.test',
    headline: 'Full Stack Developer (MERN Stack)',
    summary: 'Experienced MERN stack developer with 3.5 years building production applications with React, Node.js, MongoDB, and REST APIs. Well-versed in AWS deployment and Docker environments.',
    skills: ['React', 'Node.js', 'MongoDB', 'REST APIs', 'AWS', 'Docker', 'Git'],
    experience: [
      {
        title: 'MERN Stack Developer',
        company: 'Vanguard Interactive',
        period: '2021-08 to Present',
        duration: '3.3 years',
        bullets: [
          'Developed end-to-end features utilizing React frontend and Node.js backend.',
          'Created REST APIs and managed scalable MongoDB cluster architectures.',
          'Built automated CI/CD deployment pipelines on AWS using Docker containers.'
        ]
      }
    ],
    projects: [
      {
        title: 'SaaS Multi-tenant Portal',
        tech: 'React, Node.js, MongoDB, REST APIs, AWS',
        description: 'Enterprise multi-tenant management portal with automated tenant provisioning.'
      }
    ],
    education: { degree: 'Bachelor of Science', field: 'Computer Science', institution: 'UC Berkeley', year: 2021 }
  },
  {
    name: 'Lucas Wright',
    email: 'lucas.wright@seeddemo.test',
    headline: 'Full Stack Software Engineer',
    summary: 'Full stack engineer with 4 years creating reliable software using React, Node.js, MongoDB, and REST APIs. Extensive experience collaborating with remote teams via Git and Docker.',
    skills: ['React', 'Node.js', 'MongoDB', 'REST APIs', 'Docker', 'Git'],
    experience: [
      {
        title: 'Software Engineer',
        company: 'Nexus Software',
        period: '2021-02 to Present',
        duration: '3.9 years',
        bullets: [
          'Implemented REST APIs and backend business logic using Node.js.',
          'Crafted reusable UI components with React for client dashboards.',
          'Managed MongoDB database models and performance optimization.'
        ]
      }
    ],
    projects: [
      {
        title: 'Collaborative Workspace',
        tech: 'React, Node.js, MongoDB, REST APIs',
        description: 'Interactive team document editor with real-time syncing.'
      }
    ],
    education: { degree: 'Bachelor of Science', field: 'Computer Science', institution: 'University of Texas at Austin', year: 2020 }
  },
  {
    name: 'Ananya Patel',
    email: 'ananya.patel@seeddemo.test',
    headline: 'Full Stack Engineer - React & Node.js',
    summary: 'Full stack developer with 3 years experience delivering scalable web solutions with React, Node.js, MongoDB, and REST APIs. Experience in AWS, Docker, and agile development.',
    skills: ['React', 'Node.js', 'MongoDB', 'REST APIs', 'AWS', 'Docker', 'Git'],
    experience: [
      {
        title: 'Full Stack Developer',
        company: 'Orbit Labs',
        period: '2022-01 to Present',
        duration: '3 years',
        bullets: [
          'Developed responsive React web applications and REST APIs using Node.js.',
          'Maintained high availability MongoDB databases and query performance.',
          'Deployed scalable microservices on AWS utilizing Docker.'
        ]
      }
    ],
    projects: [
      {
        title: 'Supply Chain Tracker',
        tech: 'React, Node.js, MongoDB, REST APIs, Docker',
        description: 'Full stack supply chain tracking platform with live GPS updates.'
      }
    ],
    education: { degree: 'Bachelor of Science', field: 'Computer Science', institution: 'Carnegie Mellon University', year: 2021 }
  },

  // --- 14 POTENTIAL CANDIDATES (Overall 50 - 74) ---
  {
    name: 'Liam O’Connor',
    email: 'liam.oconnor@seeddemo.test',
    headline: 'Frontend-leaning Full Stack Developer',
    summary: 'Web developer with 2.5 years experience strong in React and modern UI engineering, with foundational knowledge of Node.js and REST APIs.',
    skills: ['React', 'JavaScript', 'Node.js', 'REST APIs', 'Git', 'CSS3'],
    experience: [
      {
        title: 'Web Developer',
        company: 'Brite Media',
        period: '2022-06 to Present',
        duration: '2.5 years',
        bullets: [
          'Built interactive front-end web interfaces with React and Redux.',
          'Consumed REST APIs and contributed minor Node.js endpoints.'
        ]
      }
    ],
    projects: [{ title: 'Design System App', tech: 'React, REST APIs', description: 'Component library with interactive preview.' }],
    education: { degree: 'Bachelor of Arts', field: 'Computer Science', institution: 'Boston University', year: 2022 }
  },
  {
    name: 'Chloe Dubois',
    email: 'chloe.dubois@seeddemo.test',
    headline: 'Backend Developer (Node.js & MongoDB)',
    summary: 'Backend software developer with 3 years experience specializing in Node.js, MongoDB, and REST APIs. Basic familiarity with React frontends.',
    skills: ['Node.js', 'MongoDB', 'REST APIs', 'Docker', 'Git', 'Express'],
    experience: [
      {
        title: 'Backend Developer',
        company: 'DataCore Labs',
        period: '2022-01 to Present',
        duration: '3 years',
        bullets: [
          'Designed high-performance REST APIs in Node.js.',
          'Administered MongoDB clusters and data indexing pipelines.'
        ]
      }
    ],
    projects: [{ title: 'RESTful Auth Microservice', tech: 'Node.js, MongoDB, REST APIs', description: 'Authentication service with JWT and MongoDB.' }],
    education: { degree: 'Bachelor of Science', field: 'Computer Engineering', institution: 'McGill University', year: 2021 }
  },
  {
    name: 'Nathaniel Reed',
    email: 'nathaniel.reed@seeddemo.test',
    headline: 'Junior Full Stack Engineer',
    summary: 'Full stack developer with 2 years experience building features in React, Node.js, and MongoDB.',
    skills: ['React', 'Node.js', 'MongoDB', 'REST APIs', 'Git'],
    experience: [
      {
        title: 'Junior Software Engineer',
        company: 'Spark Innovations',
        period: '2023-01 to Present',
        duration: '2 years',
        bullets: [
          'Created UI components with React and implemented REST APIs with Node.js and MongoDB.',
          'Collaborated using Git version control.'
        ]
      }
    ],
    projects: [{ title: 'Bug Tracking Portal', tech: 'React, Node.js, MongoDB', description: 'Internal ticket management tool.' }],
    education: { degree: 'Bachelor of Science', field: 'Computer Science', institution: 'Rutgers University', year: 2022 }
  },
  {
    name: 'Maya Lin',
    email: 'maya.lin@seeddemo.test',
    headline: 'Full Stack Engineer (Vue & Node.js)',
    summary: 'Software developer with 3 years experience building web apps with Vue, Node.js, and MongoDB. Learning React.',
    skills: ['Vue.js', 'Node.js', 'MongoDB', 'REST APIs', 'Git', 'JavaScript'],
    experience: [
      {
        title: 'Web Engineer',
        company: 'Clearview Media',
        period: '2022-01 to Present',
        duration: '3 years',
        bullets: [
          'Engineered REST APIs using Node.js and managed MongoDB document storage.',
          'Built interactive user dashboards with Vue.js.'
        ]
      }
    ],
    projects: [{ title: 'Event Planner', tech: 'Node.js, MongoDB, REST APIs', description: 'Booking engine with REST APIs.' }],
    education: { degree: 'Bachelor of Science', field: 'Information Systems', institution: 'UW Madison', year: 2021 }
  },
  {
    name: 'Owen Fletcher',
    email: 'owen.fletcher@seeddemo.test',
    headline: 'Full Stack Developer',
    summary: 'Full stack engineer with 2.2 years experience with React, Node.js, and REST APIs, primarily utilizing PostgreSQL.',
    skills: ['React', 'Node.js', 'REST APIs', 'PostgreSQL', 'Docker', 'Git'],
    experience: [
      {
        title: 'Software Developer',
        company: 'BlueWave Digital',
        period: '2022-10 to Present',
        duration: '2.2 years',
        bullets: [
          'Developed web applications using React and Node.js with REST APIs.',
          'Maintained PostgreSQL relational databases.'
        ]
      }
    ],
    projects: [{ title: 'CRM Tool', tech: 'React, Node.js, REST APIs', description: 'Lead tracking system.' }],
    education: { degree: 'Bachelor of Science', field: 'Computer Science', institution: 'Ohio State University', year: 2022 }
  },
  {
    name: 'Aisha Al-Mansoor',
    email: 'aisha.almansoor@seeddemo.test',
    headline: 'Full Stack Web Developer',
    summary: 'Full stack engineer with 2.5 years experience in React, Node.js, MongoDB, and REST APIs. Experience in AWS cloud.',
    skills: ['React', 'Node.js', 'MongoDB', 'REST APIs', 'AWS', 'Git'],
    experience: [
      {
        title: 'Associate Engineer',
        company: 'Crestline Tech',
        period: '2022-07 to Present',
        duration: '2.5 years',
        bullets: [
          'Developed REST APIs in Node.js and client interfaces in React.',
          'Integrated MongoDB collections for user profiles.'
        ]
      }
    ],
    projects: [{ title: 'Social Connect', tech: 'React, Node.js, MongoDB', description: 'Social platform for creators.' }],
    education: { degree: 'Bachelor of Science', field: 'Software Engineering', institution: 'Arizona State University', year: 2022 }
  },
  {
    name: 'Brandon Cole',
    email: 'brandon.cole@seeddemo.test',
    headline: 'Full Stack Engineer',
    summary: 'Developer with 2.5 years experience working with Node.js, React, REST APIs, and Docker.',
    skills: ['React', 'Node.js', 'REST APIs', 'Docker', 'Git', 'JavaScript'],
    experience: [
      {
        title: 'Junior Developer',
        company: 'Krypton Interactive',
        period: '2022-06 to Present',
        duration: '2.5 years',
        bullets: [
          'Maintained REST APIs built with Node.js.',
          'Built UI screens with React.'
        ]
      }
    ],
    projects: [{ title: 'Order Manager', tech: 'React, Node.js, REST APIs', description: 'Order processing app.' }],
    education: { degree: 'Bachelor of Science', field: 'Computer Science', institution: 'CU Boulder', year: 2022 }
  },
  {
    name: 'Grace Hopper-Smith',
    email: 'grace.smith@seeddemo.test',
    headline: 'Full Stack Software Engineer',
    summary: 'Full stack engineer with 3 years building web platforms with React and Node.js. Familiar with REST APIs and MongoDB.',
    skills: ['React', 'Node.js', 'REST APIs', 'MongoDB', 'Git'],
    experience: [
      {
        title: 'Software Developer',
        company: 'Quantum Systems',
        period: '2022-01 to Present',
        duration: '3 years',
        bullets: [
          'Engineered web screens with React and connected to Node.js REST APIs.',
          'Created data models in MongoDB.'
        ]
      }
    ],
    projects: [{ title: 'Survey Engine', tech: 'React, Node.js, MongoDB', description: 'Data gathering app.' }],
    education: { degree: 'Bachelor of Science', field: 'Mathematics & Computer Science', institution: 'UCLA', year: 2021 }
  },
  {
    name: 'Derek Snyder',
    email: 'derek.snyder@seeddemo.test',
    headline: 'Software Engineer - Full Stack',
    summary: 'Engineer with 2.5 years experience developing with Node.js, MongoDB, React, and Git.',
    skills: ['Node.js', 'React', 'MongoDB', 'REST APIs', 'Git'],
    experience: [
      {
        title: 'Full Stack Developer',
        company: 'Veritas Tech',
        period: '2022-08 to Present',
        duration: '2.4 years',
        bullets: [
          'Built REST APIs with Node.js and MongoDB.',
          'Collaborated on React frontend modules.'
        ]
      }
    ],
    projects: [{ title: 'Asset Manager', tech: 'React, Node.js, MongoDB', description: 'Asset tagging system.' }],
    education: { degree: 'Bachelor of Science', field: 'Computer Science', institution: 'Texas A&M', year: 2022 }
  },
  {
    name: 'Fatima Zahra',
    email: 'fatima.zahra@seeddemo.test',
    headline: 'Full Stack JavaScript Developer',
    summary: 'Developer with 2.8 years experience in React, Node.js, REST APIs, and Docker.',
    skills: ['React', 'Node.js', 'REST APIs', 'Docker', 'Git'],
    experience: [
      {
        title: 'Web Developer',
        company: 'Synapse Media',
        period: '2022-03 to Present',
        duration: '2.8 years',
        bullets: [
          'Constructed React components and backend Node.js REST APIs.',
          'Configured Docker development environments.'
        ]
      }
    ],
    projects: [{ title: 'Quiz Application', tech: 'React, Node.js, REST APIs', description: 'Interactive quiz service.' }],
    education: { degree: 'Bachelor of Science', field: 'Software Engineering', institution: 'University of Florida', year: 2021 }
  },
  {
    name: 'Zachary Taylor',
    email: 'zachary.taylor@seeddemo.test',
    headline: 'MERN Stack Developer',
    summary: 'Developer with 2.2 years experience using React, Node.js, MongoDB, and REST APIs.',
    skills: ['React', 'Node.js', 'MongoDB', 'REST APIs', 'Git'],
    experience: [
      {
        title: 'Junior Developer',
        company: 'Echo Dynamics',
        period: '2022-10 to Present',
        duration: '2.2 years',
        bullets: [
          'Assisted with React UI features and Node.js REST APIs with MongoDB.'
        ]
      }
    ],
    projects: [{ title: 'Blog Engine', tech: 'React, Node.js, MongoDB', description: 'Content publishing tool.' }],
    education: { degree: 'Bachelor of Science', field: 'Computer Science', institution: 'Virginia Tech', year: 2022 }
  },
  {
    name: 'Kimberly Adams',
    email: 'kimberly.adams@seeddemo.test',
    headline: 'Full Stack Engineer',
    summary: 'Engineer with 3 years experience with Node.js and React web applications, working with REST APIs.',
    skills: ['React', 'Node.js', 'REST APIs', 'Git', 'MongoDB'],
    experience: [
      {
        title: 'Full Stack Developer',
        company: 'Veloce Digital',
        period: '2022-01 to Present',
        duration: '3 years',
        bullets: [
          'Created REST APIs in Node.js and integrated with MongoDB.',
          'Built web interfaces with React.'
        ]
      }
    ],
    projects: [{ title: 'Recipe Share', tech: 'React, Node.js, MongoDB', description: 'Recipe sharing platform.' }],
    education: { degree: 'Bachelor of Science', field: 'Information Technology', institution: 'Penn State', year: 2021 }
  },
  {
    name: 'Leo Maxwell',
    email: 'leo.maxwell@seeddemo.test',
    headline: 'Full Stack Developer',
    summary: 'Web developer with 2.5 years experience with React, Node.js, MongoDB, and Git.',
    skills: ['React', 'Node.js', 'MongoDB', 'REST APIs', 'Git'],
    experience: [
      {
        title: 'Web Developer',
        company: 'Terraform Labs Inc',
        period: '2022-07 to Present',
        duration: '2.5 years',
        bullets: [
          'Built user interfaces in React and backend services in Node.js.',
          'Integrated REST APIs with MongoDB.'
        ]
      }
    ],
    projects: [{ title: 'Fleet Tracking', tech: 'React, Node.js, MongoDB', description: 'Vehicle telemetry dashboard.' }],
    education: { degree: 'Bachelor of Science', field: 'Computer Science', institution: 'University of Utah', year: 2022 }
  },
  {
    name: 'Samantha Fox',
    email: 'samantha.fox@seeddemo.test',
    headline: 'Full Stack Developer',
    summary: 'Software developer with 2.6 years developing full stack apps with React, Node.js, and MongoDB.',
    skills: ['React', 'Node.js', 'MongoDB', 'REST APIs', 'Git'],
    experience: [
      {
        title: 'Software Developer',
        company: 'Zenith Tech',
        period: '2022-05 to Present',
        duration: '2.6 years',
        bullets: [
          'Built REST APIs in Node.js and user interfaces in React.',
          'Utilized MongoDB document storage.'
        ]
      }
    ],
    projects: [{ title: 'Invoice Creator', tech: 'React, Node.js, REST APIs', description: 'PDF invoice generating tool.' }],
    education: { degree: 'Bachelor of Science', field: 'Computer Science', institution: 'University of Minnesota', year: 2022 }
  },

  // --- 18 WEAK / OFF-PROFILE & DELIBERATE TRAPS ---
  // TRAP 1: Phrasing variants ("server-side JavaScript", "modern frontend frameworks")
  {
    name: 'Jordan Thorne',
    email: 'jordan.thorne@seeddemo.test',
    headline: 'Full Stack JavaScript Specialist',
    summary: 'Senior JavaScript developer with 3.5 years experience utilizing server-side JavaScript to engineer high-throughput web applications and modern frontend frameworks for enterprise users.',
    skills: ['server-side JavaScript', 'modern frontend frameworks', 'document database', 'RESTful services', 'Git'],
    experience: [
      {
        title: 'JavaScript Engineer',
        company: 'Omni Digital',
        period: '2021-06 to Present',
        duration: '3.5 years',
        bullets: [
          'Engineered resilient services utilizing server-side JavaScript and Express runtime.',
          'Implemented user interfaces with modern frontend frameworks and component state engines.',
          'Interfaced with document database storage and authored RESTful services with Git.'
        ]
      }
    ],
    projects: [{ title: 'Enterprise Portal', tech: 'server-side JavaScript, modern frontend frameworks', description: 'Document processing tool.' }],
    education: { degree: 'Bachelor of Science', field: 'Computer Science', institution: 'NYU', year: 2021 }
  },

  // TRAP 2: 5 years experience in completely irrelevant domain (Sales / Civil Engineering)
  {
    name: 'Arthur Pendelton',
    email: 'arthur.pendelton@seeddemo.test',
    headline: 'Senior Sales Account Executive',
    summary: 'Accomplished enterprise sales leader with 5 years experience managing Fortune 500 client accounts, exceeding revenue targets, and leading cross-functional enterprise sales teams.',
    skills: ['Enterprise Sales', 'CRM', 'Cold Calling', 'Negotiation', 'Revenue Growth', 'Salesforce'],
    experience: [
      {
        title: 'Senior Account Executive',
        company: 'Global Enterprise Sales',
        period: '2020-01 to Present',
        duration: '5 years',
        bullets: [
          'Generated $4.2M in annual recurring contract revenue through outbound business development.',
          'Trained and managed a team of 8 junior sales account representatives.',
          'Negotiated enterprise licensing contracts with C-level stakeholders.'
        ]
      }
    ],
    projects: [{ title: 'Quarterly Sales Pipeline Revamp', tech: 'Salesforce, Excel', description: 'Streamlined enterprise deal tracking.' }],
    education: { degree: 'Bachelor of Arts', field: 'Business Administration', institution: 'University of Miami', year: 2019 }
  },

  // TRAP 3: 5 years in Civil Structural Engineering
  {
    name: 'Beatrice Callahan',
    email: 'beatrice.callahan@seeddemo.test',
    headline: 'Senior Structural Civil Engineer',
    summary: 'Professional civil engineer with 5 years experience in commercial structural analysis, concrete modeling, seismic retrofitting, and municipal building codes.',
    skills: ['AutoCAD', 'Revit', 'Structural Analysis', 'Civil Engineering', 'Concrete Design', 'Building Codes'],
    experience: [
      {
        title: 'Senior Structural Engineer',
        company: 'Bridgeport Engineering',
        period: '2020-01 to Present',
        duration: '5 years',
        bullets: [
          'Calculated beam load limits and seismic tolerances for 12 commercial developments.',
          'Inspected construction sites ensuring strict municipal code compliance.',
          'Authored environmental impact assessments and geotechnical evaluations.'
        ]
      }
    ],
    projects: [{ title: 'Harbor Bridge Retrofit', tech: 'AutoCAD, Structural Modeling', description: 'Seismic reinforcement project.' }],
    education: { degree: 'Bachelor of Science', field: 'Civil Engineering', institution: 'Texas Tech', year: 2019 }
  },

  // TRAP 4: Low experience (1 year) with 4 strong full-stack projects
  {
    name: 'Caleb Evans',
    email: 'caleb.evans@seeddemo.test',
    headline: 'Junior Developer & Hackathon Winner',
    summary: 'Ambitious developer with 1 year professional experience but creator of 4 substantial full-stack production projects utilizing React, Node.js, and MongoDB.',
    skills: ['React', 'Node.js', 'MongoDB', 'REST APIs', 'Git'],
    experience: [
      {
        title: 'Junior Web Intern',
        company: 'Alpha Tech',
        period: '2024-01 to Present',
        duration: '1 year',
        bullets: [
          'Assisted senior engineers with React components and Node.js bug fixes.',
          'Maintained documentation for REST APIs.'
        ]
      }
    ],
    projects: [
      { title: 'Fullstack Social Network', tech: 'React, Node.js, MongoDB', description: 'Full featured social app with real-time comments.' },
      { title: 'Cryptocurrency Tracker', tech: 'React, Node.js, REST APIs', description: 'Live crypto pricing with automated trade alerts.' },
      { title: 'Collaborative Canvas', tech: 'React, WebSocket, Node.js', description: 'Multiplayer whiteboarding tool.' },
      { title: 'Markdown Wiki Engine', tech: 'Node.js, MongoDB, React', description: 'Static site generator and document knowledgebase.' }
    ],
    education: { degree: 'Bachelor of Science', field: 'Computer Science', institution: 'UC Irvine', year: 2023 }
  },

  // TRAP 5: Claimed skills with no supporting experience (listed in skills, but work history only PHP/WordPress)
  {
    name: 'Dominic Sterling',
    email: 'dominic.sterling@seeddemo.test',
    headline: 'Web Developer',
    summary: 'Web developer with 4 years experience creating websites and content management systems. Lists modern web stack but history is WordPress.',
    skills: ['React', 'Node.js', 'MongoDB', 'REST APIs', 'PHP', 'WordPress', 'MySQL'],
    experience: [
      {
        title: 'WordPress Webmaster',
        company: 'Legacy Site Studio',
        period: '2021-01 to Present',
        duration: '4 years',
        bullets: [
          'Installed and configured WordPress themes and WooCommerce plugins.',
          'Customized PHP templates and MySQL database tables for local retail stores.',
          'Handled client cPanel hosting setup and domain DNS management.'
        ]
      }
    ],
    projects: [{ title: 'Bakery E-Commerce', tech: 'WordPress, WooCommerce, PHP', description: 'Online pastry ordering store.' }],
    education: { degree: 'Bachelor of Arts', field: 'Communications', institution: 'Ball State University', year: 2020 }
  },

  // TRAP 6: Missing a MUST-HAVE (Has React, MongoDB, REST APIs, Docker, but ZERO Node.js)
  {
    name: 'Emily Thornton',
    email: 'emily.thornton@seeddemo.test',
    headline: 'Python Full Stack Engineer',
    summary: 'Full stack engineer with 3.5 years experience building React frontends connected to Python Django and FastAPI backends with MongoDB and Docker.',
    skills: ['React', 'Python', 'Django', 'FastAPI', 'MongoDB', 'REST APIs', 'Docker', 'Git'],
    experience: [
      {
        title: 'Python Web Developer',
        company: 'DataStream Systems',
        period: '2021-08 to Present',
        duration: '3.5 years',
        bullets: [
          'Built dynamic single-page applications using React.',
          'Developed REST APIs using Python FastAPI and Django REST Framework.',
          'Interfaced with MongoDB document databases and deployed via Docker.'
        ]
      }
    ],
    projects: [{ title: 'ML Prediction Dashboard', tech: 'React, Python, MongoDB, Docker', description: 'Predictive analytics interface.' }],
    education: { degree: 'Bachelor of Science', field: 'Computer Science', institution: 'University of Washington', year: 2021 }
  },

  // TRAP 7: Missing another MUST-HAVE (Has Node.js, MongoDB, REST APIs, but ZERO React - only Angular)
  {
    name: 'Frank Kowalski',
    email: 'frank.kowalski@seeddemo.test',
    headline: 'Angular & Node.js Developer',
    summary: 'Software developer with 3.5 years experience with Node.js backend development, MongoDB, and Angular single page applications.',
    skills: ['Angular', 'TypeScript', 'Node.js', 'MongoDB', 'REST APIs', 'Git'],
    experience: [
      {
        title: 'Web Application Developer',
        company: 'Matrix Solutions',
        period: '2021-06 to Present',
        duration: '3.5 years',
        bullets: [
          'Architected REST APIs in Node.js for manufacturing tracking systems.',
          'Created single page applications with Angular and TypeScript.',
          'Maintained MongoDB databases.'
        ]
      }
    ],
    projects: [{ title: 'Factory Floor Monitor', tech: 'Angular, Node.js, MongoDB', description: 'Assembly line tracker.' }],
    education: { degree: 'Bachelor of Science', field: 'Computer Science', institution: 'Purdue University', year: 2021 }
  },

  // TRAP 8: Blank or unsupported/scanned file (tests parse failure)
  {
    name: 'Gabriella Blank',
    email: 'gabriella.blank@seeddemo.test',
    headline: 'Applicant with Scanned Document',
    isBlank: true,
    skills: [],
    experience: [],
    education: null
  },

  // TRAP 9: Image-like scanned container with < 20 bytes
  {
    name: 'Henry Scanned',
    email: 'henry.scanned@seeddemo.test',
    headline: 'Applicant with Unreadable Scan',
    isScanned: true,
    skills: [],
    experience: [],
    education: null
  },

  // Additional Weak / Mismatched Candidates (10-18):
  {
    name: 'Isabella Rossi',
    email: 'isabella.rossi@seeddemo.test',
    headline: 'Graphic & UI Designer',
    summary: 'Creative graphic designer with 3 years crafting Figma mockups, brand assets, and marketing flyers.',
    skills: ['Figma', 'Adobe Photoshop', 'Illustrator', 'InDesign', 'Typography', 'Branding'],
    experience: [{ title: 'UI Designer', company: 'Studio Creatif', period: '2022-01 to Present', duration: '3 years', bullets: ['Designed logos, marketing banners, and website prototypes.'] }],
    education: { degree: 'Bachelor of Fine Arts', field: 'Graphic Design', institution: 'Pratt Institute', year: 2021 }
  },
  {
    name: 'Jason Bourne-Lee',
    email: 'jason.lee@seeddemo.test',
    headline: 'Network Security Administrator',
    summary: 'IT security administrator with 4 years managing Cisco firewalls, VPN configurations, and intrusion detection.',
    skills: ['Cisco iOS', 'Wireshark', 'Network Firewalls', 'Active Directory', 'Cybersecurity', 'TCP/IP'],
    experience: [{ title: 'Security Admin', company: 'CyberGuard Systems', period: '2021-01 to Present', duration: '4 years', bullets: ['Configured VPN access and analyzed network packet captures.'] }],
    education: { degree: 'Bachelor of Science', field: 'Cybersecurity', institution: 'George Mason University', year: 2020 }
  },
  {
    name: 'Kendra Washington',
    email: 'kendra.washington@seeddemo.test',
    headline: 'Data Entry & Administrative Assistant',
    summary: 'Administrative coordinator with 4 years experience managing office records, Microsoft Excel spreadsheets, and scheduling.',
    skills: ['Microsoft Office', 'Excel', 'Typing', 'Scheduling', 'Customer Service', 'Data Entry'],
    experience: [{ title: 'Office Assistant', company: 'Premier Logistics', period: '2021-01 to Present', duration: '4 years', bullets: ['Maintained corporate filing system and updated customer records.'] }],
    education: { degree: 'Associate Degree', field: 'Business Administration', institution: 'Community College', year: 2020 }
  },
  {
    name: 'Logan Peterson',
    email: 'logan.peterson@seeddemo.test',
    headline: 'Content Writer & SEO Specialist',
    summary: 'Digital copywriter with 3 years producing SEO articles, blog posts, and marketing email newsletters.',
    skills: ['Content Writing', 'SEO', 'Copywriting', 'WordPress', 'Google Analytics', 'Blogging'],
    experience: [{ title: 'Content Strategist', company: 'BuzzPulse Media', period: '2022-01 to Present', duration: '3 years', bullets: ['Authored 100+ high-traffic articles targeting search queries.'] }],
    education: { degree: 'Bachelor of Arts', field: 'English Literature', institution: 'Georgetown University', year: 2021 }
  },
  {
    name: 'Monica Geller-Bing',
    email: 'monica.geller@seeddemo.test',
    headline: 'Executive Chef & Kitchen Manager',
    summary: 'Professional head chef with 6 years leading commercial restaurant kitchens, inventory management, and fine dining.',
    skills: ['Culinary Arts', 'Menu Engineering', 'Kitchen Safety', 'Food Costing', 'Inventory Control'],
    experience: [{ title: 'Executive Chef', company: 'Javitz Bistro', period: '2019-01 to Present', duration: '6 years', bullets: ['Managed kitchen staff of 15 and curated seasonal dinner menus.'] }],
    education: { degree: 'Associate Degree', field: 'Culinary Arts', institution: 'Culinary Institute of America', year: 2018 }
  },
  {
    name: 'Nolan Armstrong',
    email: 'nolan.armstrong@seeddemo.test',
    headline: 'Embedded Firmware Engineer',
    summary: 'Hardware firmware developer with 3.5 years writing low-level C and C++ for microcontrollers and automotive sensors.',
    skills: ['Embedded C', 'C++', 'RTOS', 'ARM Cortex', 'UART', 'Microcontrollers'],
    experience: [{ title: 'Firmware Engineer', company: 'MicroDrive Auto', period: '2021-06 to Present', duration: '3.5 years', bullets: ['Programmed CAN bus drivers and tested RTOS sensor feedback loops.'] }],
    education: { degree: 'Bachelor of Science', field: 'Electrical Engineering', institution: 'Michigan Tech', year: 2021 }
  },
  {
    name: 'Olivia Wilde-Hart',
    email: 'olivia.hart@seeddemo.test',
    headline: 'Customer Support Representative',
    summary: 'Dedicated support specialist with 3 years managing Zendesk tickets, live chat inquiries, and phone support.',
    skills: ['Zendesk', 'Customer Support', 'Conflict Resolution', 'Intercom', 'Ticketing Systems'],
    experience: [{ title: 'Support Specialist', company: 'SaaS Helpdesk Inc', period: '2022-01 to Present', duration: '3 years', bullets: ['Resolved over 12,000 customer tickets with 98% satisfaction rating.'] }],
    education: { degree: 'Bachelor of Arts', field: 'Sociology', institution: 'San Diego State', year: 2021 }
  },
  {
    name: 'Patrick Stewart-Shaw',
    email: 'patrick.shaw@seeddemo.test',
    headline: 'Mechanical CAD Designer',
    summary: 'Mechanical designer with 4 years creating SolidWorks models, sheet metal layouts, and CNC machine tool paths.',
    skills: ['SolidWorks', 'Mechanical Engineering', 'CNC Machining', 'Sheet Metal', 'GD&T', 'AutoCAD'],
    experience: [{ title: 'Mechanical Designer', company: 'Precision Fab', period: '2021-01 to Present', duration: '4 years', bullets: ['Drafted 3D CAD assemblies for industrial pump housings.'] }],
    education: { degree: 'Bachelor of Science', field: 'Mechanical Engineering', institution: 'Iowa State', year: 2020 }
  },
  {
    name: 'Quinn Roberts',
    email: 'quinn.roberts@seeddemo.test',
    headline: 'Recruiter & HR Coordinator',
    summary: 'Corporate recruiter with 3.5 years screening candidates, coordinating interview schedules, and administering payroll.',
    skills: ['Technical Recruiting', 'HR Operations', 'LinkedIn Recruiter', 'Greenhouse', 'Onboarding'],
    experience: [{ title: 'Talent Sourcer', company: 'HireTalent Agency', period: '2021-08 to Present', duration: '3.5 years', bullets: ['Sourced candidates across engineering and sales divisions.'] }],
    education: { degree: 'Bachelor of Science', field: 'Human Resources', institution: 'Cornell University', year: 2021 }
  }
];

export async function seedAi() {
  console.log('=== Starting HireFlow Phase 2 AI Seed ===');
  await connectDB();

  // 1. Find or create recruiter & company
  let recruiter = await User.findOne({ email: 'recruiter@hireflow.test' }).populate('company');
  let company;

  if (!recruiter) {
    console.log('Creating recruiter user recruiter@hireflow.test...');
    const recruiterPasswordHash = await bcrypt.hash('Recruiter@123', 10);
    company = await Company.create({
      name: 'Acme Technologies',
      slug: 'acme-tech',
      description: 'Pioneering cloud computing and scalable AI applications.',
      website: 'https://acme.test',
      industry: 'Technology',
      size: '51-200'
    });

    recruiter = await User.create({
      name: 'Sarah Connor',
      email: 'recruiter@hireflow.test',
      passwordHash: recruiterPasswordHash,
      role: 'recruiter',
      company: company._id,
      isActive: true
    });
  } else {
    company = recruiter.company;
  }

  // 2. Create or update the target Demo Job: "Full Stack Developer - 2 openings"
  console.log('Creating / Updating job: "Full Stack Developer - 2 openings"...');
  let demoJob = await Job.findOne({
    company: company._id,
    title: 'Full Stack Developer - 2 openings'
  });

  const jobPayload = {
    company: company._id,
    createdBy: recruiter._id,
    title: 'Full Stack Developer - 2 openings',
    department: 'Engineering',
    location: 'Remote / Hybrid',
    employmentType: 'full-time',
    workMode: 'remote',
    openings: 2,
    description: 'We are seeking an experienced Full Stack Developer to build high-scale web applications with React, Node.js, and MongoDB. You will design resilient REST APIs, collaborate with cross-functional teams, and maintain reliable cloud deployment pipelines.',
    experienceMin: 2,
    experienceMax: 4,
    enforceMinExperience: true,
    requiredSkills: ['React', 'Node.js', 'MongoDB', 'REST APIs'],
    preferredSkills: ['AWS', 'Docker', 'Git'],
    mustHaveSkills: ['React', 'Node.js'],
    educationRequirement: {
      minLevel: 'bachelor',
      preferredFields: ['Computer Science', 'Software Engineering', 'Information Technology']
    },
    scoringWeights: {
      skills: 35,
      experience: 25,
      projects: 20,
      education: 10,
      roleAlignment: 10
    },
    status: 'published',
    publishedAt: new Date(),
    blindScreening: false,
    interviewStages: [
      { name: 'Applied', order: 1 },
      { name: 'Screening', order: 2 },
      { name: 'Technical Interview', order: 3 },
      { name: 'Final Round', order: 4 },
      { name: 'Offer', order: 5 }
    ]
  };

  if (!demoJob) {
    demoJob = await Job.create(jobPayload);
  } else {
    Object.assign(demoJob, jobPayload);
    await demoJob.save();
  }

  console.log(`Demo job ready: ${demoJob.title} (ID: ${demoJob._id})`);

  // Ensure upload dir exists
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  // 3. Generate 40 synthetic candidates, resumes, and applications
  console.log(`Generating ${CANDIDATE_DEFINITIONS.length} realistic synthetic candidates...`);
  const passwordHash = await bcrypt.hash('Candidate@123', 10);

  let createdCount = 0;
  for (let i = 0; i < CANDIDATE_DEFINITIONS.length; i++) {
    const def = CANDIDATE_DEFINITIONS[i];

    // Find or create candidate user
    let user = await User.findOne({ email: def.email });
    if (!user) {
      user = await User.create({
        name: def.name,
        email: def.email,
        passwordHash,
        role: 'candidate',
        isActive: true
      });
    }

    // Profile
    let profile = await CandidateProfile.findOne({ user: user._id });
    if (!profile) {
      profile = await CandidateProfile.create({
        user: user._id,
        headline: def.headline || 'Software Engineer',
        summary: def.summary || '',
        skills: Array.isArray(def.skills) ? def.skills : [],
        totalExperienceYears: def.experience?.length ? 3 : 0,
        education: def.education
          ? [{
              degree: def.education.degree,
              field: def.education.field,
              institution: def.education.institution,
              year: def.education.year
            }]
          : []
      });
    }

    // PDF Resume
    const storedFilename = `seed_ai_${i + 1}_${Date.now()}.pdf`;
    let storedPath;
    try {
      storedPath = await generateRealisticPdf(def, storedFilename);
    } catch (err) {
      console.warn(`Could not generate PDF for ${def.name}:`, err.message);
      continue;
    }

    const stats = fs.statSync(storedPath);

    // Resume record
    const resume = await Resume.create({
      candidate: user._id,
      originalName: `${def.name.replace(/\s+/g, '_')}_Resume.pdf`,
      storedName: storedFilename,
      mimeType: 'application/pdf',
      size: stats.size,
      filePath: storedPath,
      parseStatus: 'pending' // Initial status before warming
    });

    // Check if application already exists for this candidate & job
    let app = await Application.findOne({ job: demoJob._id, candidate: user._id });
    if (!app) {
      app = await Application.create({
        job: demoJob._id,
        candidate: user._id,
        resume: resume._id,
        stage: 'applied',
        aiConsent: true,
        aiConsentAt: new Date(),
        stageHistory: [
          {
            stage: 'applied',
            changedBy: user._id,
            changedAt: new Date(),
            note: 'Application submitted with AI assessment consent'
          }
        ]
      });
      createdCount++;
    }
  }

  console.log(`Successfully generated ${createdCount} synthetic applications for "${demoJob.title}"!`);
  console.log('AI Seed Complete. Run "npm run ai:warm" to pre-screen all applications.');
}

// Execute if run directly
if (process.argv[1] && process.argv[1].endsWith('seedAi.js')) {
  seedAi()
    .then(() => disconnectDB())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Error during AI seeding:', err);
      process.exit(1);
    });
}
