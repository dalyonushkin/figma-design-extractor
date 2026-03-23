import fs from 'node:fs';
import type { DesignDocConfig } from '../runtime/types.js';

export interface LoadedDesignConfig {
  filePath: string;
  config: DesignDocConfig;
}

export function loadDesignConfigs(paths: string[]): LoadedDesignConfig[] {
  return paths.map((filePath) => ({
    filePath,
    config: JSON.parse(fs.readFileSync(filePath, 'utf8')) as DesignDocConfig
  }));
}
