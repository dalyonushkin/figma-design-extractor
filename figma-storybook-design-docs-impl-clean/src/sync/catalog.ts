import fs from 'node:fs';
import path from 'node:path';
import type { DesignCatalog, ResolvedDesignEntity } from '../runtime/types.js';

export interface CatalogIndex {
  catalog: DesignCatalog;
  byRef: Map<string, ResolvedDesignEntity>;
}

export function loadCatalog(catalogPath: string): CatalogIndex {
  const catalog = JSON.parse(fs.readFileSync(path.resolve(catalogPath), 'utf8')) as DesignCatalog;
  const byRef = new Map<string, ResolvedDesignEntity>();
  for (const entity of catalog.pages) byRef.set(entity.designRef, entity);
  for (const entity of catalog.componentSets) byRef.set(entity.designRef, entity);
  for (const entity of catalog.components) byRef.set(entity.designRef, entity);
  for (const entity of catalog.instances) byRef.set(entity.designRef, entity);
  return { catalog, byRef };
}
