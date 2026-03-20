
import type {
  DesignCatalog,
  DesignComponent,
  DesignComponentSet,
  DesignInstance,
  DesignPage,
  DesignReview,
  DesignUsage,
  FigmaApiFileResponse,
  FigmaFileConfig,
  FigmaNode,
  FilesOutput,
  PropertyDefinition,
  PropertyValue,
  ReviewCandidate,
  SourceFileMeta,
  ToolConfig,
  UsagePage,
  ComponentUsageSummary
} from './types.js';
import { designRef, normalizeName, sleep, splitPropertyName } from './utils.js';

interface ExtractContext {
  includeNodePath: boolean;
  includeReviewCandidates: boolean;
  reviewCandidateTypes: Set<string>;
}

interface RawExtraction {
  filesOutput: FilesOutput;
  catalog: DesignCatalog;
  usage: DesignUsage;
  review: DesignReview;
}

export function normalizePropertyDefinitions(defs: FigmaNode['componentPropertyDefinitions']): PropertyDefinition[] {
  if (!defs) {
    return [];
  }
  return Object.entries(defs)
    .map(([propertyKey, def]) => ({
      propertyKey,
      name: splitPropertyName(propertyKey),
      type: String(def.type ?? 'UNKNOWN'),
      defaultValue: def.defaultValue,
      variantOptions: Array.isArray(def.variantOptions) ? [...def.variantOptions].sort() : undefined,
      preferredValues: Array.isArray(def.preferredValues)
        ? [...def.preferredValues].map((item) => ({
            type: item.type,
            key: item.key,
            name: item.name
          }))
        : undefined
    }))
    .sort((a, b) => a.propertyKey.localeCompare(b.propertyKey));
}

export function normalizePropertyValues(values: FigmaNode['componentProperties']): PropertyValue[] {
  if (!values) {
    return [];
  }
  return Object.entries(values)
    .map(([propertyKey, value]) => ({
      propertyKey,
      name: splitPropertyName(propertyKey),
      type: String(value.type ?? 'UNKNOWN'),
      value: value.value,
      preferredValues: Array.isArray(value.preferredValues)
        ? [...value.preferredValues].map((item) => ({
            type: item.type,
            key: item.key,
            name: item.name
          }))
        : undefined
    }))
    .sort((a, b) => a.propertyKey.localeCompare(b.propertyKey));
}

export async function extractAllFiles(
  config: ToolConfig,
  fileResponses: Array<{ file: FigmaFileConfig; response: FigmaApiFileResponse }>
): Promise<RawExtraction> {
  const generatedAt = new Date().toISOString();
  const context: ExtractContext = {
    includeNodePath: config.options?.includeNodePath !== false,
    includeReviewCandidates: config.options?.includeReviewCandidates !== false,
    reviewCandidateTypes: new Set(config.options?.reviewCandidateTypes ?? ['FRAME', 'GROUP', 'SECTION'])
  };

  const filesMeta: SourceFileMeta[] = [];
  const pages: DesignPage[] = [];
  const componentSets: DesignComponentSet[] = [];
  const components: DesignComponent[] = [];
  const instances: DesignInstance[] = [];
  const reviewCandidates: ReviewCandidate[] = [];

  for (const { file, response } of fileResponses) {
    filesMeta.push({
      fileKey: file.fileKey,
      alias: file.alias,
      name: response.name,
      version: response.version,
      lastModified: response.lastModified,
      schemaVersion: response.schemaVersion,
      editorType: response.editorType,
      extractedAt: generatedAt
    });

    const localPages: DesignPage[] = [];
    const localComponentSets: DesignComponentSet[] = [];
    const localComponents: DesignComponent[] = [];
    const localInstances: DesignInstance[] = [];
    const localReviewCandidates: ReviewCandidate[] = [];

    walkTree({
      fileKey: file.fileKey,
      node: response.document,
      ancestors: [],
      currentPageRef: null,
      localPages,
      localComponentSets,
      localComponents,
      localInstances,
      localReviewCandidates,
      context
    });

    pages.push(...localPages);
    componentSets.push(...localComponentSets);
    components.push(...localComponents);
    instances.push(...localInstances);
    reviewCandidates.push(...localReviewCandidates);

    const delay = config.options?.requestDelayMs ?? 0;
    if (delay > 0) {
      await sleep(delay);
    }
  }

  const catalog: DesignCatalog = {
    generatedAt,
    pages: pages.sort((a, b) => a.designRef.localeCompare(b.designRef)),
    componentSets: componentSets.sort((a, b) => a.designRef.localeCompare(b.designRef)),
    components: components.sort((a, b) => a.designRef.localeCompare(b.designRef)),
    instances: instances.sort((a, b) => a.designRef.localeCompare(b.designRef))
  };

  const usage = buildUsage(catalog);
  const review: DesignReview = {
    generatedAt,
    reviewCandidates: reviewCandidates.sort((a, b) => a.designRef.localeCompare(b.designRef))
  };

  return {
    filesOutput: {
      generatedAt,
      files: filesMeta.sort((a, b) => a.fileKey.localeCompare(b.fileKey))
    },
    catalog,
    usage,
    review
  };
}

