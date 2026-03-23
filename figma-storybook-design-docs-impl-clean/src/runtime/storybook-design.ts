import { getDesignDocsContext } from './context.js';
import { buildAssetUrl } from './paths.js';
import { normalizeFigmaRef } from './figma-ref.js';
import type {
  DesignComponent,
  DesignComponentSet,
  DesignDocConfig,
  DesignDocRefConfig,
  ImageFormat,
  MarkdownOptions,
  ScreenshotRequest,
  StorybookDesignParameter
} from './types.js';

function asConfigs(configs: DesignDocConfig | DesignDocConfig[]): DesignDocConfig[] {
  return Array.isArray(configs) ? configs : [configs];
}

function flattenRefs(configs: DesignDocConfig | DesignDocConfig[]): DesignDocRefConfig[] {
  return asConfigs(configs).flatMap((config) => config.refs ?? []);
}

function effectiveImageFormat(config: DesignDocRefConfig): ImageFormat {
  return config.imageFormat ?? 'png';
}

function primaryPanelRef(refs: DesignDocRefConfig[]): DesignDocRefConfig | undefined {
  return refs.find((item) => item.panel) ?? refs[0];
}

function renderValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function explicitDesignRefs(refs: DesignDocRefConfig[]): Set<string> {
  return new Set(refs.map((ref) => normalizeFigmaRef(ref.ref).designRef));
}

function screenshotTargetsForComponentSet(
  configRef: DesignDocRefConfig,
  componentSet: DesignComponentSet,
  explicitRefs: Set<string>
): string[] {
  if (configRef.children === 'all') {
    return componentSet.childComponentRefs;
  }
  if (configRef.children === 'mapped') {
    return componentSet.childComponentRefs.filter((ref) => explicitRefs.has(ref));
  }
  return [];
}

function collectScreenshotRequests(configs: DesignDocConfig | DesignDocConfig[]): ScreenshotRequest[] {
  const refs = flattenRefs(configs);
  const explicitRefs = explicitDesignRefs(refs);
  const { byRef, assetsBaseUrl } = getDesignDocsContext();
  const requests: ScreenshotRequest[] = [];
  const seen = new Set<string>();

  for (const configRef of refs) {
    if ((configRef.screenshots ?? 'none') === 'none') continue;

    const normalized = normalizeFigmaRef(configRef.ref);
    const entity = byRef.get(normalized.designRef);
    if (!entity) continue;

    const format = effectiveImageFormat(configRef);

    if (entity.entityType === 'COMPONENT_SET') {
      const targetRefs = screenshotTargetsForComponentSet(configRef, entity as DesignComponentSet, explicitRefs);
      for (const targetRef of targetRefs) {
        const childEntity = byRef.get(targetRef);
        if (!childEntity || (childEntity.entityType !== 'COMPONENT' && childEntity.entityType !== 'INSTANCE' && childEntity.entityType !== 'PAGE')) {
          continue;
        }
        const childNormalized = normalizeFigmaRef(childEntity.designRef);
        const key = `${childNormalized.designRef}|${format}`;
        if (seen.has(key)) continue;
        seen.add(key);
        requests.push({
          sourceConfigRef: configRef,
          targetEntity: childEntity,
          fileKey: childNormalized.fileKey,
          nodeId: childNormalized.nodeId,
          format,
          assetUrl: buildAssetUrl(assetsBaseUrl, childNormalized, format),
          figmaUrl: childNormalized.figmaUrl
        });
      }
      continue;
    }

    if (entity.entityType !== 'COMPONENT' && entity.entityType !== 'INSTANCE' && entity.entityType !== 'PAGE') {
      continue;
    }

    const key = `${normalized.designRef}|${format}`;
    if (seen.has(key)) continue;
    seen.add(key);
    requests.push({
      sourceConfigRef: configRef,
      targetEntity: entity,
      fileKey: normalized.fileKey,
      nodeId: normalized.nodeId,
      format,
      assetUrl: buildAssetUrl(assetsBaseUrl, normalized, format),
      figmaUrl: normalized.figmaUrl
    });
  }

  return requests;
}

function renderPropertyDefinitions(component: DesignComponent | DesignComponentSet): string[] {
  if (!component.propertyDefinitions.length) return [];
  return [
    '',
    'Properties:',
    ...component.propertyDefinitions.map((property) => {
      const options = property.variantOptions?.length ? ` (options: ${property.variantOptions.join(', ')})` : '';
      return `- \`${property.name}\` — ${property.type}, default: ${renderValue(property.defaultValue)}${options}`;
    })
  ];
}

