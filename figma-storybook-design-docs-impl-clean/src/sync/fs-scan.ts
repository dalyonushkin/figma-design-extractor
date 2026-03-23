import fs from 'node:fs';
import path from 'node:path';

export function scanFiles(roots: string[], suffix: string): string[] {
  const result: string[] = [];
  const visited = new Set<string>();

  function walk(currentPath: string): void {
    const absolute = path.resolve(currentPath);
    if (visited.has(absolute)) return;
    visited.add(absolute);

    const stat = fs.statSync(absolute);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(absolute)) {
        walk(path.join(absolute, entry));
      }
      return;
    }

    if (absolute.endsWith(suffix)) {
      result.push(absolute);
    }
  }

  for (const root of roots) {
    if (fs.existsSync(root)) {
      walk(root);
    }
  }

  return result.sort();
}
