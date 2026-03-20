
import type { DiffResult, MappingValidationResult } from './types.js';

export function buildMarkdownReport(diff: DiffResult, mappingValidation?: MappingValidationResult): string {
  const lines: string[] = [];

  lines.push('# Figma drift report');
  lines.push('');
  lines.push(`Generated at: ${diff.generatedAt}`);
  lines.push('');

  lines.push('## File changes');
  lines.push('');
  lines.push(`- Added files: ${diff.files.added.length}`);
  lines.push(`- Removed files: ${diff.files.removed.length}`);
  lines.push(`- Changed files: ${diff.files.changed.length}`);
  lines.push('');

  for (const changed of diff.files.changed) {
    lines.push(`### ${changed.fileKey}`);
    for (const entry of changed.changes) {
      lines.push(`- ${entry}`);
    }
    lines.push('');
  }

  lines.push('## Catalog changes');
  lines.push('');
  lines.push(`- Pages: ${diff.catalog.pages.length}`);
  lines.push(`- Component sets: ${diff.catalog.componentSets.length}`);
  lines.push(`- Components: ${diff.catalog.components.length}`);
  lines.push(`- Instances: ${diff.catalog.instances.length}`);
  lines.push('');

  appendEntitySection(lines, 'Pages', diff.catalog.pages);
  appendEntitySection(lines, 'Component sets', diff.catalog.componentSets);
  appendEntitySection(lines, 'Components', diff.catalog.components);
  appendEntitySection(lines, 'Instances', diff.catalog.instances);

  lines.push('## Usage changes');
  lines.push('');
  lines.push(`- Added usage pages: ${diff.usage.addedPages.length}`);
  lines.push(`- Removed usage pages: ${diff.usage.removedPages.length}`);
  lines.push(`- Changed usage pages: ${diff.usage.changedPages.length}`);
  lines.push('');

  if (diff.usage.changedPages.length > 0) {
    lines.push('### Changed usage pages');
    for (const item of diff.usage.changedPages.slice(0, 50)) {
      lines.push(`- ${item.pageRef}`);
    }
    lines.push('');
  }

  lines.push('## Review candidates');
  lines.push('');
  lines.push(`- Added candidates: ${diff.review.addedCandidates.length}`);
  lines.push(`- Removed candidates: ${diff.review.removedCandidates.length}`);
  lines.push('');

  if (mappingValidation) {
    lines.push('## Mapping validation');
    lines.push('');
    lines.push(`- Total mappings: ${mappingValidation.summary.totalMappings}`);
    lines.push(`- Active mappings: ${mappingValidation.summary.activeMappings}`);
    lines.push(`- Distinct design refs: ${mappingValidation.summary.distinctDesignRefs}`);
    lines.push(`- Distinct code refs: ${mappingValidation.summary.distinctCodeRefs}`);
    lines.push(`- Issues: ${mappingValidation.issues.length}`);
    lines.push(`- Unmapped design components/sets: ${mappingValidation.unmappedDesignComponents.length}`);
    lines.push('');

    if (mappingValidation.issues.length > 0) {
      lines.push('### Mapping issues');
      for (const issue of mappingValidation.issues.slice(0, 100)) {
        lines.push(`- [${issue.level}] ${issue.code}: ${issue.message}`);
      }
      lines.push('');
    }

    if (mappingValidation.unmappedDesignComponents.length > 0) {
      lines.push('### Unmapped design refs');
      for (const designRef of mappingValidation.unmappedDesignComponents.slice(0, 100)) {
        lines.push(`- ${designRef}`);
      }
      lines.push('');
    }
  }

  return `${lines.join('\n').trim()}\n`;
}

function appendEntitySection(lines: string[], title: string, changes: DiffResult['catalog']['components']): void {
  if (changes.length === 0) {
    return;
  }
  lines.push(`### ${title}`);
  const added = changes.filter((item) => item.kind === 'added').length;
  const removed = changes.filter((item) => item.kind === 'removed').length;
  const changed = changes.filter((item) => item.kind === 'changed').length;
  lines.push(`- Added: ${added}`);
  lines.push(`- Removed: ${removed}`);
  lines.push(`- Changed: ${changed}`);
  for (const item of changes.slice(0, 50)) {
    lines.push(`- ${item.kind.toUpperCase()} ${item.designRef}`);
  }
  lines.push('');
}
