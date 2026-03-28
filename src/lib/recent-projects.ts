/**
 * Track recently accessed projects in localStorage.
 */
const KEY = 'paperforge-recent-projects';
const MAX = 10;

interface RecentEntry {
  id: string;
  name: string;
  accessedAt: number;
}

export function getRecentProjects(): RecentEntry[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

export function trackProjectAccess(id: string, name: string) {
  try {
    const list = getRecentProjects().filter(p => p.id !== id);
    list.unshift({ id, name, accessedAt: Date.now() });
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {}
}
