import mongoose from 'mongoose';
import { Job, Company, Application, CandidateProfile, APPLICATION_STAGES } from '../models/index.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';
import { logAudit } from './audit.service.js';
import ai from '../ai/index.js';
import { criteriaSuggestionOutputSchema } from '../validators/job.validator.js';


export const getPublicJobs = async ({
  page = 1,
  limit = 10,
  search = '',
  location = '',
  employmentType,
  workMode,
  skills = ''
}) => {
  const query = { status: 'published' };

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { department: { $regex: search, $options: 'i' } }
    ];
  }

  if (location) {
    query.location = { $regex: location, $options: 'i' };
  }

  if (employmentType) {
    query.employmentType = employmentType;
  }

  if (workMode) {
    query.workMode = workMode;
  }

  if (skills) {
    const skillList = skills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (skillList.length > 0) {
      query.$or = [
        ...(query.$or || []),
        { requiredSkills: { $in: skillList.map((s) => new RegExp(s, 'i')) } },
        { preferredSkills: { $in: skillList.map((s) => new RegExp(s, 'i')) } }
      ];
    }
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Job.find(query)
      .populate('company', 'name website description')
      .sort({ publishedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Job.countDocuments(query)
  ]);

  return {
    items,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1
    }
  };
};

export const getJobById = async (jobId, user = null) => {
  const job = await Job.findById(jobId).populate('company', 'name website description owner');
  if (!job) {
    throw new NotFoundError('Job opening not found');
  }

  if (job.status !== 'published') {
    // Non-published jobs are only visible to the owning recruiter or admin
    if (!user) {
      throw new NotFoundError('Job opening not found');
    }
    const isOwner =
      user.role === 'admin' ||
      (user.role === 'recruiter' &&
        user.company &&
        String(user.company._id || user.company) === String(job.company._id));
    if (!isOwner) {
      throw new ForbiddenError('You do not have permission to view this job');
    }
  }

  return job;
};

