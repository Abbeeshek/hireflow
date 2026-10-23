# HireFlow — AI-Assisted Recruitment Platform

HireFlow is an AI-assisted recruitment platform built on the MERN stack that runs entirely on localhost. 
- **Phase 1: ATS Foundation** delivers a robust, multi-tenant Applicant Tracking System foundation with strict data isolation, role-based access control, file security, and 10-stage pipeline workflows.
- **Phase 2: AI Screening** introduces explainable, deterministic candidate assessment, privacy-preserving resume parsing, job criteria intelligence, blind screening, and side-by-side candidate comparison.

---

## Non-Negotiable Core Principles

1. **HYBRID, NOT BLACK BOX**: Overall candidate match scores are computed strictly by deterministic mathematical code from structured resume data plus vector embedding similarities. The LLM **never** generates, predicts, or alters numerical scores. The LLM is restricted solely to:
   - Extracting structured profiles from raw resume text
   - Suggesting job criteria from a brief
   - Selecting supporting evidence sentences by index from a numbered array
   - Drafting plain-English narrative explanations from pre-computed results
2. **EVIDENCE MUST BE REAL**: Every quote presented as proof of a candidate's competency is a verbatim sentence from the candidate's extracted resume text. The LLM picks sentences by zero-indexed reference from a numbered list and never generates freeform quotes. Every quote is verified against the candidate's resume sentences before storage. Skills without verifiable quotes are displayed as *"claimed, no supporting evidence"*.
3. **HUMAN IN THE LOOP**: AI never shortlists, rejects, or advances a candidate. The only automated stage change permitted is advancing candidates from `applied` to `screening` with actor `"system"` and note `"AI screening completed"`. Hard rule violations force the candidate into the `"low"` fit bucket with visible reasons, keeping them fully visible and reviewable by recruiters.
4. **FAIR BY CONSTRUCTION**: Name, email, phone number, gender, age, religion, caste, marital status, photo, address, and hyperlinks are never inputs to scoring and are never sent to the LLM. Emails, phone numbers, and URLs are automatically redacted prior to LLM processing.
5. **WORKS 100% OFFLINE**: A built-in mock provider (`AI_PROVIDER=mock`) enables all Phase 2 features (embeddings, parsing, evidence extraction, job intelligence, and scoring) without requiring an internet connection or external API keys.
6. **CANDIDATES NEVER SEE SCREENING DATA**: Candidates are strictly prevented from viewing screening assessments, match scores, or recruiter notes. This is enforced at the backend controller and serializer layers, not merely hidden in the UI.

---

## Architecture Overview

```
hireflow/
├── client/                     # React 18 + Vite Frontend
│   ├── src/
│   │   ├── api/                # Axios API clients (auth, jobs, candidate, recruiter, admin)
│   │   ├── components/         # Modal, Navbar, Footer, StageBadge, SkillTagInput, LoadingSpinner, EmptyState
│   │   ├── context/            # AuthContext (JWT cookie session management)
│   │   ├── layouts/            # MainLayout, ProtectedRoute (role guards)
│   │   ├── pages/
│   │   │   ├── public/         # LandingPage, JobsPage, JobDetailPage, LoginPage, RegisterPage, 403, 404
│   │   │   ├── candidate/      # CandidateDashboard (visual timeline), ProfilePage, ResumesPage (AI parse status)
│   │   │   ├── recruiter/      # RecruiterDashboard, RecruiterJobsPage, JobFormPage (AI Criteria generator), 
│   │   │   │                   # JobApplicantsPage (Batch screen, bucket filters, compare),
│   │   │   │                   # ApplicationDetailPage (Candidate intelligence, sub-scores, evidence),
│   │   │   │                   # CompareCandidatesPage (Radar chart, skill matrix, strengths/concerns)
│   │   │   └── admin/          # AdminUsersPage, AdminAuditLogsPage
│   │   ├── utils/              # formatters, constants (10-stage pipeline, color tokens)
│   │   ├── index.css           # Tailwind CSS directives + offline Inter & Fraunces font imports
│   │   ├── App.jsx             # React Router 6 route declarations
│   │   └── main.jsx
│   ├── package.json
│   ├── tailwind.config.js      # Custom design tokens (ink, indigo, lavender, amber, etc.)
│   └── vite.config.js          # Dev proxy /api -> http://localhost:5000
├── server/                     # Express 4 + Mongoose 8 Backend
│   ├── src/
│   │   ├── ai/                 # Phase 2 AI Engine
│   │   │   ├── providers/      # Gemini (@google/genai SDK) and Mock providers
│   │   │   ├── redact.js       # PII regex redaction
│   │   │   ├── skillAliases.js # Canonical skill dictionary with synonym mappings
│   │   │   ├── textExtractor.js# PDF (pdf-parse) and DOCX (mammoth) text extraction
│   │   │   ├── ruleEngine.js   # Deterministic hard-rule qualification engine
│   │   │   ├── semanticMatcher.js# Embedding similarity, sub-scores, and weight renormalisation
│   │   │   ├── evidenceExtractor.js# Verbatim quote index extraction & verification
│   │   │   ├── explainer.js    # Structured summary, strengths & concerns generator
│   │   │   ├── matchEngine.js  # Hybrid screening orchestrator
│   │   │   └── index.js        # Semaphore concurrency, fallback handling, provider abstraction
│   │   ├── config/             # DB connection, scoring calibration thresholds
│   │   ├── controllers/        # Thin route controllers
│   │   ├── middleware/         # auth (JWT), upload, rateLimiter, errorHandler, validate
│   │   ├── models/             # User, Company, Job, CandidateProfile, Resume, Application, AuditLog, SkillEmbedding, ScreeningRun
│   │   ├── routes/             # auth, jobs, recruiter, candidate, application, resume, admin
│   │   ├── seed/               # Database seeders (seed.js, seedAi.js, warmAi.js)
│   │   ├── services/           # Business logic, screeningService, resumeParserService, embeddingService
│   │   ├── utils/              # apiResponse envelope, custom AppError classes
│   │   ├── validators/         # Zod schemas for all endpoints
│   │   ├── app.js              # Express app setup
│   │   └── server.js           # Server entry point (port 5000)
│   ├── tests/                  # 44 Jest unit and integration tests across 6 suites
│   ├── uploads/resumes/        # Secure resume storage (UUID filenames, never statically served)
│   └── package.json
├── package.json                # Root package with dev, seed, and test scripts
└── README.md
```

