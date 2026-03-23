import type { DesignCatalog, DesignDocsInitOptions, ResolvedDesignEntity } from './types.js';

interface DesignDocsRuntimeContext {
  catalog: DesignCatalog;
  assetsBaseUrl: string;
  byRef: Map<string, ResolvedDesignEntity>;
}

let runtimeContext: DesignDocsRuntimeContext | null = null;

function buildIndex(catalog: DesignCatalog): Map<string, ResolvedDesignEntity> {
  const byRef = new Map<string, ResolvedDesignEntity>();
  for (const entity of catalog.pages) byRef.set(entity.designRef, entity);
  for (const entity of catalog.componentSets) byRef.set(entity.designRef, entity);
  for (const entity of catalog.components) byRef.set(entity.designRef, entity);
  for (const entity of catalog.instances) byRef.set(entity.designRef, entity);
  return byRef;
}

export function initDesignDocs(options: DesignDocsInitOptions): void {
  runtimeContext = {
    catalog: options.catalog,
    assetsBaseUrl: options.assetsBaseUrl,
    byRef: buildIndex(options.catalog)
  };
}

export function getDesignDocsContext(): DesignDocsRuntimeContext {
  if (!runtimeContext) {
    throw new Error('Design docs runtime is not initialized. Call initDesignDocs(...) in .storybook/preview.ts first.');
  }
  return runtimeContext;
}