export const getRecruiterJobs = async (companyId, { page = 1, limit = 10, status, search }) => {
  const query = { company: companyId };

  if (status) {
    query.status = status;
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { department: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (page - 1) * limit;

  const [jobs, total] = await Promise.all([
    Job.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Job.countDocuments(query)
  ]);

  // Aggregate application count for each job
  const jobIds = jobs.map((j) => j._id);
  const counts = await Application.aggregate([
    { $match: { job: { $in: jobIds } } },
    { $group: { _id: '$job', count: { $sum: 1 } } }
  ]);

  const countMap = {};
  counts.forEach((c) => {
    countMap[String(c._id)] = c.count;
  });

  const items = jobs.map((job) => ({
    ...job,
    applicationsCount: countMap[String(job._id)] || 0
  }));

  return {
    items,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1
    }
  };
};

export const createJob = async (companyId, userId, data, req = null) => {
  const job = await Job.create({
    ...data,
    company: companyId,
    createdBy: userId,
    publishedAt: data.status === 'published' ? new Date() : null
  });

  await logAudit({
    actor: userId,
    action: 'JOB_CREATE',
    entityType: 'Job',
    entityId: job._id,
    meta: { title: job.title, status: job.status },
    req
  });

  return job;
};

export const updateJob = async (jobId, companyId, userId, data, req = null) => {
  const job = await Job.findOne({ _id: jobId, company: companyId });
  if (!job) {
    throw new NotFoundError('Job not found or does not belong to your company');
  }

  // Preserve publishedAt unless explicitly modified
  const updates = { ...data };
  if (data.status === 'published' && !job.publishedAt) {
    updates.publishedAt = new Date();
  }

  Object.assign(job, updates);
  await job.save();

  await logAudit({
    actor: userId,
    action: 'JOB_UPDATE',
    entityType: 'Job',
    entityId: job._id,
    meta: { title: job.title, status: job.status },
    req
  });

  return job;
};

export const updateJobStatus = async (jobId, companyId, userId, status, req = null) => {
  const job = await Job.findOne({ _id: jobId, company: companyId });
  if (!job) {
    throw new NotFoundError('Job not found or does not belong to your company');
  }

  job.status = status;
  if (status === 'published' && !job.publishedAt) {
    job.publishedAt = new Date();
  }
  await job.save();

  let auditAction = 'JOB_UPDATE';
  if (status === 'published') auditAction = 'JOB_PUBLISH';
  if (status === 'closed') auditAction = 'JOB_CLOSE';

  await logAudit({
    actor: userId,
    action: auditAction,
    entityType: 'Job',
    entityId: job._id,
    meta: { previousStatus: job.status, newStatus: status },
    req
  });

  return job;
};

export const getRecruiterDashboard = async (companyId) => {
  const compId = new mongoose.Types.ObjectId(companyId);

  // 1. Job counts by status
  const jobStatusCounts = await Job.aggregate([
    { $match: { company: compId } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  const jobsByStatus = { draft: 0, published: 0, closed: 0, total: 0 };
  jobStatusCounts.forEach((j) => {
    if (jobsByStatus[j._id] !== undefined) {
      jobsByStatus[j._id] = j.count;
    }
    jobsByStatus.total += j.count;
  });

  // Get all job IDs for this company
  const companyJobs = await Job.find({ company: compId }).select('_id title').lean();
  const companyJobIds = companyJobs.map((j) => j._id);

  // 2. Total applications
  const totalApplications = await Application.countDocuments({ job: { $in: companyJobIds } });

  // 3. New this week
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const newThisWeek = await Application.countDocuments({
    job: { $in: companyJobIds },
    createdAt: { $gte: oneWeekAgo }
  });

  // 4. Funnel counts by stage
  const stageAgg = await Application.aggregate([
    { $match: { job: { $in: companyJobIds } } },
    { $group: { _id: '$stage', count: { $sum: 1 } } }
  ]);

  const funnelMap = {};
  APPLICATION_STAGES.forEach((s) => {
    funnelMap[s] = 0;
  });
  stageAgg.forEach((s) => {
    if (funnelMap[s._id] !== undefined) {
      funnelMap[s._id] = s.count;
    }
  });

  const funnel = APPLICATION_STAGES.map((stage) => ({
    stage,
    count: funnelMap[stage]
  }));

  // 5. Applications per job (top 5)
  const topJobsAgg = await Application.aggregate([
    { $match: { job: { $in: companyJobIds } } },
    { $group: { _id: '$job', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 }
  ]);

  const jobTitleMap = {};
  companyJobs.forEach((j) => {
    jobTitleMap[String(j._id)] = j.title;
  });

  const applicationsPerJob = topJobsAgg.map((item) => ({
    jobId: item._id,
    title: jobTitleMap[String(item._id)] || 'Unknown Job',
    count: item.count
  }));

  // 6. 8 most recent applications
  const recentApplications = await Application.find({ job: { $in: companyJobIds } })
    .populate('candidate', 'name email')
    .populate('job', 'title department')
    .sort({ createdAt: -1 })
    .limit(8)
    .lean();

  return {
    jobCounts: jobsByStatus,
    totalApplications,
    newThisWeek,
    funnel,
    applicationsPerJob,
    recentApplications
  };
};

export const getJobApplications = async (
  jobId,
  companyId,
  { page = 1, limit = 10, stage, search, sort, bucket }
) => {
  const job = await Job.findOne({ _id: jobId, company: companyId });
  if (!job) {
    throw new NotFoundError('Job opening not found for your company');
  }

  const query = { job: jobId };
  if (stage) {
    query.stage = stage;
  }

  // AI Bucket filter
  if (bucket === 'unscreened') {
    query.screening = null;
  } else if (bucket && ['strong', 'potential', 'low'].includes(bucket)) {
    query['screening.bucket'] = bucket;
  }

  let matchedCandidateIds = null;
  if (search) {
    // Search candidates by name or email or skills
    const candidateProfiles = await CandidateProfile.find({
      skills: { $regex: search, $options: 'i' }
    }).select('user');

    const matchedUsers = await mongoose.model('User').find({
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    }).select('_id');

    const idSet = new Set([
      ...candidateProfiles.map((p) => String(p.user)),
      ...matchedUsers.map((u) => String(u._id))
    ]);

    matchedCandidateIds = Array.from(idSet).map((id) => new mongoose.Types.ObjectId(id));
    query.candidate = { $in: matchedCandidateIds };
  }

  const skip = (page - 1) * limit;

  // Sorting: by score or creation date
  let sortOption = { createdAt: -1 };
  if (sort === 'score') {
    sortOption = { 'screening.overall': -1, createdAt: -1 };
  }

  const [applications, total, bucketAgg] = await Promise.all([
    Application.find(query)
      .populate('candidate', 'name email phone location')
      .populate('resume', 'originalName storedName mimeType size uploadedAt parseStatus')
      .populate('job', 'title department blindScreening')
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .lean(),
    Application.countDocuments(query),
    Application.aggregate([
      { $match: { job: new mongoose.Types.ObjectId(jobId) } },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$screening', null] },
              'unscreened',
              { $ifNull: ['$screening.bucket', 'unscreened'] }
            ]
          },
          count: { $sum: 1 }
        }
      }
    ])
  ]);

  // Aggregate bucket counts for the job
  const bucketCounts = { strong: 0, potential: 0, low: 0, unscreened: 0, total: 0 };
  bucketAgg.forEach((b) => {
    if (bucketCounts[b._id] !== undefined) {
      bucketCounts[b._id] = b.count;
    }
    bucketCounts.total += b.count;
  });

  // Enrich with candidate profile details
  const candidateIds = applications.map((a) => a.candidate?._id).filter(Boolean);
  const profiles = await CandidateProfile.find({ user: { $in: candidateIds } }).lean();
  const profileMap = {};
  profiles.forEach((p) => {
    profileMap[String(p.user)] = p;
  });

  const items = applications.map((app) => {
    const isBlindActive =
      job.blindScreening && ['applied', 'screening'].includes(app.stage);

    const appItem = { ...app };

    // Staleness check
    if (appItem.screening && appItem.screening.status === 'completed') {
      const jobUpdated = new Date(job.updatedAt || 0);
      const screenedAtJob = new Date(appItem.screening.jobUpdatedAtAtScreening || 0);
      if (jobUpdated > screenedAtJob) {
        appItem.screening.stale = true;
      }
    }

    if (isBlindActive) {
      const codename = `Candidate A-${String(app._id).slice(-4)}`;
      appItem.candidate = {
        _id: app.candidate?._id,
        name: codename,
        isAnonymized: true
      };
      appItem.candidateProfile = null;
      if (appItem.resume) {
        appItem.resume = {
          _id: appItem.resume._id,
          originalName: 'Redacted_Resume.pdf',
          mimeType: appItem.resume.mimeType,
          size: appItem.resume.size,
          parseStatus: appItem.resume.parseStatus
        };
      }
    } else {
      appItem.candidateProfile = app.candidate
        ? profileMap[String(app.candidate._id)] || null
        : null;
    }

    return appItem;
  });

  return {
    items,
    bucketCounts,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1
    }
  };
};


