
import { readFile } from 'node:fs/promises';
import type { ToolConfig } from './types.js';

export async function loadConfig(configPath: string): Promise<ToolConfig> {
  const raw = await readFile(configPath, 'utf8');
  const parsed = JSON.parse(raw) as ToolConfig;
  if (!Array.isArray(parsed.files) || parsed.files.length === 0) {
    throw new Error('Config must contain a non-empty "files" array.');
  }
  return parsed;
}

export function resolveToken(config: ToolConfig): string {
  if (config.token && config.token.trim()) {
    return config.token.trim();
  }
  const envName = config.tokenEnv ?? 'FIGMA_TOKEN';
  const envValue = process.env[envName];
  if (!envValue) {
    throw new Error(`Missing token. Set env ${envName} or provide "token" in config.`);
  }
  return envValue;
}
