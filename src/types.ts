
export interface ToolConfig {
  tokenEnv?: string;
  token?: string;
  baseUrl?: string;
  files: FigmaFileConfig[];
  options?: ExtractOptions;
}

export interface FigmaFileConfig {
  fileKey: string;
  alias?: string;
  ids?: string[];
  depth?: number;
  branchData?: boolean;
}

export interface ExtractOptions {
  includeNodePath?: boolean;
  includeReviewCandidates?: boolean;
  reviewCandidateTypes?: string[];
  requestDelayMs?: number;
}

export interface FigmaApiFileResponse {
  name: string;
  lastModified?: string;
  version?: string;
  document: FigmaNode;
  components?: Record<string, unknown>;
  componentSets?: Record<string, unknown>;
  schemaVersion?: number;
  editorType?: string;
  linkAccess?: string;
}

export interface FigmaNode {
  id: string;
  name?: string;
  type: string;
  children?: FigmaNode[];
  componentId?: string;
  componentPropertyDefinitions?: Record<string, FigmaComponentPropertyDefinition>;
  componentProperties?: Record<string, FigmaComponentPropertyValue>;
  variantProperties?: Record<string, string>;
  description?: string;
  visible?: boolean;
  documentationLinks?: Array<{ uri?: string }>;
  devStatus?: { type?: string };
  boundVariables?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface FigmaComponentPropertyDefinition {
  type?: string;
  defaultValue?: unknown;
  variantOptions?: string[];
  preferredValues?: Array<{ type?: string; key?: string; name?: string }>;
  [key: string]: unknown;
}

export interface FigmaComponentPropertyValue {
  type?: string;
  value?: unknown;
  preferredValues?: Array<{ type?: string; key?: string; name?: string }>;
  [key: string]: unknown;
}

export interface SourceFileMeta {
  fileKey: string;
  alias?: string;
  name: string;
  version?: string;
  lastModified?: string;
  schemaVersion?: number;
  editorType?: string;
  extractedAt: string;
}

export interface FilesOutput {
  generatedAt: string;
  files: SourceFileMeta[];
}

export interface PropertyDefinition {
  propertyKey: string;
  name: string;
  type: string;
  defaultValue?: unknown;
  variantOptions?: string[];
  preferredValues?: Array<{ type?: string; key?: string; name?: string }>;
}

export interface PropertyValue {
  propertyKey: string;
  name: string;
  type: string;
  value?: unknown;
  preferredValues?: Array<{ type?: string; key?: string; name?: string }>;
}

export interface DesignPage {
  entityType: 'PAGE';
  fileKey: string;
  nodeId: string;
  designRef: string;
  name: string;
  path?: string[];
}

export interface DesignComponentSet {
  entityType: 'COMPONENT_SET';
  fileKey: string;
  nodeId: string;
  designRef: string;
  name: string;
  propertyDefinitions: PropertyDefinition[];
  childComponentRefs: string[];
  pageRef?: string | null;
  path?: string[];
  description?: string;
}

export interface DesignComponent {
  entityType: 'COMPONENT';
  fileKey: string;
  nodeId: string;
  designRef: string;
  name: string;
  componentSetRef?: string | null;
  pageRef?: string | null;
  propertyDefinitions: PropertyDefinition[];
  variantProperties: Record<string, string>;
  path?: string[];
  description?: string;
}

export interface DesignInstance {
  entityType: 'INSTANCE';
  fileKey: string;
  nodeId: string;
  designRef: string;
  name: string;
  componentRef?: string | null;
  pageRef?: string | null;
  componentProperties: PropertyValue[];
  path?: string[];
}

export interface DesignCatalog {
  generatedAt: string;
  pages: DesignPage[];
  componentSets: DesignComponentSet[];
  components: DesignComponent[];
  instances: DesignInstance[];
}

export interface PageComponentUsage {
  componentRef: string;
  count: number;
  instanceRefs: string[];
  propertyValues: Record<string, string[]>;
}

export interface UsagePage {
  pageRef: string;
  fileKey: string;
  nodeId: string;
  name: string;
  usedComponents: PageComponentUsage[];
}

export interface ComponentUsageSummary {
  componentRef: string;
  totalCount: number;
  pageRefs: string[];
}

export interface DesignUsage {
  generatedAt: string;
  pages: UsagePage[];
  componentsUsage: ComponentUsageSummary[];
}

export interface ReviewCandidate {
  fileKey: string;
  nodeId: string;
  designRef: string;
  pageRef?: string | null;
  name: string;
  nodeType: string;
  kind: 'detached-candidate' | 'name-similar-candidate';
  confidence: number;
  possibleMatches: string[];
  path?: string[];
}

export interface DesignReview {
  generatedAt: string;
  reviewCandidates: ReviewCandidate[];
}

export interface MappingRecord {
  id: string;
  designRef: string;
  codeRef: string;
  relation: 'exact' | 'alias' | 'approximate' | 'composed-by' | 'implemented-by' | 'ignored';
  status: 'active' | 'review' | 'deprecated';
  source: 'manual' | 'suggested';
  notes?: string;
}

export interface MappingRegistry {
  mappings: MappingRecord[];
}

export interface MappingValidationIssue {
  level: 'error' | 'warning';
  code: string;
  message: string;
  mappingId?: string;
  designRef?: string;
  codeRef?: string;
}

export interface MappingValidationResult {
  generatedAt: string;
  summary: {
    totalMappings: number;
    activeMappings: number;
    distinctDesignRefs: number;
    distinctCodeRefs: number;
  };
  issues: MappingValidationIssue[];
  unmappedDesignComponents: string[];
}

export interface DiffEntityChange {
  designRef: string;
  entityType: 'PAGE' | 'COMPONENT_SET' | 'COMPONENT' | 'INSTANCE';
  kind: 'added' | 'removed' | 'changed';
  before?: unknown;
  after?: unknown;
}

export interface DiffResult {
  generatedAt: string;
  files: {
    added: SourceFileMeta[];
    removed: SourceFileMeta[];
    changed: Array<{
      fileKey: string;
      before?: SourceFileMeta;
      after?: SourceFileMeta;
      changes: string[];
    }>;
  };
  catalog: {
    pages: DiffEntityChange[];
    componentSets: DiffEntityChange[];
    components: DiffEntityChange[];
    instances: DiffEntityChange[];
  };
  usage: {
    addedPages: UsagePage[];
    removedPages: UsagePage[];
    changedPages: Array<{
      pageRef: string;
      before?: UsagePage;
      after?: UsagePage;
    }>;
  };
  review: {
    addedCandidates: ReviewCandidate[];
    removedCandidates: ReviewCandidate[];
  };
}
