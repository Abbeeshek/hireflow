/**
 * Gemini Provider using the official @google/genai SDK.
 * Implements structured JSON output with Zod validation, retry on failure,
 * exponential backoff on 429/5xx, and timeout enforcement.
 */

import { GoogleGenAI } from '@google/genai';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class GeminiProvider {
  constructor({
    apiKey = process.env.GEMINI_API_KEY,
    model = process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    embeddingModel = process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004',
    timeoutMs = parseInt(process.env.AI_TIMEOUT_MS, 10) || 30000
  } = {}) {
    this.name = 'gemini';
    this.apiKey = apiKey;
    this.model = model;
    this.embeddingModel = embeddingModel;
    this.timeoutMs = timeoutMs;

    if (this.apiKey) {
      this.ai = new GoogleGenAI({ apiKey: this.apiKey });
    }
  }

  async withTimeout(promise) {
    let timer;
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`Gemini request timed out after ${this.timeoutMs}ms`));
      }, this.timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      clearTimeout(timer);
    }
  }

  async callWithRetry(fn, maxRetries = 3) {
    let lastError = null;
    let delay = 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.withTimeout(fn());
      } catch (err) {
        lastError = err;
        const msg = String(err.message || '').toLowerCase();
        const isRateLimit = msg.includes('429') || msg.includes('resource_exhausted') || msg.includes('quota');
        const isServerErr = msg.includes('500') || msg.includes('503') || msg.includes('internal');

        if ((isRateLimit || isServerErr) && attempt < maxRetries) {
          console.warn(`[GeminiProvider] Attempt ${attempt} failed (${err.message}). Retrying in ${delay}ms...`);
          await wait(delay);
          delay *= 2;
        } else {
          throw err;
        }
      }
    }

    throw lastError;
  }

  async generateJson({ task, systemPrompt = '', userPrompt, zodSchema }) {
    if (!this.ai) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const contents = [
      ...(systemPrompt ? [{ role: 'system', parts: [{ text: systemPrompt }] }] : []),
      { role: 'user', parts: [{ text: userPrompt }] }
    ];

    let lastError = null;

    // Retry once with validation error appended if JSON validation fails
    for (let attempt = 1; attempt <= 2; attempt++) {
      let promptToSend = userPrompt;
      if (attempt === 2 && lastError) {
        promptToSend += `\n\nCRITICAL: Previous response failed schema validation with error: ${lastError.message}. Please output strictly valid JSON matching the schema.`;
      }

      const response = await this.callWithRetry(async () => {
        return await this.ai.models.generateContent({
          model: this.model,
          contents: [
            ...(systemPrompt ? [{ role: 'system', parts: [{ text: systemPrompt }] }] : []),
            { role: 'user', parts: [{ text: promptToSend }] }
          ],
          config: {
            responseMimeType: 'application/json'
          }
        });
      });

      try {
        const text = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          throw new Error('Empty response received from Gemini');
        }
        const parsed = JSON.parse(text);
        if (zodSchema) {
          return zodSchema.parse(parsed);
        }
        return parsed;
      } catch (parseErr) {
        lastError = parseErr;
        if (attempt === 2) {
          throw parseErr;
        }
      }
    }

    throw lastError;
  }

  async embed(texts) {
    if (!this.ai) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    if (!Array.isArray(texts)) texts = [texts];

    const results = [];
    for (const text of texts) {
      const response = await this.callWithRetry(async () => {
        return await this.ai.models.embedContent({
          model: this.embeddingModel,
          contents: text
        });
      });

      const vector = response.embedding?.values || response.embeddings?.[0]?.values;
      if (!vector) {
        throw new Error('Failed to retrieve embedding vector from Gemini response');
      }
      results.push(vector);
    }

    return results;
  }
}

export default GeminiProvider;
