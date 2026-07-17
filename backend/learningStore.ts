import fs from 'node:fs';
import path from 'node:path';

export type LearningObservation = {
  columnRoles: Array<{ column: string; role: string; confidence: number }>;
  markets: Array<{ key: string; confidence: number }>;
};

type LearningStore = {
  datasetsSeen: number;
  fields: Record<string, Record<string, number>>;
  markets: Record<string, number>;
  lastUpdated?: string;
};

const packagedStorePath = path.resolve(process.cwd(), 'data', 'learning-store.json');
const storePath = process.env.VERCEL ? path.join('/tmp', 'm-data-learning-store.json') : packagedStorePath;

function emptyStore(): LearningStore {
  return { datasetsSeen: 0, fields: {}, markets: {} };
}

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function readStore(): LearningStore {
  try {
    const readablePath = fs.existsSync(storePath) ? storePath : packagedStorePath;
    if (!fs.existsSync(readablePath)) return emptyStore();
    const parsed = JSON.parse(fs.readFileSync(readablePath, 'utf8')) as Partial<LearningStore>;
    return {
      datasetsSeen: Number(parsed.datasetsSeen ?? 0),
      fields: parsed.fields ?? {},
      lastUpdated: parsed.lastUpdated,
      markets: parsed.markets ?? {},
    };
  } catch {
    return emptyStore();
  }
}

function writeStore(store: LearningStore) {
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
  fs.writeFileSync(storePath, JSON.stringify(store, null, 2));
}

export function getLearnedRole(column: string) {
  const store = readStore();
  const roles = store.fields[normalizeKey(column)];
  if (!roles) return null;

  const ranked = Object.entries(roles).sort((a, b) => b[1] - a[1]);
  const [role, count] = ranked[0] ?? [];
  const total = ranked.reduce((sum, [, value]) => sum + value, 0) || 1;

  return role ? { confidence: Math.round((count / total) * 100), role } : null;
}

export function recordLearning(observation: LearningObservation) {
  const store = readStore();
  store.datasetsSeen += 1;
  store.lastUpdated = new Date().toISOString();

  for (const insight of observation.columnRoles) {
    const key = normalizeKey(insight.column);
    const increment = Math.max(1, Math.round(insight.confidence / 20));
    store.fields[key] = store.fields[key] ?? {};
    store.fields[key][insight.role] = (store.fields[key][insight.role] ?? 0) + increment;
  }

  for (const market of observation.markets) {
    const increment = Math.max(1, Math.round(market.confidence / 20));
    store.markets[market.key] = (store.markets[market.key] ?? 0) + increment;
  }

  writeStore(store);
  return summarizeLearning(store);
}

export function summarizeLearning(store = readStore()) {
  const topMarkets = Object.entries(store.markets)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([market]) => market);

  const roleTotals = new Map<string, number>();
  for (const roles of Object.values(store.fields)) {
    for (const [role, count] of Object.entries(roles)) {
      roleTotals.set(role, (roleTotals.get(role) ?? 0) + count);
    }
  }

  const topRoles = Array.from(roleTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([role]) => role);

  return {
    datasetsSeen: store.datasetsSeen,
    learnedFields: Object.keys(store.fields).length,
    message: store.datasetsSeen > 1
      ? 'The system is learning from previous uploads and using that experience to recognize similar files faster.'
      : 'The system has started learning from uploads and will improve as more files are analyzed.',
    strongestMarkets: topMarkets,
    topColumnRoles: topRoles,
  };
}
