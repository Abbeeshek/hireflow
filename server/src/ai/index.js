/**
 * HireFlow AI Provider Orchestration Layer.
 * Unified interface for generateJson() and embed().
 * Enforces concurrency limits, fallback handling, timing, and privacy logging.
 */

import MockAiProvider from './providers/mock.js';
import GeminiProvider from './providers/gemini.js';

class Semaphore {
  constructor(max) {
    this.max = max;
    this.current = 0;
    this.queue = [];
  }

  async acquire() {
    if (this.current < this.max) {
      this.current++;
      return;
    }
    await new Promise((resolve) => this.queue.push(resolve));
  }

  release() {
    this.current--;
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      this.current++;
      next();
    }
  }
}

const concurrencyLimit = parseInt(process.env.AI_CONCURRENCY, 10) || 3;
const semaphore = new Semaphore(concurrencyLimit);

const mockProvider = new MockAiProvider();
let geminiProvider = null;

const getPrimaryProvider = () => {
  const providerType = (process.env.AI_PROVIDER || 'mock').toLowerCase();
  const apiKey = process.env.GEMINI_API_KEY;

  if (providerType === 'gemini' && apiKey) {
    if (!geminiProvider) {
      geminiProvider = new GeminiProvider({ apiKey });
    }
    return geminiProvider;
  }

  return mockProvider;
};

export const getActiveProviderInfo = () => {
  const primary = getPrimaryProvider();
  return {
    provider: primary.name,
    model: primary.model,
    isMock: primary.name === 'mock'
  };
};

/**
 * Generate validated structured JSON using active provider with mock fallback
 */
export const generateJson = async ({ task, systemPrompt = '', userPrompt, zodSchema }) => {
  await semaphore.acquire();
  const startTime = Date.now();
  const primary = getPrimaryProvider();
  const fallbackEnabled = process.env.AI_FALLBACK_TO_MOCK !== 'false';

  try {
    const result = await primary.generateJson({
      task,
      systemPrompt,
      userPrompt,
      zodSchema
    });

    const duration = Date.now() - startTime;
    console.log(`[AI] Task '${task}' completed via ${primary.name} (${duration}ms)`);

    const meta = {
      provider: primary.name,
      model: primary.model,
      durationMs: duration,
      timestamp: new Date()
    };

    if (result && typeof result === 'object') {
      result._meta = meta;
      result.meta = meta;
    }

    return result;
  } catch (err) {
    console.warn(`[AI] Primary provider '${primary.name}' failed for task '${task}': ${err.message}`);

    if (fallbackEnabled && primary.name !== 'mock') {
      console.log(`[AI] Falling back to MockAiProvider for task '${task}'...`);
      const mockResult = await mockProvider.generateJson({
        task,
        systemPrompt,
        userPrompt,
        zodSchema
      });

      const duration = Date.now() - startTime;
      const meta = {
        provider: 'mock-fallback',
        model: mockProvider.model,
        durationMs: duration,
        timestamp: new Date(),
        fallbackReason: err.message
      };

      if (mockResult && typeof mockResult === 'object') {
        mockResult._meta = meta;
        mockResult.meta = meta;
      }

      return mockResult;
    }

    throw err;
  } finally {
    semaphore.release();
  }
};

/**
 * Generate embeddings using active provider with mock fallback.
 * Returns number[][] array with attached metadata for full compatibility.
 */
export const embed = async (texts) => {
  await semaphore.acquire();
  const startTime = Date.now();
  const primary = getPrimaryProvider();
  const fallbackEnabled = process.env.AI_FALLBACK_TO_MOCK !== 'false';

  try {
    const vectors = await primary.embed(texts);
    const duration = Date.now() - startTime;
    const meta = {
      provider: primary.name,
      model: primary.embeddingModel || primary.model,
      durationMs: duration
    };

    vectors.vectors = vectors;
    vectors.meta = meta;
    return vectors;
  } catch (err) {
    console.warn(`[AI] Embed failed with '${primary.name}': ${err.message}`);

    if (fallbackEnabled && primary.name !== 'mock') {
      console.log(`[AI] Falling back to MockAiProvider embeddings...`);
      const vectors = await mockProvider.embed(texts);
      const duration = Date.now() - startTime;
      const meta = {
        provider: 'mock-fallback',
        model: mockProvider.model,
        durationMs: duration,
        fallbackReason: err.message
      };

      vectors.vectors = vectors;
      vectors.meta = meta;
      return vectors;
    }

    throw err;
  } finally {
    semaphore.release();
  }
};

export default {
  generateJson,
  embed,
  getActiveProviderInfo
};