function walkTree(params: {
  fileKey: string;
  node: FigmaNode;
  ancestors: FigmaNode[];
  currentPageRef: string | null;
  localPages: DesignPage[];
  localComponentSets: DesignComponentSet[];
  localComponents: DesignComponent[];
  localInstances: DesignInstance[];
  localReviewCandidates: ReviewCandidate[];
  context: ExtractContext;
}): void {
  const { fileKey, node, ancestors, localPages, localComponentSets, localComponents, localInstances, localReviewCandidates, context } = params;
  const thisDesignRef = designRef(fileKey, node.id);
  const pageNode = node.type === 'CANVAS' ? node : ancestors.find((ancestor) => ancestor.type === 'CANVAS');
  const pageRef = pageNode ? designRef(fileKey, pageNode.id) : null;
  const path = context.includeNodePath ? [...ancestors, node].map((item) => item.name ?? item.type) : undefined;

  if (node.type === 'CANVAS') {
    localPages.push({
      entityType: 'PAGE',
      fileKey,
      nodeId: node.id,
      designRef: thisDesignRef,
      name: node.name ?? node.id,
      path
    });
  }

  if (node.type === 'COMPONENT_SET') {
    const childComponentRefs = (node.children ?? [])
      .filter((child) => child.type === 'COMPONENT')
      .map((child) => designRef(fileKey, child.id))
      .sort();
    localComponentSets.push({
      entityType: 'COMPONENT_SET',
      fileKey,
      nodeId: node.id,
      designRef: thisDesignRef,
      name: node.name ?? node.id,
      propertyDefinitions: normalizePropertyDefinitions(node.componentPropertyDefinitions),
      childComponentRefs,
      pageRef,
      path,
      description: typeof node.description === 'string' ? node.description : undefined
    });
  }

  if (node.type === 'COMPONENT') {
    const parentComponentSet = ancestors.find((ancestor) => ancestor.type === 'COMPONENT_SET');
    localComponents.push({
      entityType: 'COMPONENT',
      fileKey,
      nodeId: node.id,
      designRef: thisDesignRef,
      name: node.name ?? node.id,
      componentSetRef: parentComponentSet ? designRef(fileKey, parentComponentSet.id) : null,
      pageRef,
      propertyDefinitions: normalizePropertyDefinitions(node.componentPropertyDefinitions),
      variantProperties: stableVariantProperties(node.variantProperties),
      path,
      description: typeof node.description === 'string' ? node.description : undefined
    });
  }

  if (node.type === 'INSTANCE') {
    localInstances.push({
      entityType: 'INSTANCE',
      fileKey,
      nodeId: node.id,
      designRef: thisDesignRef,
      name: node.name ?? node.id,
      componentRef: typeof node.componentId === 'string' ? designRef(fileKey, node.componentId) : null,
      pageRef,
      componentProperties: normalizePropertyValues(node.componentProperties),
      path
    });
  }

  if (
    context.includeReviewCandidates &&
    context.reviewCandidateTypes.has(node.type) &&
    shouldCreateReviewCandidate(node)
  ) {
    const { possibleMatches, confidence, kind } = buildReviewMatch(node, fileKey, localComponentSets, localComponents);
    if (possibleMatches.length > 0) {
      localReviewCandidates.push({
        fileKey,
        nodeId: node.id,
        designRef: thisDesignRef,
        pageRef,
        name: node.name ?? node.id,
        nodeType: node.type,
        kind,
        confidence,
        possibleMatches,
        path
      });
    }
  }

  for (const child of node.children ?? []) {
    walkTree({
      fileKey,
      node: child,
      ancestors: [...ancestors, node],
      currentPageRef: pageRef,
      localPages,
      localComponentSets,
      localComponents,
      localInstances,
      localReviewCandidates,
      context
    });
  }
}

function stableVariantProperties(input: FigmaNode['variantProperties']): Record<string, string> {
  if (!input) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(input)
      .map(([key, value]) => [key, String(value)] as const)
      .sort(([left], [right]) => left.localeCompare(right))
  );
}

