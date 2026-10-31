import type { Metrics } from './speed';

const KEY = 'speedora-history-v1';
export function loadHistory(): Metrics[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (!Array.isArray(data)) return [];
    return data.filter((item): item is Metrics => !!item && typeof item === 'object' && typeof item.testedAt === 'string' && typeof item.download === 'number' && typeof item.upload === 'number').slice(0, 100);
  } catch { return []; }
}
export function saveHistory(history: Metrics[]) {
  try { localStorage.setItem(KEY, JSON.stringify(history.slice(0, 100))); } catch { /* Storage may be disabled. */ }
}
export function clearHistory() { try { localStorage.removeItem(KEY); } catch { /* Storage may be disabled. */ } }
