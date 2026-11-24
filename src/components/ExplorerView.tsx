import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowUpDown,
  Bookmark,
  BookmarkCheck,
  RefreshCw,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { getErrorMessage } from '../api/client';
import {
  getAllStocks,
  HoldingItem,
  StockDirectoryItem,
} from '../api/stocksense';
import { ExchangeCode } from '../types/navigation';
import { formatCurrencyValue, formatDateOnly } from '../utils/formatters';

interface ExplorerViewProps {
  exchange: ExchangeCode;
  currency?: string;
  holdings: HoldingItem[];
  watchlist: string[];
  onToggleWatchlist: (symbol: string) => void;
  onInspectSymbol: (symbol: string) => void;
  onRecommendSymbol: (symbol: string) => void;
  onTradeSymbol: (symbol: string) => void;
}

interface DirectoryRow {
  symbol: string;
  companyName?: string;
  exchange: string;
  instrumentKey?: string;
  logoUrl?: string;
  currentPrice: number | null;
  lastDayTradedPrice: number | null;
  priceDataDate?: string;
  priceSource?: string;
}

type FilterMode = 'all' | 'holdings' | 'watchlist';
type SortField = 'symbol' | 'company' | 'price';

function StockBadge({ symbol, logoUrl }: { symbol: string; logoUrl?: string }) {
  const [imgFailed, setImgFailed] = useState(false);

  if (logoUrl && !imgFailed) {
    return (
      <img
        src={logoUrl}
        alt={`${symbol} logo`}
        onError={() => setImgFailed(true)}
        className="h-8 w-8 shrink-0 rounded-lg border border-slate-200 bg-white object-contain p-0.5 dark:border-[#263247] dark:bg-[#0B1120]"
      />
    );
  }

  const monogram = symbol.replace(/[^A-Z0-9]/g, '').slice(0, 2) || symbol.slice(0, 2);

  return (
    <div
      aria-hidden="true"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 font-mono text-[11px] font-bold text-slate-700 dark:border-[#263247] dark:bg-[#0B1120] dark:text-[#16C784]"
    >
      {monogram}
    </div>
  );
}

export function ExplorerView({
  exchange,
  currency = 'INR',
  holdings,
  watchlist,
  onToggleWatchlist,
  onInspectSymbol,
  onRecommendSymbol,
  onTradeSymbol,
}: ExplorerViewProps) {
  const [query, setQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [sortField, setSortField] = useState<SortField>('symbol');
  const [sortAsc, setSortAsc] = useState(true);

  const [stocks, setStocks] = useState<StockDirectoryItem[]>([]);
  const [directoryLoading, setDirectoryLoading] = useState(true);
  const [directoryError, setDirectoryError] = useState<string | null>(null);

  const loadDirectory = useCallback(async () => {
    setDirectoryLoading(true);
    setDirectoryError(null);
    try {
      const list = await getAllStocks();
      setStocks(list);
    } catch (err) {
      setStocks([]);
      setDirectoryError(getErrorMessage(err));
    } finally {
      setDirectoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDirectory();
  }, [loadDirectory]);

  const allDirectoryRows = useMemo(() => {
    const map = new Map<string, DirectoryRow>();

    // Primary directory rows dynamically fetched from GET /api/stocks
    for (const s of stocks) {
      const validCurrentPrice =
        s.currentPrice !== null && s.currentPrice > 0 ? s.currentPrice : null;
      const validPrevPrice =
        s.lastDayTradedPrice !== null && s.lastDayTradedPrice > 0
          ? s.lastDayTradedPrice
          : null;

      map.set(s.symbol, {
        symbol: s.symbol,
        companyName: s.companyName,
        exchange: s.exchange ?? 'NSE',
        instrumentKey: s.instrumentKey,
        logoUrl: s.logoUrl,
        currentPrice: validCurrentPrice,
        lastDayTradedPrice: validPrevPrice,
        priceDataDate: s.priceDataDate,
        priceSource: s.priceSource,
      });
    }

    // Enrich with holding metadata if present
    for (const h of holdings) {
      const sym = h.symbol.toUpperCase();
      const existing = map.get(sym);
      const validHoldingPrice =
        h.currentPrice !== null && h.currentPrice > 0 ? h.currentPrice : null;

      if (existing) {
        map.set(sym, {
          ...existing,
          companyName: existing.companyName ?? h.name,
          currentPrice: existing.currentPrice ?? validHoldingPrice,
          priceDataDate: existing.priceDataDate ?? h.lastUpdated,
        });
      } else {
        map.set(sym, {
          symbol: sym,
          companyName: h.name,
          exchange,
          currentPrice: validHoldingPrice,
          lastDayTradedPrice: null,
          priceDataDate: h.lastUpdated,
        });
      }
    }

    return Array.from(map.values());
  }, [stocks, holdings, exchange]);

  const rows = useMemo(() => {
    const holdingSet = new Set(holdings.map((h) => h.symbol.toUpperCase()));
    const watchSet = new Set(watchlist.map((w) => w.toUpperCase()));
    const q = query.trim().toUpperCase();

    const list = allDirectoryRows.filter((item) => {
      if (filterMode === 'holdings' && !holdingSet.has(item.symbol)) return false;
      if (filterMode === 'watchlist' && !watchSet.has(item.symbol)) return false;
      if (
        q &&
        !item.symbol.toUpperCase().includes(q) &&
        !(item.companyName?.toUpperCase().includes(q)) &&
        !(item.instrumentKey?.toUpperCase().includes(q))
      ) {
        return false;
      }
      return true;
    });

    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'symbol') {
        cmp = a.symbol.localeCompare(b.symbol);
      } else if (sortField === 'company') {
        cmp = (a.companyName ?? a.symbol).localeCompare(b.companyName ?? b.symbol);
      } else {
        cmp = (a.currentPrice ?? -1) - (b.currentPrice ?? -1);
      }
      return sortAsc ? cmp : -cmp;
    });

    return list;
  }, [allDirectoryRows, holdings, watchlist, filterMode, query, sortField, sortAsc]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc((p) => !p);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim().toUpperCase();
    if (!q) return;

    const exactMatch = allDirectoryRows.find((item) => item.symbol === q);
    if (exactMatch) {
      onInspectSymbol(exactMatch.symbol);
      return;
    }

    if (rows.length === 1) {
      onInspectSymbol(rows[0].symbol);
      return;
    }

    if (rows.length === 0) {
      onInspectSymbol(q);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-3.5 dark:border-[#263247] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            Stock Explorer
          </h1>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
            Live NSE stock directory from <code className="font-mono">/api/stocks</code> · Click any
            stock to open its detail page &amp; OHLCV chart. Prices reflect TejHQ historical EOD data.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadDirectory()}
          disabled={directoryLoading}
          className="inline-flex items-center gap-1.5 self-start rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60 dark:border-[#263247] dark:bg-[#111827] dark:text-slate-200 dark:hover:bg-[#162033] whitespace-nowrap"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${directoryLoading ? 'animate-spin' : ''}`} />
          Refresh Directory
        </button>
      </div>

      {/* Search Bar (filters by symbol or company name; Enter opens matched stock detail) */}
      <form
        onSubmit={handleSearchSubmit}
        className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-[#263247] dark:bg-[#111827] sm:flex-row"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search NSE stocks by company name or symbol (e.g. Reliance, HDFCBANK)..."
            aria-label="Filter stocks by company name or symbol"
            className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2.5 pr-9 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#16C784] focus:bg-white focus:text-black focus:placeholder:text-slate-500 focus:outline-none dark:border-[#263247] dark:bg-[#0B1120] dark:text-white dark:placeholder:text-slate-400 dark:focus:bg-white dark:focus:text-black dark:focus:placeholder:text-slate-500"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search filter"
              className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={!query.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#16C784] px-5 py-2.5 text-xs font-semibold text-[#0B1120] transition-colors hover:bg-[#13b074] disabled:opacity-60 whitespace-nowrap shrink-0"
        >
          Open Stock
        </button>
      </form>

      {directoryError && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 dark:border-[#EA3943]/40 dark:bg-[#EA3943]/10 dark:text-red-200 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#EA3943]" />
            <span>Failed to load stock directory: {directoryError}</span>
          </div>
          <button
            type="button"
            onClick={() => void loadDirectory()}
            className="self-start rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-800 dark:border-[#EA3943]/50 dark:bg-[#111827] dark:text-red-200 whitespace-nowrap"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filter + Count Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-[#263247] dark:bg-[#111827]">
          {([
            { id: 'all', label: `All NSE Stocks (${allDirectoryRows.length})` },
            { id: 'holdings', label: 'My Holdings' },
            { id: 'watchlist', label: 'Watchlist' },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterMode(tab.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                filterMode === tab.id
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-[#162033] dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-500 tabular-nums dark:text-slate-400">
          Showing {rows.length} of {allDirectoryRows.length}{' '}
          {allDirectoryRows.length === 1 ? 'stock' : 'stocks'}
        </span>
      </div>

      {/* Directory Table */}
      <section className="rounded-xl border border-slate-200 bg-white dark:border-[#263247] dark:bg-[#111827]">
        {directoryLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-11 w-full animate-pulse rounded bg-slate-100 dark:bg-[#162033]"
              />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              No matching stocks found
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {query.trim()
                ? `No stocks matched "${query.trim()}" by company name or symbol.`
                : filterMode !== 'all'
                  ? `No stocks found in ${filterMode === 'holdings' ? 'My Holdings' : 'Watchlist'}.`
                  : 'No stocks were returned by /api/stocks.'}
            </p>
            {(query.trim() || filterMode !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setFilterMode('all');
                }}
                className="mt-3 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-[#263247] dark:text-slate-200 dark:hover:bg-[#162033]"
              >
                Show All Stocks
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 dark:border-[#263247] dark:bg-[#0B1120] dark:text-slate-400">
                  <th className="px-5 py-3">
                    <button
                      type="button"
                      onClick={() => toggleSort('symbol')}
                      className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
                    >
                      Symbol
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleSort('company')}
                      className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
                    >
                      Company Name
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3">Exchange</th>
                  <th className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort('price')}
                      className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
                    >
                      Current Price (EOD)
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right">Prev Traded Price</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-[#263247]">
                {rows.map((row) => {
                  const watched = watchlist.includes(row.symbol);

                  return (
                    <tr
                      key={row.symbol}
                      tabIndex={0}
                      onClick={() => onInspectSymbol(row.symbol)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onInspectSymbol(row.symbol);
                        }
                      }}
                      className="cursor-pointer transition-colors hover:bg-slate-50 focus:bg-slate-50 focus:outline-none dark:hover:bg-[#162033]/60 dark:focus:bg-[#162033]/60"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <StockBadge symbol={row.symbol} logoUrl={row.logoUrl} />
                          <div>
                            <div className="font-mono font-semibold text-slate-900 dark:text-white">
                              {row.symbol}
                            </div>
                            {row.instrumentKey && (
                              <div className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                                {row.instrumentKey}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                        {row.companyName || '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-600 dark:border-[#263247] dark:bg-[#0B1120] dark:text-slate-300">
                          {row.exchange}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono tabular-nums">
                        {row.currentPrice !== null ? (
                          <>
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {formatCurrencyValue(row.currentPrice, currency)}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {row.priceSource ? `${row.priceSource} EOD` : 'EOD'}
                              {row.priceDataDate ? ` · ${formatDateOnly(row.priceDataDate)}` : ''}
                            </div>
                          </>
                        ) : (
                          <span className="font-sans text-xs text-slate-400 dark:text-slate-500">
                            Unavailable
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-xs tabular-nums text-slate-600 dark:text-slate-400">
                        {row.lastDayTradedPrice !== null
                          ? formatCurrencyValue(row.lastDayTradedPrice, currency)
                          : '—'}
                      </td>
                      <td
                        className="px-5 py-3.5 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onToggleWatchlist(row.symbol)}
                            title={watched ? 'Remove from watchlist' : 'Add to watchlist'}
                            className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:border-[#263247] dark:text-slate-400 dark:hover:bg-[#162033] dark:hover:text-white"
                          >
                            {watched ? (
                              <BookmarkCheck className="h-3.5 w-3.5 text-[#16C784]" />
                            ) : (
                              <Bookmark className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => onInspectSymbol(row.symbol)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-[#263247] dark:bg-[#0B1120] dark:text-slate-200 dark:hover:bg-[#162033] whitespace-nowrap"
                          >
                            <Activity className="h-3.5 w-3.5 text-[#16C784]" />
                            View Chart
                          </button>
                          <button
                            type="button"
                            onClick={() => onRecommendSymbol(row.symbol)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-[#263247] dark:bg-[#0B1120] dark:text-slate-200 dark:hover:bg-[#162033] whitespace-nowrap"
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            Signal
                          </button>
                          <button
                            type="button"
                            onClick={() => onTradeSymbol(row.symbol)}
                            className="rounded-lg bg-[#16C784] px-2.5 py-1.5 text-xs font-semibold text-[#0B1120] hover:bg-[#13b074] whitespace-nowrap"
                          >
                            Trade
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
