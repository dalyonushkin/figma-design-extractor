
import type {
  DesignCatalog,
  DesignReview,
  DesignUsage,
  DiffEntityChange,
  DiffResult,
  FilesOutput,
  SourceFileMeta,
  UsagePage,
  ReviewCandidate
} from './types.js';
import { hashJson } from './utils.js';

export function buildDiff(
  baselineFiles: FilesOutput,
  currentFiles: FilesOutput,
  baselineCatalog: DesignCatalog,
  currentCatalog: DesignCatalog,
  baselineUsage: DesignUsage,
  currentUsage: DesignUsage,
  baselineReview: DesignReview,
  currentReview: DesignReview
): DiffResult {
  return {
    generatedAt: new Date().toISOString(),
    files: diffFiles(baselineFiles.files, currentFiles.files),
    catalog: {
      pages: diffEntities('PAGE', baselineCatalog.pages, currentCatalog.pages),
      componentSets: diffEntities('COMPONENT_SET', baselineCatalog.componentSets, currentCatalog.componentSets),
      components: diffEntities('COMPONENT', baselineCatalog.components, currentCatalog.components),
      instances: diffEntities('INSTANCE', baselineCatalog.instances, currentCatalog.instances)
    },
    usage: diffUsage(baselineUsage, currentUsage),
    review: diffReview(baselineReview, currentReview)
  };
}

function diffFiles(before: SourceFileMeta[], after: SourceFileMeta[]): DiffResult['files'] {
  const beforeMap = new Map(before.map((item) => [item.fileKey, item]));
  const afterMap = new Map(after.map((item) => [item.fileKey, item]));

  const added = after.filter((item) => !beforeMap.has(item.fileKey));
  const removed = before.filter((item) => !afterMap.has(item.fileKey));

  const changed = [...new Set([...beforeMap.keys(), ...afterMap.keys()])]
    .map((fileKey) => {
      const left = beforeMap.get(fileKey);
      const right = afterMap.get(fileKey);
      if (!left || !right) {
        return null;
      }
      const changes: string[] = [];
      if (left.version !== right.version) {
        changes.push(`version: ${left.version ?? 'n/a'} -> ${right.version ?? 'n/a'}`);
      }
      if (left.lastModified !== right.lastModified) {
        changes.push(`lastModified: ${left.lastModified ?? 'n/a'} -> ${right.lastModified ?? 'n/a'}`);
      }
      if (left.name !== right.name) {
        changes.push(`name: ${left.name} -> ${right.name}`);
      }
      return changes.length > 0
        ? {
            fileKey,
            before: left,
            after: right,
            changes
          }
        : null;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((a, b) => a.fileKey.localeCompare(b.fileKey));

  return { added, removed, changed };
}

function diffEntities<T extends { designRef: string; entityType: DiffEntityChange['entityType'] }>(
  entityType: DiffEntityChange['entityType'],
  before: T[],
  after: T[]
): DiffEntityChange[] {
  const beforeMap = new Map(before.map((item) => [item.designRef, item]));
  const afterMap = new Map(after.map((item) => [item.designRef, item]));
  const refs = [...new Set([...beforeMap.keys(), ...afterMap.keys()])].sort();

  const changes: DiffEntityChange[] = [];
  for (const ref of refs) {
    const left = beforeMap.get(ref);
    const right = afterMap.get(ref);
    if (!left && right) {
      changes.push({ designRef: ref, entityType, kind: 'added', after: right });
      continue;
    }
    if (left && !right) {
      changes.push({ designRef: ref, entityType, kind: 'removed', before: left });
      continue;
    }
    if (left && right && hashJson(left) !== hashJson(right)) {
      changes.push({ designRef: ref, entityType, kind: 'changed', before: left, after: right });
    }
  }
  return changes;
}

function diffUsage(before: DesignUsage, after: DesignUsage): DiffResult['usage'] {
  const beforeMap = new Map(before.pages.map((item) => [item.pageRef, item]));
  const afterMap = new Map(after.pages.map((item) => [item.pageRef, item]));
  const addedPages = after.pages.filter((item) => !beforeMap.has(item.pageRef));
  const removedPages = before.pages.filter((item) => !afterMap.has(item.pageRef));
  const changedPages = [...new Set([...beforeMap.keys(), ...afterMap.keys()])]
    .map((pageRef) => {
      const left = beforeMap.get(pageRef);
      const right = afterMap.get(pageRef);
      if (!left || !right) {
        return null;
      }
      if (hashJson(left) === hashJson(right)) {
        return null;
      }
      return { pageRef, before: left, after: right };
    })
    .filter((item): item is { pageRef: string; before: UsagePage; after: UsagePage } => item !== null)
    .sort((a, b) => a.pageRef.localeCompare(b.pageRef));

  return {
    addedPages,
    removedPages,
    changedPages
  };
}

function diffReview(before: DesignReview, after: DesignReview): DiffResult['review'] {
  const beforeMap = new Map(before.reviewCandidates.map((item) => [item.designRef, item]));
  const afterMap = new Map(after.reviewCandidates.map((item) => [item.designRef, item]));

  const addedCandidates = after.reviewCandidates.filter((item) => !beforeMap.has(item.designRef));
  const removedCandidates = before.reviewCandidates.filter((item) => !afterMap.has(item.designRef));

  return {
    addedCandidates,
    removedCandidates
  };
}
