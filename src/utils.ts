
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, stat, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';

export function designRef(fileKey: string, nodeId: string): string {
  return `figma://${fileKey}/${nodeId}`;
}

export function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\b(default|desktop|mobile|final|copy|variant|old|legacy)\b/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function splitPropertyName(propertyKey: string): string {
  return propertyKey.split('#')[0] ?? propertyKey;
}

export function stableSortObject<T extends Record<string, unknown>>(value: T): T {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) {
    const entry = value[key];
    out[key] = stableValue(entry);
  }
  return out as T;
}

export function stableValue<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stableValue(item)) as T;
  }
  if (value && typeof value === 'object') {
    return stableSortObject(value as Record<string, unknown>) as T;
  }
  return value;
}

export function stableJson(value: unknown): string {
  return JSON.stringify(stableValue(value), null, 2);
}

export function hashJson(value: unknown): string {
  return createHash('sha256').update(stableJson(value)).digest('hex');
}

export async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

export async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, `${stableJson(value)}\n`, 'utf8');
}

export async function readJsonFile<T>(filePath: string): Promise<T> {
  const content = await readFile(filePath, 'utf8');
  return JSON.parse(content) as T;
}

export async function exists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function emptyDir(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true });
  await ensureDir(dir);
}

export async function copyDir(fromDir: string, toDir: string): Promise<void> {
  await emptyDir(toDir);
  const entries = await readdir(fromDir, { withFileTypes: true });
  for (const entry of entries) {
    const fromPath = path.join(fromDir, entry.name);
    const toPath = path.join(toDir, entry.name);
    if (entry.isDirectory()) {
      await copyDir(fromPath, toPath);
    } else if (entry.isFile()) {
      await ensureDir(path.dirname(toPath));
      await copyFile(fromPath, toPath);
    }
  }
}

export function parseArgs(argv: string[]): Record<string, string | boolean> {
  const result: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg || !arg.startsWith('--')) {
      continue;
    }
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      result[key] = true;
      continue;
    }
    result[key] = next;
    i += 1;
  }
  return result;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
