import { getSiteToken } from '../components/PasswordGate';

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
