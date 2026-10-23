import { SkillEmbedding } from '../models/index.js';
import ai from '../ai/index.js';

/**
 * Service to cache and retrieve skill embeddings in MongoDB.
 * Ensures external AI embedding API is called at most once per unique term.
 */

/**
 * Get or compute normalized embedding vector for a single skill term.
 * @param {string} term
 * @returns {Promise<number[]>}
 */
export async function getSkillEmbedding(term) {
  if (!term || typeof term !== 'string') return [];
  const normalized = term.toLowerCase().trim();
  if (!normalized) return [];

  // Check MongoDB cache
  const cached = await SkillEmbedding.findOne({ term: normalized }).lean();
  if (cached && Array.isArray(cached.vector) && cached.vector.length > 0) {
    return cached.vector;
  }

  // Compute via AI provider
  const [vector] = await ai.embed([normalized]);
  const modelName = ai.embeddingModel || 'default-embed';

  try {
    await SkillEmbedding.findOneAndUpdate(
      { term: normalized },
      { term: normalized, vector, model: modelName },
      { upsert: true, new: true }
    );
  } catch (err) {
    // Ignore duplicate key race conditions
  }

  return vector;
}

/**
 * Get or compute embeddings for an array of skill terms.
 * Uses batch lookup and single batch embed for any missing terms.
 * @param {string[]} terms
 * @returns {Promise<Map<string, number[]>>} Map of lowercase term -> vector
 */
export async function getSkillEmbeddings(terms) {
  const result = new Map();
  if (!Array.isArray(terms) || terms.length === 0) return result;

  const uniqueTerms = [
    ...new Set(
      terms
        .filter((t) => typeof t === 'string' && t.trim().length > 0)
        .map((t) => t.toLowerCase().trim())
    )
  ];

  if (uniqueTerms.length === 0) return result;

  // 1. Fetch cached terms
  const cachedRecords = await SkillEmbedding.find({ term: { $in: uniqueTerms } }).lean();
  for (const record of cachedRecords) {
    result.set(record.term, record.vector);
  }

  // 2. Identify missing terms
  const missingTerms = uniqueTerms.filter((term) => !result.has(term));

  if (missingTerms.length > 0) {
    // 3. Request batch embeddings for missing terms
    const vectors = await ai.embed(missingTerms);
    const modelName = ai.embeddingModel || 'default-embed';

    const docsToInsert = [];
    for (let i = 0; i < missingTerms.length; i++) {
      const term = missingTerms[i];
      const vector = vectors[i] || [];
      result.set(term, vector);
      docsToInsert.push({
        term,
        vector,
        model: modelName
      });
    }

    // Upsert into MongoDB
    for (const doc of docsToInsert) {
      try {
        await SkillEmbedding.updateOne(
          { term: doc.term },
          { $set: doc },
          { upsert: true }
        );
      } catch (err) {
        // Safe to ignore duplicate key races
      }
    }
  }

  return result;
}

/**
 * Get embedding for arbitrary text (e.g., job descriptions, project text).
 * @param {string} text
 * @returns {Promise<number[]>}
 */
export async function getTextEmbedding(text) {
  if (!text || typeof text !== 'string') return [];
  const [vector] = await ai.embed([text]);
  return vector || [];
}

export default {
  getSkillEmbedding,
  getSkillEmbeddings,
  getTextEmbedding
};
