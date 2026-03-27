import { getClient } from './client.js';

export interface ModelInfo {
  id: string;
  name: string;
  created: number;
  tier: 'flagship' | 'fast' | 'nano' | 'reasoning' | 'pro' | 'codex' | 'legacy' | 'other';
}

// Default model if API query fails
export const DEFAULT_MODEL = 'gpt-5.4';
const FALLBACK_TRIAGE_MODEL = 'gpt-5.4-mini';

// Cache for fetched models
let cachedModels: ModelInfo[] | null = null;

function classifyTier(id: string): ModelInfo['tier'] {
  if (id.includes('-pro')) return 'pro';
  if (id.includes('-nano')) return 'nano';
  if (id.includes('-mini') && !id.includes('codex')) return 'fast';
  if (id.includes('-codex') || id.includes('codex')) return 'codex';
  if (id.startsWith('o1') || id.startsWith('o2') || id.startsWith('o3') || id.startsWith('o4')) return 'reasoning';
  if (id.startsWith('gpt-4o') || id.startsWith('gpt-4-')) return 'legacy';
  return 'flagship';
}

function formatName(id: string): string {
  return id
    .replace(/^gpt-/, 'GPT-')
    .replace(/-(\d{4}-\d{2}-\d{2})$/, ' ($1)')
    .replace(/-pro$/, ' Pro')
    .replace(/-mini$/, ' Mini')
    .replace(/-nano$/, ' Nano')
    .replace(/-codex$/, ' Codex')
    .replace(/-codex-mini$/, ' Codex Mini')
    .replace(/-codex-max$/, ' Codex Max')
    .replace(/-chat-latest$/, ' (latest)');
}

function isChatModel(id: string): boolean {
  // Filter out non-chat models
  const exclude = ['tts', 'transcribe', 'realtime', 'audio', 'image', 'search', 'sora', 'embedding', 'dall-e', 'whisper', 'babbage', 'davinci', 'chatgpt-image'];
  return exclude.every((ex) => !id.includes(ex));
}

function isRelevantModel(id: string): boolean {
  // Only include GPT-5.x, GPT-4.x, o-series models (no date-stamped variants)
  if (!isChatModel(id)) return false;

  // Skip date-stamped variants (e.g., gpt-5.4-2026-03-05) — keep only the alias
  if (/\d{4}-\d{2}-\d{2}$/.test(id)) return false;

  // Skip "chat-latest" variants
  if (id.endsWith('-chat-latest')) return false;

  // Must start with gpt- or o
  return id.startsWith('gpt-') || /^o[1-4]/.test(id);
}

export async function fetchModels(): Promise<ModelInfo[]> {
  if (cachedModels) return cachedModels;

  try {
    const client = getClient();
    const response = await client.models.list();

    const models: ModelInfo[] = [];

    for await (const model of response) {
      if (!isRelevantModel(model.id)) continue;

      models.push({
        id: model.id,
        name: formatName(model.id),
        created: model.created,
        tier: classifyTier(model.id),
      });
    }

    // Sort: newest first
    models.sort((a, b) => b.created - a.created);

    cachedModels = models;
    return models;
  } catch {
    // If API fails, return minimal fallback list
    return getFallbackModels();
  }
}

function getFallbackModels(): ModelInfo[] {
  return [
    { id: 'gpt-5.4', name: 'GPT-5.4', created: 0, tier: 'flagship' },
    { id: 'gpt-5.4-mini', name: 'GPT-5.4 Mini', created: 0, tier: 'fast' },
    { id: 'gpt-5.4-nano', name: 'GPT-5.4 Nano', created: 0, tier: 'nano' },
    { id: 'gpt-4o', name: 'GPT-4o', created: 0, tier: 'legacy' },
    { id: 'o4-mini', name: 'o4-mini', created: 0, tier: 'reasoning' },
    { id: 'o3', name: 'o3', created: 0, tier: 'reasoning' },
  ];
}

export function getModel(id: string): ModelInfo {
  const cached = cachedModels?.find((m) => m.id === id);
  if (cached) return cached;

  return {
    id,
    name: formatName(id),
    created: 0,
    tier: classifyTier(id),
  };
}

export async function listModels(): Promise<ModelInfo[]> {
  return fetchModels();
}

export function getDefaultModel(): string {
  return DEFAULT_MODEL;
}

export function getTriageModel(): string {
  // Use the fastest available mini model for triage
  if (cachedModels) {
    const mini = cachedModels.find((m) => m.tier === 'fast');
    if (mini) return mini.id;
  }
  return FALLBACK_TRIAGE_MODEL;
}

export function clearModelCache(): void {
  cachedModels = null;
}