---

## Tech Stack

- **Runtime & Language**: Node.js 20+, JavaScript (ES Modules).
- **Backend**: Express 4, Mongoose 8, Zod, `@google/genai` (official Google GenAI SDK), `pdf-parse`, `mammoth`, `pdfkit`, bcryptjs, jsonwebtoken, cookie-parser, helmet, cors, express-rate-limit, express-mongo-sanitize, multer, dotenv.
- **Testing**: Jest, Supertest, mongodb-memory-server (44 tests, 100% pass rate).
- **Frontend**: React 18 + Vite, React Router 6, Tailwind CSS 3.4, Axios, TanStack React Query, React Hook Form + Zod resolver, Recharts (funnel charts, bar charts, competency radar charts), Lucide React, React Hot Toast, `@fontsource/inter` and `@fontsource/fraunces`.
- **Database**: MongoDB at `mongodb://127.0.0.1:27017/hireflow` (with built-in fallback to `mongodb-memory-server`).

---

## AI Configuration & Environment Variables

All AI configurations are managed in `server/.env` (see `server/.env.example`):

| Variable | Default | Description |
| :--- | :--- | :--- |
| `AI_PROVIDER` | `mock` | Active provider: `mock` (offline) or `gemini` (cloud API) |
| `AI_FALLBACK_TO_MOCK`| `true` | If Gemini fails or times out, fallback to mock provider |
| `GEMINI_API_KEY` | *(empty)* | Google AI Studio API key (required when `AI_PROVIDER=gemini`) |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Current fast multimodal text model |
| `GEMINI_EMBEDDING_MODEL`| `text-embedding-004`| Current text embedding model |
| `AI_CONCURRENCY` | `3` | Max concurrent AI operations (enforced via semaphore) |
| `AI_TIMEOUT_MS` | `30000` | Timeout in milliseconds before timing out an AI call |

