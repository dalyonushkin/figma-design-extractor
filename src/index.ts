
import path from 'node:path';
import { loadConfig, resolveToken } from './config.js';
import { buildDiff } from './diff.js';
import { extractAllFiles } from './extract.js';
import { FigmaApiClient } from './figma-api.js';
import { validateMapping } from './mapping.js';
import { buildMarkdownReport } from './report.js';
import type { DesignCatalog, DesignReview, DesignUsage, DiffResult, FilesOutput, MappingRegistry, MappingValidationResult } from './types.js';
import { copyDir, emptyDir, ensureDir, parseArgs, readJsonFile, writeJsonFile } from './utils.js';

async function main(): Promise<void> {
  const [, , command, ...restArgs] = process.argv;
  if (!command) {
    printHelp();
    process.exitCode = 1;
    return;
  }

  const args = parseArgs(restArgs);

  switch (command) {
    case 'extract':
      await runExtract(args);
      return;
    case 'baseline:update':
      await runBaselineUpdate(args);
      return;
    case 'diff':
      await runDiff(args);
      return;
    case 'report':
      await runReport(args);
      return;
    case 'help':
    case '--help':
    case '-h':
      printHelp();
      return;
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

async function runExtract(args: Record<string, string | boolean>): Promise<void> {
  const configPath = String(args.config ?? './config.json');
  const outDir = String(args.out ?? './out/current');

  const config = await loadConfig(configPath);
  const token = resolveToken(config);
  const api = new FigmaApiClient(token, config);

  const responses = [];
  for (const file of config.files) {
    const response = await api.getFile(file);
    responses.push({ file, response });
  }

  const { filesOutput, catalog, usage, review } = await extractAllFiles(config, responses);

  await emptyDir(outDir);
  await writeJsonFile(path.join(outDir, 'figma-files.json'), filesOutput);
  await writeJsonFile(path.join(outDir, 'design-catalog.json'), catalog);
  await writeJsonFile(path.join(outDir, 'design-usage.json'), usage);
  await writeJsonFile(path.join(outDir, 'design-review.json'), review);

  console.log(`Extracted ${responses.length} file(s) into ${outDir}`);
}

async function runBaselineUpdate(args: Record<string, string | boolean>): Promise<void> {
  const fromDir = String(args.from ?? './out/current');
  const baselineDir = String(args.baseline ?? './baseline');
  await copyDir(fromDir, baselineDir);
  console.log(`Baseline updated from ${fromDir} -> ${baselineDir}`);
}

async function runDiff(args: Record<string, string | boolean>): Promise<void> {
  const currentDir = String(args.current ?? './out/current');
  const baselineDir = String(args.baseline ?? './baseline');
  const mappingPath = typeof args.mapping === 'string' ? args.mapping : undefined;
  const outDir = String(args.out ?? './out/diff');

  const baselineFiles = await readJsonFile<FilesOutput>(path.join(baselineDir, 'figma-files.json'));
  const currentFiles = await readJsonFile<FilesOutput>(path.join(currentDir, 'figma-files.json'));
  const baselineCatalog = await readJsonFile<DesignCatalog>(path.join(baselineDir, 'design-catalog.json'));
  const currentCatalog = await readJsonFile<DesignCatalog>(path.join(currentDir, 'design-catalog.json'));
  const baselineUsage = await readJsonFile<DesignUsage>(path.join(baselineDir, 'design-usage.json'));
  const currentUsage = await readJsonFile<DesignUsage>(path.join(currentDir, 'design-usage.json'));
  const baselineReview = await readJsonFile<DesignReview>(path.join(baselineDir, 'design-review.json'));
  const currentReview = await readJsonFile<DesignReview>(path.join(currentDir, 'design-review.json'));

  const diff = buildDiff(
    baselineFiles,
    currentFiles,
    baselineCatalog,
    currentCatalog,
    baselineUsage,
    currentUsage,
    baselineReview,
    currentReview
  );

  await ensureDir(outDir);
  await writeJsonFile(path.join(outDir, 'diff.json'), diff);

  let mappingValidationJson: string | undefined;
  if (mappingPath) {
    const registry = await readJsonFile<MappingRegistry>(mappingPath);
    const validation = validateMapping(registry, currentCatalog);
    await writeJsonFile(path.join(outDir, 'mapping-validation.json'), validation);
    mappingValidationJson = buildMarkdownReport(diff, validation);
  } else {
    mappingValidationJson = buildMarkdownReport(diff);
  }

  await writeTextFile(path.join(outDir, 'report.md'), mappingValidationJson);
  console.log(`Diff written to ${outDir}`);
}

async function runReport(args: Record<string, string | boolean>): Promise<void> {
  const diffPath = String(args.diff ?? './out/diff/diff.json');
  const outPath = String(args.out ?? './out/diff/report.md');
  const mappingValidationPath = typeof args['mapping-validation'] === 'string' ? args['mapping-validation'] : undefined;

  const diff = await readJsonFile<DiffResult>(path.resolve(diffPath));
  const mappingValidation = mappingValidationPath ? await readJsonFile<MappingValidationResult>(path.resolve(mappingValidationPath)) : undefined;
  await writeTextFile(outPath, buildMarkdownReport(diff, mappingValidation));
  console.log(`Report written to ${outPath}`);
}

async function writeTextFile(filePath: string, content: string): Promise<void> {
  const { writeFile } = await import('node:fs/promises');
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, content, 'utf8');
}

function printHelp(): void {
  console.log(`Figma Design Extractor

Usage:
  npm run extract -- --config ./config.json --out ./out/current
  npm run baseline:update -- --from ./out/current --baseline ./baseline
  npm run diff -- --current ./out/current --baseline ./baseline --mapping ./mapping.json --out ./out/diff
  npm run report -- --diff ./out/diff/diff.json --out ./out/diff/report.md
`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
