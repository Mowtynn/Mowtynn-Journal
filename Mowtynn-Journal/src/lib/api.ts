import { getSiteToken } from '../components/PasswordGate';

export function getAuthHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
  const token = getSiteToken();
  const headers: Record<string, string> = {
    ...customHeaders,
  };
  if (token) {
    headers['x-site-token'] = token;
  }
  return headers;
}

export function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getSiteToken();
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('x-site-token', token);
  }
  return fetch(url, {
    ...options,
    headers,
  });
}
