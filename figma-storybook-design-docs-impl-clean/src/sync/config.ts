import fs from 'node:fs';
import path from 'node:path';
import type { SyncConfig } from '../runtime/types.js';

export function loadSyncConfig(configPath: string): SyncConfig {
  const absolute = path.resolve(configPath);
  const parsed = JSON.parse(fs.readFileSync(absolute, 'utf8')) as SyncConfig;
  return {
    designConfigSuffix: '.design.json',
    figmaTokenEnv: 'FIGMA_TOKEN',
    defaultImageFormat: 'png',
    imageScale: 2,
    ...parsed
  };
}