export const generateJobCriteria = async (companyId, userId, data, req = null) => {
  const { title, brief, experienceMin = 0, experienceMax = 5 } = data;

  const systemPrompt = `You are an expert technical recruiter and job architecture specialist.
Given a job title and brief description, produce comprehensive, structured job opening suggestions.
Include:
- Professional job description (engaging overview, responsibilities)
- requiredSkills: 3 to 6 essential technical skills
- preferredSkills: 2 to 4 nice-to-have skills
- suggestedMustHaveSkills: 1 to 3 critical non-negotiable skills (must be a subset of requiredSkills)
- interviewStages: 4 to 6 stages (e.g. screening, assessment, interview1, offer)
- scoringWeights: weights summing to exactly 100 across skills, experience, projects, education, roleAlignment.`;

  const userPrompt = JSON.stringify({
    title,
    brief,
    experienceMin,
    experienceMax
  });

  const suggestions = await ai.generateJson({
    task: 'job_criteria',
    systemPrompt,
    userPrompt,
    zodSchema: criteriaSuggestionOutputSchema
  });

  // Ensure suggestedMustHaveSkills is a subset of requiredSkills
  if (Array.isArray(suggestions.suggestedMustHaveSkills) && Array.isArray(suggestions.requiredSkills)) {
    suggestions.suggestedMustHaveSkills = suggestions.suggestedMustHaveSkills.filter((s) =>
      suggestions.requiredSkills.includes(s)
    );
    if (suggestions.suggestedMustHaveSkills.length === 0 && suggestions.requiredSkills.length > 0) {
      suggestions.suggestedMustHaveSkills = [suggestions.requiredSkills[0]];
    }
  }

  await logAudit({
    actor: userId,
    action: 'AI_CRITERIA_GENERATED',
    entityType: 'Job',
    entityId: null,
    meta: {
      title,
      skillsCount: suggestions.requiredSkills?.length || 0,
      mustHaveCount: suggestions.suggestedMustHaveSkills?.length || 0,
      provider: ai.providerName
    },
    req
  });

  return suggestions;
};

