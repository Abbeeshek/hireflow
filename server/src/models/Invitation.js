import mongoose from 'mongoose';

const invitationSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
      index: true
    },
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['invited', 'applied', 'declined'],
      default: 'invited'
    }
  },
  {
    timestamps: true
  }
);

invitationSchema.index({ job: 1, candidate: 1 }, { unique: true });

export const Invitation = mongoose.model('Invitation', invitationSchema);
export default Invitation;
