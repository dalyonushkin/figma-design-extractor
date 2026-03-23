import path from 'node:path';
import type { ImageFormat, NormalizedFigmaRef } from './types.js';

export function sanitizeNodeId(nodeId: string): string {
  return nodeId.replace(/:/g, '_');
}

export function buildAssetRelativePath(ref: NormalizedFigmaRef, format: ImageFormat): string {
  return path.posix.join(ref.fileKey, `${sanitizeNodeId(ref.nodeId)}.${format}`);
}

export function buildAssetUrl(assetsBaseUrl: string, ref: NormalizedFigmaRef, format: ImageFormat): string {
  const cleanBase = assetsBaseUrl.replace(/\/$/, '');
  return `${cleanBase}/${buildAssetRelativePath(ref, format)}`;
}

export function buildAssetAbsolutePath(assetsDir: string, ref: NormalizedFigmaRef, format: ImageFormat): string {
  return path.join(assetsDir, ref.fileKey, `${sanitizeNodeId(ref.nodeId)}.${format}`);
}
