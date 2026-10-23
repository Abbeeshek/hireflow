import { z } from 'zod';
import { SKILL_ALIASES } from './skillAliases.js';
import ai from './index.js';

const evidenceSelectionSchema = z.object({
  selectedSentenceIndexes: z.array(z.number()).default([])
});

/**
 * Extracts verbatim evidence quotes from the candidate's verified sentences array.
 * Enforces Non-Negotiable Principle #2:
 * - Every quote must be an EXACT element of candidate's sentences array.
 * - The LLM only ever selects indexes, never authors quotes.
 * - Max 2 quotes per skill.
 *
 * @param {object} params
 * @param {Array} params.skillMatches
 * @param {string[]} params.sentences
 * @returns {Promise<Array>} Updated skillMatches with verified quotes
 */
export async function extractEvidenceForSkills({ skillMatches, sentences = [] }) {
  if (!Array.isArray(sentences) || sentences.length === 0) {
    return skillMatches.map((sm) => ({ ...sm, evidence: [] }));
  }

  // Set of valid sentences for verbatim verification
  const validSentenceSet = new Set(sentences);

  const updatedMatches = [];

  for (const match of skillMatches) {
    if (match.status === 'missing') {
      updatedMatches.push({ ...match, evidence: [] });
      continue;
    }

    const termsToSearch = new Set();
    termsToSearch.add(match.skill.toLowerCase().trim());
    if (match.matchedWith) {
      termsToSearch.add(match.matchedWith.toLowerCase().trim());
    }

    // Include aliases if found
    for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
      if (
        canonical === match.skill.toLowerCase() ||
        aliases.includes(match.skill.toLowerCase()) ||
        (match.matchedWith && (canonical === match.matchedWith.toLowerCase() || aliases.includes(match.matchedWith.toLowerCase())))
      ) {
        termsToSearch.add(canonical);
        aliases.forEach((a) => termsToSearch.add(a));
      }
    }

    // 1. Check for literal hits in sentences array
    const literalHits = [];
    for (const sentence of sentences) {
      const sentenceLower = sentence.toLowerCase();
      for (const term of termsToSearch) {
        // Word boundary match or simple substring
        if (sentenceLower.includes(term)) {
          if (!literalHits.includes(sentence)) {
            literalHits.push(sentence);
          }
          break;
        }
      }
      if (literalHits.length >= 2) break;
    }

    let verifiedQuotes = [];

    if (literalHits.length > 0) {
      // Literal quotes verified directly against sentences array
      verifiedQuotes = literalHits.filter((q) => validSentenceSet.has(q)).slice(0, 2);
    } else {
      // 2. If no direct literal hits, ask AI to pick numbered index from candidate sentences
      try {
        const numberedList = sentences
          .slice(0, 25)
          .map((s, idx) => `[${idx}]: ${s}`)
          .join('\n');

        const systemPrompt = `You are an evidence extraction assistant.
Given a skill and a numbered list of candidate resume sentences, select at most 2 sentence indexes that demonstrate hands-on practice, application, or proficiency in the skill.
Return ONLY valid integer indexes from the provided list. Never invent sentences.`;

        const userPrompt = `Skill to find evidence for: "${match.skill}"\n\nSentences:\n${numberedList}`;

        const aiResponse = await ai.generateJson({
          task: 'evidence_selection',
          systemPrompt,
          userPrompt,
          zodSchema: evidenceSelectionSchema
        });

        const indexes = aiResponse?.selectedSentenceIndexes || [];
        for (const idx of indexes) {
          if (Number.isInteger(idx) && idx >= 0 && idx < sentences.length) {
            const candidateSentence = sentences[idx];
            // STRICT VERIFICATION: must exist in original sentences
            if (validSentenceSet.has(candidateSentence) && !verifiedQuotes.includes(candidateSentence)) {
              verifiedQuotes.push(candidateSentence);
            }
          }
          if (verifiedQuotes.length >= 2) break;
        }
      } catch (err) {
        console.warn(`[EvidenceExtractor] AI index selection failed for ${match.skill}:`, err.message);
      }
    }

    updatedMatches.push({
      ...match,
      evidence: verifiedQuotes
    });
  }

  return updatedMatches;
}

export default {
  extractEvidenceForSkills
};
