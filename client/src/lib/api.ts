/**
 * Dynamically determines the API Base URL.
 * If NEXT_PUBLIC_API_URL is set in environment, uses it.
 * Otherwise, in browser mode, automatically uses the current hostname
 * (e.g. 10.55.199.8 or localhost) on port 5001 so local network devices
 * (like smartphones) connect seamlessly to the Express server.
 */
export function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:5001/api`;
  }
  return 'http://localhost:5001/api';
}
