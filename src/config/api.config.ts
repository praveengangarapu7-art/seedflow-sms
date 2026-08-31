export interface ApiConfig {
  baseUrl: string;
  timeoutMs: number;
  defaultHeaders: Record<string, string>;
}

const rawBaseUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:5000/api/v1';

const rawTimeout =
  (import.meta.env.VITE_API_TIMEOUT_MS as string | undefined) ?? '15000';

export const apiConfig: ApiConfig = {
  baseUrl: rawBaseUrl.replace(/\/+$/, ''),
  timeoutMs: Number(rawTimeout) || 15000,
  defaultHeaders: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
};

export function buildApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${apiConfig.baseUrl.replace(/\/+$/, '')}/${cleanPath.replace(/^\/+/, '')}`;
}

export function getApiBaseUrl(): string {
  return apiConfig.baseUrl;
}
