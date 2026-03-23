import fs from 'node:fs/promises';
import path from 'node:path';
import type { ImageFormat } from '../runtime/types.js';

interface ImageResponse {
  images: Record<string, string | null>;
}

export async function fetchImageUrls(
  fileKey: string,
  nodeIds: string[],
  token: string,
  format: ImageFormat,
  scale: number
): Promise<Record<string, string>> {
  const url = new URL(`https://api.figma.com/v1/images/${fileKey}`);
  url.searchParams.set('ids', nodeIds.join(','));
  url.searchParams.set('format', format);
  url.searchParams.set('scale', String(scale));

  const response = await fetch(url, {
    headers: {
      'X-Figma-Token': token
    }
  });

  if (!response.ok) {
    throw new Error(`Figma images request failed (${response.status}) for file ${fileKey}.`);
  }

  const payload = await response.json() as ImageResponse;
  const result: Record<string, string> = {};
  for (const [nodeId, imageUrl] of Object.entries(payload.images ?? {})) {
    if (imageUrl) result[nodeId] = imageUrl;
  }
  return result;
}

export async function downloadBinary(url: string, absolutePath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image (${response.status}) from ${url}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, Buffer.from(arrayBuffer));
}
