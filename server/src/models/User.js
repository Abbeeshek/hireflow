import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['candidate', 'recruiter', 'admin'],
      required: true,
      index: true
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      default: null,
      index: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastLoginAt: {
      type: Date,
      default: null
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata',
      trim: true
    },
    availability: {
      weekly: {
        type: [
          {
            day: {
              type: String,
              enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
              required: true
            },
            start: { type: String, required: true },
            end: { type: String, required: true }
          }
        ],
        default: () => [
          { day: 'monday', start: '09:00', end: '18:00' },
          { day: 'tuesday', start: '09:00', end: '18:00' },
          { day: 'wednesday', start: '09:00', end: '18:00' },
          { day: 'thursday', start: '09:00', end: '18:00' },
          { day: 'friday', start: '09:00', end: '18:00' }
        ]
      },
      bufferMinutes: {
        type: Number,
        default: 15,
        min: 0,
        max: 60
      }
    }
  },
  {
    timestamps: true
  }
);

export const User = mongoose.model('User', userSchema);
export default User;
