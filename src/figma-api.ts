
import type { FigmaApiFileResponse, FigmaFileConfig, ToolConfig } from './types.js';

export class FigmaApiClient {
  private readonly token: string;
  private readonly baseUrl: string;

  constructor(token: string, config: ToolConfig) {
    this.token = token;
    this.baseUrl = config.baseUrl ?? 'https://api.figma.com/v1';
  }

  async getFile(file: FigmaFileConfig): Promise<FigmaApiFileResponse> {
    const params = new URLSearchParams();
    if (typeof file.branchData === 'boolean') {
      params.set('branch_data', String(file.branchData));
    }
    if (typeof file.depth === 'number') {
      params.set('depth', String(file.depth));
    }
    if (Array.isArray(file.ids) && file.ids.length > 0) {
      params.set('ids', file.ids.join(','));
    }

    const url = `${this.baseUrl}/files/${encodeURIComponent(file.fileKey)}${params.size > 0 ? `?${params.toString()}` : ''}`;

    const response = await fetch(url, {
      headers: {
        'X-Figma-Token': this.token
      }
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Figma API GET ${url} failed with ${response.status}: ${text}`);
    }

    return (await response.json()) as FigmaApiFileResponse;
  }
}
