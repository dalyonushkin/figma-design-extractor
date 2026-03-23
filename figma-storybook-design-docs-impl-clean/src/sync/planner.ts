import { normalizeFigmaRef } from '../runtime/figma-ref.js';
import { buildAssetAbsolutePath, buildAssetRelativePath } from '../runtime/paths.js';
import type {
  DesignComponentSet,
  DesignDocConfig,
  DesignDocRefConfig,
  ImageFormat,
  SyncJob
} from '../runtime/types.js';
import type { CatalogIndex } from './catalog.js';

function flattenRefs(configs: DesignDocConfig[]): DesignDocRefConfig[] {
  return configs.flatMap((config) => config.refs ?? []);
}

function explicitRefs(configs: DesignDocConfig[]): Set<string> {
  return new Set(flattenRefs(configs).map((ref) => normalizeFigmaRef(ref.ref).designRef));
}

function targetChildRefs(componentSet: DesignComponentSet, refConfig: DesignDocRefConfig, allExplicitRefs: Set<string>): string[] {
  if ((refConfig.children ?? 'none') === 'all') {
    return componentSet.childComponentRefs;
  }
  if ((refConfig.children ?? 'none') === 'mapped') {
    return componentSet.childComponentRefs.filter((ref) => allExplicitRefs.has(ref));
  }
  return [];
}

export function collectScreenshotRequests(
  configs: DesignDocConfig[],
  catalog: CatalogIndex,
  assetsDir: string,
  defaultImageFormat: ImageFormat
): { jobs: SyncJob[]; warnings: string[] } {
  const allRefs = flattenRefs(configs);
  const allExplicitRefs = explicitRefs(configs);
  const warnings: string[] = [];
  const jobs = new Map<string, SyncJob>();

  for (const refConfig of allRefs) {
    if ((refConfig.screenshots ?? 'none') === 'none') continue;

    const normalized = normalizeFigmaRef(refConfig.ref);
    const entity = catalog.byRef.get(normalized.designRef);
    if (!entity) {
      warnings.push(`Ref ${normalized.designRef} was not found in design-catalog.json.`);
      continue;
    }

    const format = refConfig.imageFormat ?? defaultImageFormat;

    if (entity.entityType === 'COMPONENT_SET') {
      const refs = targetChildRefs(entity as DesignComponentSet, refConfig, allExplicitRefs);
      if (!refs.length) {
        warnings.push(`Component set ${entity.designRef} requested screenshots, but no child components were selected.`);
        continue;
      }
      for (const childRef of refs) {
        const child = catalog.byRef.get(childRef);
        if (!child) {
          warnings.push(`Child ref ${childRef} was not found in design-catalog.json.`);
          continue;
        }
        const childNormalized = normalizeFigmaRef(child.designRef);
        const key = `${childNormalized.designRef}|${format}`;
        if (jobs.has(key)) continue;
        jobs.set(key, {
          designRef: childNormalized.designRef,
          fileKey: childNormalized.fileKey,
          nodeId: childNormalized.nodeId,
          format,
          absolutePath: buildAssetAbsolutePath(assetsDir, childNormalized, format),
          relativePath: buildAssetRelativePath(childNormalized, format)
        });
      }
      continue;
    }

    const key = `${normalized.designRef}|${format}`;
    if (jobs.has(key)) continue;
    jobs.set(key, {
      designRef: normalized.designRef,
      fileKey: normalized.fileKey,
      nodeId: normalized.nodeId,
      format,
      absolutePath: buildAssetAbsolutePath(assetsDir, normalized, format),
      relativePath: buildAssetRelativePath(normalized, format)
    });
  }

  return {
    jobs: Array.from(jobs.values()).sort((a, b) => a.relativePath.localeCompare(b.relativePath)),
    warnings
  };
}
