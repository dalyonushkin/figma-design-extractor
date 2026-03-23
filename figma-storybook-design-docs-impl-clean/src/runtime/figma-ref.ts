import type { NormalizedFigmaRef } from './types.js';

function normalizeNodeId(value: string): string {
  return value.trim().replace(/-/g, ':');
}

function encodeNodeIdForUrl(nodeId: string): string {
  return encodeURIComponent(nodeId.replace(/:/g, '-'));
}

export function buildFigmaUrl(fileKey: string, nodeId: string): string {
  return `https://www.figma.com/file/${fileKey}/?node-id=${encodeNodeIdForUrl(nodeId)}`;
}

export function normalizeFigmaRef(source: string): NormalizedFigmaRef {
  if (source.startsWith('figma://')) {
    const match = source.match(/^figma:\/\/([^/]+)\/(.+)$/);
    if (!match) {
      throw new Error(`Invalid figma ref: ${source}`);
    }
    const fileKey = match[1];
    const nodeId = normalizeNodeId(match[2]);
    return {
      source,
      fileKey,
      nodeId,
      designRef: `figma://${fileKey}/${nodeId}`,
      figmaUrl: buildFigmaUrl(fileKey, nodeId)
    };
  }

  let url: URL;
  try {
    url = new URL(source);
  } catch {
    throw new Error(`Unsupported Figma ref: ${source}`);
  }

  if (!/^https?:$/.test(url.protocol) || !url.hostname.includes('figma.com')) {
    throw new Error(`Unsupported Figma URL: ${source}`);
  }

  const pathParts = url.pathname.split('/').filter(Boolean);
  const fileKey = pathParts[1];
  const rawNodeId = url.searchParams.get('node-id');

  if (!fileKey || !rawNodeId) {
    throw new Error(`Figma URL must contain file key and node-id: ${source}`);
  }

  const nodeId = normalizeNodeId(rawNodeId);
  return {
    source,
    fileKey,
    nodeId,
    designRef: `figma://${fileKey}/${nodeId}`,
    figmaUrl: source
  };
}
