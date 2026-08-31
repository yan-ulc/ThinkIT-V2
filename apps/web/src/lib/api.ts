export const API_URL = "http://localhost:8000/api/v1";

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  
  const isAuthRoute = endpoint.includes('/auth/');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && !isAuthRoute ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  // Don't set Content-Type for FormData (file uploads)
  if (options.body instanceof FormData) {
    delete (headers as any)['Content-Type'];
  }

  // Django requires trailing slashes for POST requests, but we must be careful with query params
  let normalizedEndpoint = endpoint;
  const [pathPart, queryPart] = endpoint.split('?');
  if (pathPart && !pathPart.endsWith('/')) {
    normalizedEndpoint = queryPart !== undefined ? `${pathPart}/?${queryPart}` : `${pathPart}/`;
  }

  const response = await fetch(`${API_URL}${normalizedEndpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401 && !isAuthRoute) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        window.location.href = '/login?expired=1';
        return new Promise(() => {}); // Prevent Next.js error overlay from blocking redirect
      }
    }
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.message || errorData?.error?.message || 'API request failed');
  }

  // Handle empty responses (like 204 No Content)
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.indexOf("application/json") !== -1) {
    return response.json();
  }
  return response.text();
}
