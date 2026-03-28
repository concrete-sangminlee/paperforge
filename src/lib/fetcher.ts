/**
 * Shared SWR fetcher with consistent error handling and API envelope unwrapping.
 * Use this across all useSWR calls for consistent behavior.
 */
export async function fetcher<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  const json = await res.json();
  // Unwrap standard API envelope { success, data } if present
  return (json && typeof json === 'object' && 'data' in json) ? json.data : json;
}
