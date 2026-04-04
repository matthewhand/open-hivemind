import { isSafeUrl } from './ssrfGuard';

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly data: unknown,
    message: string
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function isHttpError(err: unknown): err is HttpError {
  return err instanceof HttpError;
}

export interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string | number>;
  signal?: AbortSignal;
  timeout?: number;
}

export interface HttpClientInstance {
  get<T = unknown>(path: string, options?: RequestOptions): Promise<T>;
  post<T = unknown>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  put<T = unknown>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  delete<T = unknown>(path: string, options?: RequestOptions): Promise<T>;
}

async function request<T>(
  method: string,
  url: string,
  body?: unknown,
  options: RequestOptions = {}
): Promise<T> {
  if (!(await isSafeUrl(url))) {
    throw new HttpError(0, null, `SSRF protection: URL is not safe to connect to: ${url}`);
  }

  const { headers = {}, params, signal, timeout } = options;

  let fullUrl = url;
  if (params && Object.keys(params).length > 0) {
    const qs = new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    ).toString();
    fullUrl = `${url}?${qs}`;
  }

  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;

  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }
  if (timeout) {
    timer = setTimeout(() => controller.abort(), timeout);
  }

  const init: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    signal: controller.signal,
  };

  if (body !== undefined && method !== 'GET' && method !== 'HEAD') {
    init.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(fullUrl, init);

    if (!response.ok) {
      let data: unknown;
      try { data = await response.json(); } catch { data = await response.text().catch(() => ''); }
      throw new HttpError(response.status, data, `HTTP ${response.status} ${response.statusText}`);
    }

    if (response.status === 204) return undefined as unknown as T;

    return response.json() as Promise<T>;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function createHttpClient(baseURL: string, defaultHeaders: Record<string, string> = {}): HttpClientInstance {
  const base = baseURL.replace(/\/$/, '');

  const mergeOptions = (options: RequestOptions = {}): RequestOptions => ({
    ...options,
    headers: { ...defaultHeaders, ...options.headers },
  });

  return {
    get: <T>(path: string, options?: RequestOptions) =>
      request<T>('GET', `${base}${path}`, undefined, mergeOptions(options)),
    post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
      request<T>('POST', `${base}${path}`, body, mergeOptions(options)),
    put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
      request<T>('PUT', `${base}${path}`, body, mergeOptions(options)),
    delete: <T>(path: string, options?: RequestOptions) =>
      request<T>('DELETE', `${base}${path}`, undefined, mergeOptions(options)),
  };
}

export const http = {
  get: <T>(url: string, options?: RequestOptions) => request<T>('GET', url, undefined, options),
  post: <T>(url: string, body?: unknown, options?: RequestOptions) => request<T>('POST', url, body, options),
  put: <T>(url: string, body?: unknown, options?: RequestOptions) => request<T>('PUT', url, body, options),
  delete: <T>(url: string, options?: RequestOptions) => request<T>('DELETE', url, undefined, options),
  create: (baseURL: string, defaultHeaders?: Record<string, string>) =>
    createHttpClient(baseURL, defaultHeaders),
};