### Getting a Gemini API Key from Google AI Studio
1. Navigate to [https://aistudio.google.com/](https://aistudio.google.com/).
2. Sign in with your Google account.
3. Click **"Get API key"** and create a new key in a project.
4. Copy the API key and set it in `server/.env`:
   ```env
   AI_PROVIDER=gemini
   GEMINI_API_KEY=AIzaSy...
   ```
5. When `AI_PROVIDER=gemini` is configured without an API key, the system automatically falls back to `mock` provider and displays a *"Demo AI mode"* badge in the UI.

### What Mock Mode Does
The mock provider (`server/src/ai/providers/mock.js`) provides 100% offline, deterministic AI capabilities:
- **Embeddings**: Generates 256-dimensional unit-normalized token hash vectors with canonical alias expansion (`server/src/ai/skillAliases.js`). Related terms (e.g., *"Node.js"* and *"server-side JavaScript"*) map to close vectors, while unrelated terms (e.g., *"Node.js"* and *"Photoshop"*) map to distant vectors.
- **Parsing**: Deterministic regex-based text extraction capturing technical skills, job titles, durations, education, and bullet points.
- **Job Criteria Suggestions**: Domain-calibrated templates generating role descriptions, required/preferred skills, must-have flags, and balanced category weights.
- **Evidence Extraction**: Deterministic keyword and alias matching locating exact sentence indices in the resume.
- **Explainer**: Template-driven generator formulating a 3-sentence summary, top strengths, and fit concerns from pre-calculated metrics with zero PII.

---

## How Deterministic Scoring Works

The overall match score (0–100) is calculated strictly by code:

$$\text{Overall Score} = \sum_{i} \left( \frac{\text{WeightUsed}_i}{100} \times \text{SubScore}_i \right)$$

### 1. Hard Rule Engine (`ruleEngine.js`)
Evaluates 3 pass/fail criteria before any score computation:
- **Minimum Experience**: Total experience years $\ge$ job `experienceMin` (when `enforceMinExperience` is true).
- **Must-Have Skills**: Every skill designated in `job.mustHaveSkills` must be present (via exact match, canonical alias, or semantic similarity $\ge 0.80$).
- **Education Level**: Candidate education degree meets or exceeds `job.educationRequirement.minLevel` (e.g., Bachelor, Master, PhD).

> **Rule Failure Consequence**: If any hard rule fails, the candidate is automatically assigned to the **"low" fit bucket**, with the specific failed rules displayed prominently. The numerical score is preserved for transparency.

### 2. Sub-Score Dimensions
- **Skills Score (Weight: 35%)**: For each required skill (weight 1.0) and preferred skill (weight 0.5), identifies the best candidate match across skills, experience technologies, and project tech stacks. Exact/alias matches receive similarity 1.0; other terms use cosine similarity of cached embeddings.
  - Matched ($\ge 0.80$): 100% credit
  - Partial ($\ge 0.60$): 50% credit
  - Missing ($< 0.60$): 0% credit
- **Experience Score (Weight: 25%)**: Calculates `relevantYears` by summing durations of roles semantically relevant to the target job (cosine similarity $> 0.60$). Score $= \min(100, \frac{\text{relevantYears}}{\text{experienceMin}} \times 100)$.
- **Projects Score (Weight: 20%)**: Embeds candidate projects and scores relevance against job title, description, and required skills. Takes the top 3 projects.
- **Education Score (Weight: 10%)**: Rule-based scoring against `minLevel` and `preferredFields`.
  - **Dynamic Weight Renormalisation**: When `minLevel` is `"none"`, education is not applicable. The education weight drops to 0%, and the remaining 4 category weights are dynamically renormalised to total exactly 100%.
- **Role Alignment Score (Weight: 10%)**: Cosine similarity between candidate profile text (summary, titles, skills) and job description, linearly scaled from $[\text{ALIGN\_LOW}, \text{ALIGN\_HIGH}]$ to $[0, 100]$.

### 3. Threshold Calibration Results
Scoring thresholds in `server/src/config/scoring.js` were calibrated against semantic test pairs:
- `SIM_MATCHED: 0.80`
- `SIM_PARTIAL: 0.60`
- **Sanity Calibration Pairs**:
  - *"Node.js"* vs *"server-side JavaScript"*: Measured similarity = **0.7912** ($\ge 0.60$, classified as **Partial**)
  - *"Node.js"* vs *"Photoshop"*: Measured similarity = **0.0000** ($< 0.40$, classified as **Missing**)
- **Buckets**:
  - **Strong Fit**: Overall $\ge 75$ (and all hard rules passed)
  - **Potential Fit**: Overall $\ge 50$ (and all hard rules passed)
  - **Low Fit**: Overall $< 50$ OR any failed hard rule

---

## Blind Screening

When `job.blindScreening` is enabled on a job opening:
- Applications at stages `applied` or `screening` have candidate identity masked in recruiter API responses:
  - Name is replaced with a deterministic codename: `Candidate A-1042` (derived from application ID)
  - Email, phone, location, links, and avatar are omitted
  - Resume file downloads are blocked with HTTP `403 Forbidden` (*"revealed after shortlisting"*)
  - The recruiter reviews the parsed, redacted profile and AI screening evidence instead
- Once the recruiter advances the candidate to `shortlisted` or higher, identity and resume downloads are revealed.
- Match scores and screening calculations are identical in both modes.

---

## Pre-seeded Demo Accounts

| Role | Email | Password | Notes |
| :--- | :--- | :--- | :--- |
| **Recruiter** | `recruiter@hireflow.test` | `Recruiter@123` | Associated with **Acme Tech** |
| **Admin** | `admin@hireflow.test` | `Admin@123` | System governance & audit logs |
| **Candidates** | `candidate1@hireflow.test` – `candidate25@hireflow.test` | `Candidate@123` | Phase 1 pre-populated candidates |
| **AI Demo Candidates**| `marcus.vance@seeddemo.test`, etc. | `Candidate@123` | 40 Phase 2 synthetic candidates with multi-section PDF resumes |

---

## Windows-Friendly Setup & Quickstart

### 1. Installation
Run from the root `hireflow/` directory:
```powershell
# Install root, server, and client dependencies
npm install
npm install --prefix server
npm install --prefix client
```

### 2. Database Seeding
```powershell
# Step A: Seed Phase 1 base data (Recruiter, Admin, 25 candidates, 6 jobs)
npm run seed

# Step B: Additive Phase 2 AI Seed (creates "Full Stack Developer - 2 openings" & 40 synthetic candidates)
npm run seed:ai

# Step C: AI Warming (pre-parses and pre-screens all 40 applications into MongoDB)
npm run ai:warm
```

### 3. Running the Application
```powershell
npm run dev
```
- **Client Application**: [http://localhost:5173](http://localhost:5173)
- **API Server**: [http://localhost:5000](http://localhost:5000)

### 4. Running Automated Tests
```powershell
npm test
```
Executes all 6 test suites (44 tests) with zero network dependencies (using `mongodb-memory-server` and mocked AI providers):
- `tests/hireflow.test.js`: Phase 1 ATS authentication, RBAC, application pipelines, and resume security
- `tests/ai.foundation.test.js`: PII redaction, mock embeddings, semantic closeness, and AI orchestrator
- `tests/resume.pipeline.test.js`: Text extractor (PDF/DOCX), date duration calculations, and parser service
- `tests/job.intelligence.test.js`: Additive job fields and criteria suggestion endpoint
- `tests/match.engine.test.js`: Hard rule engine, semantic matcher, evidence extractor, weight renormalisation, determinism, and explainer
- `tests/screening.integration.test.js`: Candidate privacy serializer guards, blind screening masking, candidate comparison, and consent enforcement

---

## Verifying the Recruiter AI Demo Flow

1. **Log in as Recruiter**: Navigate to [http://localhost:5173/login](http://localhost:5173/login), click *"Autofill Recruiter"*, and log in.
2. **Open Job Opening**: Go to **My Jobs** and click on **"Full Stack Developer - 2 openings"**.
3. **Applicants Pipeline & AI Screen**:
   - Observe the 4 AI bucket cards: **All**, **Strong Fit (25)**, **Potential Fit (0)**, **Low Fit (15)**, and **Unscreened (0)**.
   - Click the **"AI Screen Candidates"** button to watch batch screening status polling in real time.
   - Filter applicants by clicking on the **Strong Fit** or **Low Fit** cards.
4. **Inspect Candidate Intelligence**:
   - Click on **Marcus Vance** (Strong Fit, 92% match score):
     - View the score ring, bucket badge, and provider badge (`Demo AI mode` or `Gemini`).
     - Review sub-scores (Skills 35%, Experience 25%, Projects 20%, Education 10%, Role Alignment 10%).
     - In the Technical Skills table, click **"Verified in resume"** on *React* or *Node.js* to expand verbatim resume evidence quotes.
     - Review AI Summary, Key Strengths, and Areas to Probe / Fit Concerns.
     - Toggle the collapsible **"Criteria & Model Info"** panel to verify scoring version, weights used, and audit timestamp.
   - Click on **Emily Thornton** (Low Fit):
     - Observe how Emily scored 79% mathematically, but was placed in the **Low** bucket because of a failed hard rule (*"Missing must-have skill: Node.js"*).
5. **Compare Candidates**:
   - Return to the applicants table, select checkboxes for 2 or 3 candidates (e.g. Marcus Vance and Emily Thornton).
   - Click the **"Compare (2)"** button in the header.
   - Inspect the **Competency Radar Chart**, side-by-side sub-scores, skill matrix, and strengths/concerns.
   - Note the prominent disclaimer: *"Recruiter makes all hiring decisions. No automated winner is selected."*
6. **AI Criteria Generator**:
   - Click **Post New Job**, enter a brief in the *"Generate with AI"* drawer, and generate tailored requirements, must-haves, and calibrated weights.
7. **Candidate Privacy**:
   - Log in as candidate `marcus.vance@seeddemo.test` (`Candidate@123`).
   - Notice the candidate dashboard and application details display zero screening metrics or internal notes.

---

## Known Limitations & Phase 3 Roadmap

1. **Interview Scheduling**: Automated calendar invites and self-scheduling links will be introduced in Phase 3.
2. **Email Notifications**: Status change notifications currently record internal audit events; Phase 3 will add SMTP/webhooks.
3. **Analytics & Copilot**: Multi-job hiring velocity metrics and interactive recruiter chat copilot are planned for Phase 3.
