/**
 * Scoring Thresholds and Configuration for HireFlow Phase 2 AI Screening.
 * Deterministic calibration thresholds for rule evaluation and semantic matching.
 */

export const SCORING_CONFIG = {
  // Semantic similarity thresholds
  SIM_MATCHED: 0.80,    // Cosine similarity >= 0.80 -> Matched (credit = 1.0)
  SIM_PARTIAL: 0.60,    // Cosine similarity >= 0.60 -> Partial (credit = 0.5)
                        // Below 0.60 -> Missing (credit = 0.0)

  // Experience relevance threshold: role must have at least 0.40 similarity to be relevant
  ROLE_RELEVANCE_THRESHOLD: 0.40,

  // Role alignment linear mapping [ALIGN_LOW, ALIGN_HIGH] -> [0, 100]
  ALIGN_LOW: 0.20,
  ALIGN_HIGH: 0.85,

  // Buckets
  BUCKET_STRONG: 75,    // Overall score >= 75 -> 'strong'
  BUCKET_POTENTIAL: 50, // Overall score >= 50 -> 'potential', otherwise 'low'

  // Current engine version
  SCORING_VERSION: '2.0.0',

  // Standard category weights (default sum = 100)
  DEFAULT_WEIGHTS: {
    skills: 30,
    experience: 25,
    projects: 20,
    education: 15,
    roleAlignment: 10
  }
};

export const {
  SIM_MATCHED,
  SIM_PARTIAL,
  ROLE_RELEVANCE_THRESHOLD,
  ALIGN_LOW,
  ALIGN_HIGH,
  BUCKET_STRONG,
  BUCKET_POTENTIAL,
  SCORING_VERSION,
  DEFAULT_WEIGHTS
} = SCORING_CONFIG;

export default SCORING_CONFIG;

