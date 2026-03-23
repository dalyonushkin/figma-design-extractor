export type RefViewMode = 'link' | 'collapsed' | 'expanded';
export type ScreenshotMode = 'none' | 'link' | 'embed';
export type ChildrenMode = 'none' | 'mapped' | 'all';
export type ImageFormat = 'png' | 'svg';
export type DesignEntityType = 'PAGE' | 'COMPONENT_SET' | 'COMPONENT' | 'INSTANCE';

export interface DesignDocRefConfig {
  ref: string;
  view?: RefViewMode;
  screenshots?: ScreenshotMode;
  children?: ChildrenMode;
  panel?: boolean;
  label?: string;
  imageFormat?: ImageFormat;
}

export interface DesignDocConfig {
  refs: DesignDocRefConfig[];
}

export interface DesignPage {
  entityType: 'PAGE';
  fileKey: string;
  nodeId: string;
  designRef: string;
  name: string;
  path?: string[];
}

export interface PropertyDefinition {
  propertyKey: string;
  name: string;
  type: string;
  defaultValue?: unknown;
  variantOptions?: string[];
}

export interface PropertyValue {
  propertyKey: string;
  name: string;
  type: string;
  value?: unknown;
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
  files?: Array<{
    fileKey: string;
    name?: string;
    version?: string;
    lastModified?: string;
  }>;
  pages: DesignPage[];
  componentSets: DesignComponentSet[];
  components: DesignComponent[];
  instances: DesignInstance[];
}

export interface NormalizedFigmaRef {
  source: string;
  fileKey: string;
  nodeId: string;
  designRef: string;
  figmaUrl: string;
}

export type ResolvedDesignEntity =
  | DesignPage
  | DesignComponentSet
  | DesignComponent
  | DesignInstance;

export interface DesignDocsInitOptions {
  catalog: DesignCatalog;
  assetsBaseUrl: string;
}

export interface StorybookDesignParameter {
  type: 'figma';
  url: string;
}

export interface MarkdownOptions {
  heading?: string;
}

export interface ScreenshotRequest {
  sourceConfigRef: DesignDocRefConfig;
  targetEntity: DesignComponent | DesignInstance | DesignPage;
  fileKey: string;
  nodeId: string;
  format: ImageFormat;
  assetUrl: string;
  figmaUrl: string;
}

export interface SyncConfig {
  catalogPath: string;
  designConfigRoots: string[];
  designConfigSuffix?: string;
  assetsDir: string;
  figmaTokenEnv?: string;
  defaultImageFormat?: ImageFormat;
  imageScale?: number;
}

export interface SyncJob {
  designRef: string;
  fileKey: string;
  nodeId: string;
  format: ImageFormat;
  absolutePath: string;
  relativePath: string;
}

export interface SyncSummary {
  totalJobs: number;
  downloaded: number;
  skipped: number;
  warnings: string[];
}
