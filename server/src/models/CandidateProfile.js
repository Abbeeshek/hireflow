import mongoose from 'mongoose';

const educationSchema = new mongoose.Schema(
  {
    degree: { type: String, required: true, trim: true },
    institution: { type: String, required: true, trim: true },
    year: { type: Number, required: true }
  },
  { _id: true }
);

const projectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    techStack: { type: [String], default: [] }
  },
  { _id: true }
);

const candidateProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    phone: {
      type: String,
      default: '',
      trim: true
    },
    headline: {
      type: String,
      default: '',
      trim: true
    },
    location: {
      type: String,
      default: '',
      trim: true
    },
    totalExperienceYears: {
      type: Number,
      default: 0,
      min: 0
    },
    skills: {
      type: [String],
      default: []
    },
    education: {
      type: [educationSchema],
      default: []
    },
    projects: {
      type: [projectSchema],
      default: []
    },
    links: {
      linkedin: { type: String, default: '', trim: true },
      github: { type: String, default: '', trim: true },
      portfolio: { type: String, default: '', trim: true }
    },
    talentPoolOptIn: {
      type: Boolean,
      default: false
    },
    talentPoolOptInAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

export const CandidateProfile = mongoose.model('CandidateProfile', candidateProfileSchema);
export default CandidateProfile;
