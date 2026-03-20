
import type {
  DesignCatalog,
  MappingRegistry,
  MappingValidationIssue,
  MappingValidationResult
} from './types.js';

export function validateMapping(registry: MappingRegistry, catalog: DesignCatalog): MappingValidationResult {
  const generatedAt = new Date().toISOString();
  const issues: MappingValidationIssue[] = [];
  const mappingIds = new Set<string>();
  const designRefsInCatalog = new Set([
    ...catalog.componentSets.map((item) => item.designRef),
    ...catalog.components.map((item) => item.designRef)
  ]);
  const mappedDesignRefs = new Set<string>();

  for (const mapping of registry.mappings) {
    if (mappingIds.has(mapping.id)) {
      issues.push({
        level: 'error',
        code: 'duplicate-mapping-id',
        message: `Duplicate mapping id: ${mapping.id}`,
        mappingId: mapping.id
      });
    } else {
      mappingIds.add(mapping.id);
    }

    if (!designRefsInCatalog.has(mapping.designRef) && mapping.relation !== 'ignored') {
      issues.push({
        level: 'warning',
        code: 'unknown-design-ref',
        message: `Mapping refers to design ref not found in catalog: ${mapping.designRef}`,
        mappingId: mapping.id,
        designRef: mapping.designRef,
        codeRef: mapping.codeRef
      });
    }

    if (mapping.status === 'active' && mapping.relation !== 'ignored') {
      mappedDesignRefs.add(mapping.designRef);
    }
  }

  const unmappedDesignComponents = [
    ...catalog.components.map((item) => item.designRef),
    ...catalog.componentSets.map((item) => item.designRef)
  ]
    .filter((designRef) => !mappedDesignRefs.has(designRef))
    .sort();

  return {
    generatedAt,
    summary: {
      totalMappings: registry.mappings.length,
      activeMappings: registry.mappings.filter((item) => item.status === 'active').length,
      distinctDesignRefs: new Set(registry.mappings.map((item) => item.designRef)).size,
      distinctCodeRefs: new Set(registry.mappings.map((item) => item.codeRef)).size
    },
    issues: issues.sort((a, b) => `${a.level}:${a.code}:${a.mappingId ?? ''}`.localeCompare(`${b.level}:${b.code}:${b.mappingId ?? ''}`)),
    unmappedDesignComponents
  };
}
