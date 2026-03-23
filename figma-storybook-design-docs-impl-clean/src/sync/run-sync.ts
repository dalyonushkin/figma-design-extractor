import fs from 'node:fs';
import type { SyncConfig, SyncSummary } from '../runtime/types.js';
import { fetchImageUrls, downloadBinary } from './figma-api.js';
import { scanFiles } from './fs-scan.js';
import { loadCatalog } from './catalog.js';
import { loadDesignConfigs } from './config-loader.js';
import { collectScreenshotRequests } from './planner.js';

export async function runSync(config: SyncConfig): Promise<SyncSummary> {
  const token = process.env[config.figmaTokenEnv ?? 'FIGMA_TOKEN'];
  if (!token) {
    throw new Error(`Environment variable ${config.figmaTokenEnv ?? 'FIGMA_TOKEN'} is required for sync.`);
  }

  const catalog = loadCatalog(config.catalogPath);
  const designConfigPaths = scanFiles(config.designConfigRoots, config.designConfigSuffix ?? '.design.json');
  const designConfigs = loadDesignConfigs(designConfigPaths).map((item) => item.config);
  const plan = collectScreenshotRequests(
    designConfigs,
    catalog,
    config.assetsDir,
    config.defaultImageFormat ?? 'png'
  );

  const missingJobs = plan.jobs.filter((job) => !fs.existsSync(job.absolutePath));
  const jobsByFileAndFormat = new Map<string, typeof missingJobs>();
  for (const job of missingJobs) {
    const key = `${job.fileKey}|${job.format}`;
    const list = jobsByFileAndFormat.get(key) ?? [];
    list.push(job);
    jobsByFileAndFormat.set(key, list);
  }

  let downloaded = 0;
  for (const [, jobs] of jobsByFileAndFormat) {
    const sample = jobs[0];
    const urls = await fetchImageUrls(
      sample.fileKey,
      jobs.map((job) => job.nodeId),
      token,
      sample.format,
      config.imageScale ?? 2
    );

    for (const job of jobs) {
      const imageUrl = urls[job.nodeId];
      if (!imageUrl) {
        plan.warnings.push(`Figma did not return an image URL for ${job.designRef}.`);
        continue;
      }
      await downloadBinary(imageUrl, job.absolutePath);
      downloaded += 1;
    }
  }

  return {
    totalJobs: plan.jobs.length,
    downloaded,
    skipped: plan.jobs.length - missingJobs.length,
    warnings: plan.warnings
  };
}