function shouldCreateReviewCandidate(node: FigmaNode): boolean {
  if (!node.name || !node.name.trim()) {
    return false;
  }
  return node.visible !== false;
}

function buildReviewMatch(
  node: FigmaNode,
  fileKey: string,
  componentSets: DesignComponentSet[],
  components: DesignComponent[]
): { possibleMatches: string[]; confidence: number; kind: ReviewCandidate['kind'] } {
  const target = normalizeName(node.name ?? '');
  if (!target) {
    return { possibleMatches: [], confidence: 0, kind: 'name-similar-candidate' };
  }

  const candidates = [...componentSets, ...components]
    .map((entity) => {
      const normalized = normalizeName(entity.name);
      let confidence = 0;
      if (!normalized) {
        confidence = 0;
      } else if (normalized === target) {
        confidence = 0.96;
      } else if (normalized.includes(target) || target.includes(normalized)) {
        confidence = 0.82;
      } else if (normalized.split(' ').some((part) => target.includes(part)) && target.length > 2) {
        confidence = 0.67;
      }
      return {
        designRef: entity.designRef,
        confidence
      };
    })
    .filter((item) => item.confidence >= 0.67)
    .sort((a, b) => b.confidence - a.confidence || a.designRef.localeCompare(b.designRef))
    .slice(0, 5);

  return {
    possibleMatches: candidates.map((item) => item.designRef),
    confidence: candidates[0]?.confidence ?? 0,
    kind: candidates.some((item) => item.confidence >= 0.9) ? 'detached-candidate' : 'name-similar-candidate'
  };
}

function buildUsage(catalog: DesignCatalog): DesignUsage {
  const pageMap = new Map<string, UsagePage>();
  const componentUsage = new Map<string, { totalCount: number; pageRefs: Set<string> }>();

  const pagesByRef = new Map(catalog.pages.map((page) => [page.designRef, page]));
  for (const page of catalog.pages) {
    pageMap.set(page.designRef, {
      pageRef: page.designRef,
      fileKey: page.fileKey,
      nodeId: page.nodeId,
      name: page.name,
      usedComponents: []
    });
  }

  for (const instance of catalog.instances) {
    if (!instance.pageRef || !instance.componentRef) {
      continue;
    }
    const usagePage = pageMap.get(instance.pageRef);
    if (!usagePage) {
      continue;
    }

    let componentEntry = usagePage.usedComponents.find((item) => item.componentRef === instance.componentRef);
    if (!componentEntry) {
      componentEntry = {
        componentRef: instance.componentRef,
        count: 0,
        instanceRefs: [],
        propertyValues: {}
      };
      usagePage.usedComponents.push(componentEntry);
    }

    componentEntry.count += 1;
    componentEntry.instanceRefs.push(instance.designRef);
    for (const property of instance.componentProperties) {
      const key = property.name;
      const value = stringifyValue(property.value);
      const current = componentEntry.propertyValues[key] ?? [];
      if (!current.includes(value)) {
        current.push(value);
        current.sort();
      }
      componentEntry.propertyValues[key] = current;
    }

    const summary = componentUsage.get(instance.componentRef) ?? { totalCount: 0, pageRefs: new Set<string>() };
    summary.totalCount += 1;
    summary.pageRefs.add(instance.pageRef);
    componentUsage.set(instance.componentRef, summary);
  }

  const pages = [...pageMap.values()]
    .map((page) => ({
      ...page,
      usedComponents: page.usedComponents
        .map((item) => ({
          ...item,
          instanceRefs: [...item.instanceRefs].sort(),
          propertyValues: Object.fromEntries(Object.entries(item.propertyValues).sort(([a], [b]) => a.localeCompare(b)))
        }))
        .sort((a, b) => a.componentRef.localeCompare(b.componentRef))
    }))
    .filter((page) => pagesByRef.has(page.pageRef))
    .sort((a, b) => a.pageRef.localeCompare(b.pageRef));

  const componentsUsage: ComponentUsageSummary[] = [...componentUsage.entries()]
    .map(([componentRef, value]) => ({
      componentRef,
      totalCount: value.totalCount,
      pageRefs: [...value.pageRefs].sort()
    }))
    .sort((a, b) => a.componentRef.localeCompare(b.componentRef));

  return {
    generatedAt: catalog.generatedAt,
    pages,
    componentsUsage
  };
}

function stringifyValue(value: unknown): string {
  if (value === null) {
    return 'null';
  }
  if (value === undefined) {
    return 'undefined';
  }
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value);
}
