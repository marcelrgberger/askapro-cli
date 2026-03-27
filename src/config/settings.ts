import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { GLOBAL_SETTINGS_FILE, ensureGlobalDirs } from './paths.js';

export interface Settings {
  model: string;
  triageModel: string;
  embeddingModel: string;
  apiKey?: string;
  baseUrl?: string;
  language: string;
  jurisdiction: string;
  maxTokens: number;
  temperature: number;
  showDisclaimer: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  model: 'gpt-4.1',
  triageModel: 'gpt-4.1-mini',
  embeddingModel: 'text-embedding-3-small',
  language: 'en',
  jurisdiction: 'DE',
  maxTokens: 4096,
  temperature: 0.3,
  showDisclaimer: true,
};

export function loadSettings(): Settings {
  ensureGlobalDirs();

  if (!existsSync(GLOBAL_SETTINGS_FILE)) {
    return { ...DEFAULT_SETTINGS };
  }

  try {
    const raw = readFileSync(GLOBAL_SETTINGS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: Partial<Settings>): void {
  ensureGlobalDirs();
  const current = loadSettings();
  const merged = { ...current, ...settings };
  writeFileSync(GLOBAL_SETTINGS_FILE, JSON.stringify(merged, null, 2), 'utf-8');
}