function renderVariantProperties(component: DesignComponent): string[] {
  const entries = Object.entries(component.variantProperties);
  if (!entries.length) return [];
  return [
    '',
    'Variant values:',
    ...entries.map(([key, value]) => `- \`${key}\` = ${value}`)
  ];
}

function renderChildren(refConfig: DesignDocRefConfig, componentSet: DesignComponentSet, allExplicitRefs: Set<string>): string[] {
  const { byRef } = getDesignDocsContext();
  const childRefs = screenshotTargetsForComponentSet(refConfig, componentSet, allExplicitRefs);
  if (!childRefs.length) return [];
  return [
    '',
    'Children:',
    ...childRefs.map((childRef) => {
      const child = byRef.get(childRef);
      return child
        ? `- [${child.name}](${normalizeFigmaRef(child.designRef).figmaUrl})`
        : `- ${childRef}`;
    })
  ];
}

function renderDetails(refConfig: DesignDocRefConfig, designRef: string, allExplicitRefs: Set<string>): string {
  const { byRef } = getDesignDocsContext();
  const entity = byRef.get(designRef);
  if (!entity) return '';

  const lines: string[] = [];
  if (entity.entityType === 'COMPONENT_SET') {
    lines.push(...renderPropertyDefinitions(entity as DesignComponentSet));
    if ((refConfig.children ?? 'none') !== 'none') {
      const childrenBlock = renderChildren(refConfig, entity as DesignComponentSet, allExplicitRefs);
      if (childrenBlock.length) lines.push(...childrenBlock);
    }
  }
  if (entity.entityType === 'COMPONENT') {
    lines.push(...renderPropertyDefinitions(entity as DesignComponent));
    lines.push(...renderVariantProperties(entity as DesignComponent));
  }
  if (!lines.length) return '';
  const body = lines.join('\n').trim();
  if ((refConfig.view ?? 'collapsed') === 'expanded') {
    return `\n\n${body}`;
  }
  if ((refConfig.view ?? 'collapsed') === 'collapsed') {
    return `\n\n<details><summary>Details</summary>\n\n${body}\n\n</details>`;
  }
  return '';
}

export function toStorybookDesign(configs: DesignDocConfig | DesignDocConfig[]): StorybookDesignParameter | undefined {
  const refs = flattenRefs(configs);
  if (!refs.length) return undefined;
  const candidate = primaryPanelRef(refs);
  if (!candidate) return undefined;
  const normalized = normalizeFigmaRef(candidate.ref);
  return {
    type: 'figma',
    url: normalized.figmaUrl
  };
}

export function toStoryDescriptionMarkdown(
  configs: DesignDocConfig | DesignDocConfig[],
  options: MarkdownOptions = {}
): string {
  const refs = flattenRefs(configs);
  if (!refs.length) return '';

  const heading = options.heading ?? 'Design';
  const { byRef } = getDesignDocsContext();
  const screenshotRequests = collectScreenshotRequests(configs);
  const allExplicitRefs = explicitDesignRefs(refs);
  const screenshotsBySource = new Map<string, ScreenshotRequest[]>();
  for (const request of screenshotRequests) {
    const key = normalizeFigmaRef(request.sourceConfigRef.ref).designRef;
    const list = screenshotsBySource.get(key) ?? [];
    list.push(request);
    screenshotsBySource.set(key, list);
  }

  const lines: string[] = [`### ${heading}`];

  for (const refConfig of refs) {
    const normalized = normalizeFigmaRef(refConfig.ref);
    const entity = byRef.get(normalized.designRef);
    const label = refConfig.label ?? entity?.name ?? normalized.designRef;
    const typeSuffix = entity ? ` — ${entity.entityType}` : '';

    lines.push('', `- [${label}](${normalized.figmaUrl})${typeSuffix}`);

    const refScreenshots = screenshotsBySource.get(normalized.designRef) ?? [];
    if (refScreenshots.length) {
      lines.push('');
      lines.push('  Screenshots:');
      for (const screenshot of refScreenshots) {
        const shotLabel = screenshot.targetEntity.name;
        if ((refConfig.screenshots ?? 'none') === 'embed') {
          lines.push(`  ![${shotLabel}](${screenshot.assetUrl})`);
          lines.push(`  [Open in Figma](${screenshot.figmaUrl})`);
        } else {
          lines.push(`  - [${shotLabel}](${screenshot.assetUrl}) · [Figma](${screenshot.figmaUrl})`);
        }
      }
    } else if ((refConfig.screenshots ?? 'none') !== 'none') {
      lines.push('');
      lines.push(`  Screenshot is not prepared locally — [Open in Figma](${normalized.figmaUrl})`);
    }

    const details = renderDetails(refConfig, normalized.designRef, allExplicitRefs);
    if (details) {
      lines.push(details);
    }
  }

  return lines.join('\n').trim();
}
