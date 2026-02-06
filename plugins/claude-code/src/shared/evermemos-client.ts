import { config } from './config.js';
import { logger } from './logger.js';
import type {
  MemorizePayload,
  SearchParams,
  FetchParams,
  ConversationMetaPayload,
  ApiResponse,
  MemorizeResult,
  SearchResult,
  FetchResult,
} from './types.js';

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  timeoutMs: number,
  maxRetries: number = 2,
): Promise<Response> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timer);

      // Don't retry 4xx errors
      if (response.status >= 400 && response.status < 500) {
        return response;
      }

      // Retry 5xx errors
      if (response.status >= 500 && attempt < maxRetries) {
        lastError = new Error(`Server error: ${response.status}`);
        const delay = 500 * Math.pow(2, attempt);
        logger.warn(`Retry ${attempt + 1}/${maxRetries} after ${delay}ms (status ${response.status})`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      return response;
    } catch (err) {
      clearTimeout(timer);
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt < maxRetries && !(err instanceof DOMException && (err as any).name === 'AbortError')) {
        const delay = 500 * Math.pow(2, attempt);
        logger.warn(`Retry ${attempt + 1}/${maxRetries} after ${delay}ms (${lastError.message})`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
    }
  }

  throw lastError || new Error('Request failed');
}

export class EverMemOSClient {
  private baseUrl: string;
  private timeoutMs: number;

  constructor(baseUrl?: string, timeoutMs?: number) {
    this.baseUrl = baseUrl || config.url;
    this.timeoutMs = timeoutMs || config.timeoutMs;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(`${this.baseUrl}/api/v1/memories?limit=1`, {
        signal: controller.signal,
      });
      clearTimeout(timer);
      return response.ok;
    } catch {
      return false;
    }
  }

  async storeMessage(payload: MemorizePayload): Promise<ApiResponse<MemorizeResult>> {
    const url = `${this.baseUrl}/api/v1/memories`;
    logger.debug(`POST ${url}`, { message_id: payload.message_id });

    const response = await fetchWithRetry(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      this.timeoutMs,
    );

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`storeMessage failed (${response.status}): ${text}`);
    }

    return (await response.json()) as ApiResponse<MemorizeResult>;
  }

  async searchMemories(params: SearchParams): Promise<ApiResponse<SearchResult>> {
    const searchParams = new URLSearchParams();
    if (params.query) searchParams.set('query', params.query);
    if (params.retrieve_method) searchParams.set('retrieve_method', params.retrieve_method);
    if (params.memory_types) searchParams.set('memory_types', params.memory_types);
    if (params.user_id) searchParams.set('user_id', params.user_id);
    if (params.group_id) searchParams.set('group_id', params.group_id);
    if (params.top_k !== undefined) searchParams.set('top_k', String(params.top_k));

    const url = `${this.baseUrl}/api/v1/memories/search?${searchParams}`;
    logger.debug(`GET ${url}`);

    const response = await fetchWithRetry(url, { method: 'GET' }, this.timeoutMs);

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`searchMemories failed (${response.status}): ${text}`);
    }

    return (await response.json()) as ApiResponse<SearchResult>;
  }

  async fetchMemories(params: FetchParams): Promise<ApiResponse<FetchResult>> {
    const searchParams = new URLSearchParams();
    if (params.memory_type) searchParams.set('memory_type', params.memory_type);
    if (params.user_id) searchParams.set('user_id', params.user_id);
    if (params.group_id) searchParams.set('group_id', params.group_id);
    if (params.limit !== undefined) searchParams.set('limit', String(params.limit));
    if (params.offset !== undefined) searchParams.set('offset', String(params.offset));

    const url = `${this.baseUrl}/api/v1/memories?${searchParams}`;
    logger.debug(`GET ${url}`);

    const response = await fetchWithRetry(url, { method: 'GET' }, this.timeoutMs);

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`fetchMemories failed (${response.status}): ${text}`);
    }

    return (await response.json()) as ApiResponse<FetchResult>;
  }

  async saveConversationMeta(data: ConversationMetaPayload): Promise<ApiResponse<unknown>> {
    const url = `${this.baseUrl}/api/v1/memories/conversation-meta`;
    logger.debug(`POST ${url}`, { group_id: data.group_id });

    const response = await fetchWithRetry(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
      this.timeoutMs,
    );

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`saveConversationMeta failed (${response.status}): ${text}`);
    }

    return (await response.json()) as ApiResponse<unknown>;
  }
}
