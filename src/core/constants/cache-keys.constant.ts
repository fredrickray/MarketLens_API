export const CACHE_KEYS = {
  stockSearch: (query: string) => `market:search:${query.toLowerCase()}`,
  stockOverview: (symbol: string) => `market:overview:${symbol.toUpperCase()}`,
  stockHistory: (symbol: string, days: number) =>
    `market:history:${symbol.toUpperCase()}:${days}`,
  stockAnalysis: (symbol: string, contextKey: string) =>
    `market:analysis:${symbol.toUpperCase()}:${contextKey}`,
} as const;
