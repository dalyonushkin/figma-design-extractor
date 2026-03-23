#!/usr/bin/env node
import { loadSyncConfig } from '../sync/config.js';
import { runSync } from '../sync/run-sync.js';

async function main(): Promise<void> {
  const configPath = process.argv[2];
  if (!configPath) {
    throw new Error('Usage: design-sync <path-to-design-sync.config.json>');
  }

  const config = loadSyncConfig(configPath);
  const summary = await runSync(config);

  console.log(`Total jobs: ${summary.totalJobs}`);
  console.log(`Downloaded: ${summary.downloaded}`);
  console.log(`Skipped (already present): ${summary.skipped}`);
  if (summary.warnings.length) {
    console.log('Warnings:');
    for (const warning of summary.warnings) {
      console.log(`- ${warning}`);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
