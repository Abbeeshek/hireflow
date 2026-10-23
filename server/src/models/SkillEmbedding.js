import mongoose from 'mongoose';

const skillEmbeddingSchema = new mongoose.Schema(
  {
    term: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    vector: {
      type: [Number],
      required: true
    },
    model: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true
  }
);

export const SkillEmbedding = mongoose.model('SkillEmbedding', skillEmbeddingSchema);
export default SkillEmbedding;
