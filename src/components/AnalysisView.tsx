import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  Bookmark,
  BookmarkCheck,
  CandlestickChart,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react';
import { getErrorMessage } from '../api/client';
import {
  getIndicators,
  getMarketHistory,
  HoldingItem,
  IndicatorsResult,
  OhlcvCandle,
} from '../api/stocksense';
import { ExchangeCode } from '../types/navigation';
import { OhlcvChart } from './OhlcvChart';
import {
  formatCurrencyValue,
  formatDateOnly,
  formatKeyLabel,
  formatNumber,
  formatUnknownValue,
} from '../utils/formatters';

interface AnalysisViewProps {
  selectedSymbol: string;
  exchange: ExchangeCode;
  currency?: string;
  onSymbolChange: (symbol: string) => void;
  holdings: HoldingItem[];
  watchlist: string[];
  onToggleWatchlist: (symbol: string) => void;
  onTradeSymbol: (symbol: string) => void;
  onOpenRecommendations: (symbol: string) => void;
}

function findIndicatorVal(
  source: Record<string, unknown>,
  candidates: string[]
): unknown {
  const lowerMap = new Map<string, unknown>();
  for (const [k, v] of Object.entries(source)) {
    lowerMap.set(k.toLowerCase(), v);
  }
  for (const c of candidates) {
    const found = lowerMap.get(c.toLowerCase());
    if (found !== undefined && found !== null) return found;
  }
  return undefined;
}

function asNumeric(val: unknown): number | null {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val === 'string' && val.trim() !== '') {
    const n = Number(val);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

const EXCLUDED_META_KEYS = new Set([
  'symbol',
  'ticker',
  'asof',
  'date',
  'pricedate',
  'updatedat',
  'success',
  'message',
]);

type ChartTimeframe = '1M' | '3M' | '6M' | 'YTD' | '1Y';

const TIMEFRAMES: ChartTimeframe[] = ['1M', '3M', '6M', 'YTD', '1Y'];

function formatIsoDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getDateRangeForTimeframe(timeframe: ChartTimeframe): {
  from: string;
  to: string;
} {
  const now = new Date();
  const to = formatIsoDate(now);
  const fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (timeframe) {
    case '1M':
      fromDate.setMonth(fromDate.getMonth() - 1);
      break;
    case '3M':
      fromDate.setMonth(fromDate.getMonth() - 3);
      break;
    case '6M':
      fromDate.setMonth(fromDate.getMonth() - 6);
      break;
    case 'YTD':
      return { from: `${now.getFullYear()}-01-01`, to };
    case '1Y':
      fromDate.setFullYear(fromDate.getFullYear() - 1);
      break;
  }

  return { from: formatIsoDate(fromDate), to };
}

export function AnalysisView({
  selectedSymbol,
  exchange,
  currency = 'INR',
  onSymbolChange,
  holdings,
  watchlist,
  onToggleWatchlist,
  onTradeSymbol,
  onOpenRecommendations,
}: AnalysisViewProps) {
  const [symbolInput, setSymbolInput] = useState(selectedSymbol);
  const [indicators, setIndicators] = useState<IndicatorsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [timeframe, setTimeframe] = useState<ChartTimeframe>('YTD');
  const [candles, setCandles] = useState<OhlcvCandle[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    setSymbolInput(selectedSymbol);
  }, [selectedSymbol]);

  const loadIndicators = useCallback(async (sym: string) => {
    const clean = sym.trim().toUpperCase();
    if (!clean) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getIndicators(clean);
      setIndicators(res);
    } catch (err) {
      setIndicators(null);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistory = useCallback(
    async (sym: string, exch: ExchangeCode, tf: ChartTimeframe) => {
      const clean = sym.trim().toUpperCase();
      if (!clean) return;
      setHistoryLoading(true);
      setHistoryError(null);
      try {
        const { from, to } = getDateRangeForTimeframe(tf);
        const res = await getMarketHistory(clean, {
          exchange: exch,
          from,
          to,
        });
        setCandles(res.candles);
      } catch (err) {
        setCandles([]);
        setHistoryError(getErrorMessage(err));
      } finally {
        setHistoryLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (selectedSymbol.trim()) {
      void loadIndicators(selectedSymbol);
    } else {
      setIndicators(null);
      setError(null);
    }
  }, [selectedSymbol, loadIndicators]);

  useEffect(() => {
    if (selectedSymbol.trim()) {
      void loadHistory(selectedSymbol, exchange, timeframe);
    } else {
      setCandles([]);
      setHistoryError(null);
    }
  }, [selectedSymbol, exchange, timeframe, loadHistory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = symbolInput.trim().toUpperCase();
    if (!clean) return;
    if (clean === selectedSymbol) {
      void loadIndicators(clean);
      void loadHistory(clean, exchange, timeframe);
    } else {
      onSymbolChange(clean);
    }
  };

  const indSource = indicators?.indicators ?? {};
  const rawSource = indicators?.raw ?? {};
  const mergedLookup: Record<string, unknown> = { ...rawSource, ...indSource };

  const holding = holdings.find(
    (h) => h.symbol.toUpperCase() === selectedSymbol.toUpperCase()
  );

  const latestCandleClose =
    candles.length > 0 ? candles[candles.length - 1].close : null;

  const availablePrice =
    asNumeric(findIndicatorVal(mergedLookup, ['price', 'close', 'eodPrice', 'lastPrice'])) ??
    indicators?.closePrice ??
    holding?.currentPrice ??
    latestCandleClose ??
    null;

  const priceChange = asNumeric(
    findIndicatorVal(mergedLookup, ['change', 'priceChange', 'dayChange'])
  );
  const priceChangePct = asNumeric(
    findIndicatorVal(mergedLookup, ['changePercent', 'pctChange', 'dayChangePercent'])
  );
  const companyName =
    (findIndicatorVal(mergedLookup, ['companyName', 'name']) as string | undefined) ??
    holding?.name;

  // Extract 8 requested technical indicators cleanly
  const sma20 = asNumeric(findIndicatorVal(mergedLookup, ['sma20', 'sma_20', 'SMA20']));
  const sma50 = asNumeric(findIndicatorVal(mergedLookup, ['sma50', 'sma_50', 'SMA50']));
  const ema9 = asNumeric(findIndicatorVal(mergedLookup, ['ema9', 'ema_9', 'EMA9']));
  const ema21 = asNumeric(findIndicatorVal(mergedLookup, ['ema21', 'ema_21', 'EMA21']));
  const rsi14 = asNumeric(findIndicatorVal(mergedLookup, ['rsi14', 'rsi_14', 'rsi', 'RSI14']));

  const macdRaw = findIndicatorVal(mergedLookup, ['macd', 'MACD']);
  const macdVal =
    macdRaw && typeof macdRaw === 'object'
      ? asNumeric(
          findIndicatorVal(macdRaw as Record<string, unknown>, [
            'macd',
            'value',
            'line',
            'macdLine',
          ])
        )
      : asNumeric(macdRaw);
  const macdSignal =
    macdRaw && typeof macdRaw === 'object'
      ? asNumeric(
          findIndicatorVal(macdRaw as Record<string, unknown>, ['signal', 'signalLine'])
        )
      : asNumeric(findIndicatorVal(mergedLookup, ['macdSignal', 'macd_signal']));
  const macdHist =
    macdRaw && typeof macdRaw === 'object'
      ? asNumeric(
          findIndicatorVal(macdRaw as Record<string, unknown>, ['histogram', 'hist'])
        )
      : asNumeric(findIndicatorVal(mergedLookup, ['macdHistogram', 'macd_histogram']));

  const bbRaw = findIndicatorVal(mergedLookup, [
    'bollingerBands',
    'bollinger_bands',
    'bollinger',
    'bb',
  ]);
  const bbUpper =
    bbRaw && typeof bbRaw === 'object'
      ? asNumeric(findIndicatorVal(bbRaw as Record<string, unknown>, ['upper', 'upperBand']))
      : asNumeric(findIndicatorVal(mergedLookup, ['bbUpper', 'bollingerUpper', 'upperBand']));
  const bbMiddle =
    bbRaw && typeof bbRaw === 'object'
      ? asNumeric(findIndicatorVal(bbRaw as Record<string, unknown>, ['middle', 'middleBand', 'mid']))
      : asNumeric(findIndicatorVal(mergedLookup, ['bbMiddle', 'bollingerMiddle', 'middleBand']));
  const bbLower =
    bbRaw && typeof bbRaw === 'object'
      ? asNumeric(findIndicatorVal(bbRaw as Record<string, unknown>, ['lower', 'lowerBand']))
      : asNumeric(findIndicatorVal(mergedLookup, ['bbLower', 'bollingerLower', 'lowerBand']));

  const atr14 = asNumeric(findIndicatorVal(mergedLookup, ['atr14', 'atr_14', 'atr', 'ATR14']));

  const maBars = [
    { label: 'EMA 9', value: ema9 },
    { label: 'EMA 21', value: ema21 },
    { label: 'SMA 20', value: sma20 },
    { label: 'SMA 50', value: sma50 },
    ...(availablePrice !== null ? [{ label: 'EOD Price', value: availablePrice }] : []),
  ].filter((item): item is { label: string; value: number } => item.value !== null);

  const maxMaValue = maBars.reduce((m, b) => Math.max(m, b.value), 0);

  const isWatched = selectedSymbol ? watchlist.includes(selectedSymbol.toUpperCase()) : false;

  const extraFields = Object.entries(indSource).filter(
    ([k]) => !EXCLUDED_META_KEYS.has(k.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Search & Symbol Terminal Header */}
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-3.5 dark:border-[#263247] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              {selectedSymbol ? (
                <span className="font-mono">{selectedSymbol}</span>
              ) : (
                'Stock Analysis'
              )}
            </h1>
            {selectedSymbol && (
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {exchange} · {companyName || 'Symbol Analysis'}
              </span>
            )}
          </div>

          {selectedSymbol && (
            <div className="mt-1 flex flex-wrap items-baseline gap-3">
              <span className="font-mono text-xl font-bold text-slate-900 tabular-nums dark:text-white">
                {formatCurrencyValue(availablePrice, currency)}
              </span>
              {priceChange !== null && (
                <span
                  className={`font-mono text-xs font-semibold tabular-nums ${
                    priceChange > 0
                      ? 'text-[#16C784]'
                      : priceChange < 0
                        ? 'text-[#EA3943]'
                        : 'text-slate-500'
                  }`}
                >
                  {priceChange > 0 ? '+' : ''}
                  {formatNumber(priceChange, 2)}
                  {priceChangePct !== null
                    ? ` (${priceChangePct > 0 ? '+' : ''}${priceChangePct.toFixed(2)}%)`
                    : ''}
                </span>
              )}
              <span className="text-xs text-slate-500 dark:text-slate-400">
                TejHQ Historical / EOD{indicators?.asOf ? ` · ${formatDateOnly(indicators.asOf)}` : ' (Not live)'}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={symbolInput}
                onChange={(e) => setSymbolInput(e.target.value.toUpperCase())}
                placeholder="Ticker symbol..."
                className="w-44 rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-9 font-mono text-xs text-slate-900 focus:border-[#16C784] focus:outline-none dark:border-[#263247] dark:bg-[#111827] dark:text-white sm:w-52"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-[#162033] dark:hover:bg-[#1e2c45] whitespace-nowrap"
            >
              Load
            </button>
          </form>

          {selectedSymbol && (
            <>
              <button
                type="button"
                onClick={() => onToggleWatchlist(selectedSymbol)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-[#263247] dark:bg-[#111827] dark:text-slate-200 dark:hover:bg-[#162033] whitespace-nowrap"
              >
                {isWatched ? (
                  <BookmarkCheck className="h-3.5 w-3.5 text-[#16C784]" />
                ) : (
                  <Bookmark className="h-3.5 w-3.5" />
                )}
                {isWatched ? 'Watched' : 'Watch'}
              </button>
              <button
                type="button"
                onClick={() => onOpenRecommendations(selectedSymbol)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-[#263247] dark:bg-[#111827] dark:text-slate-200 dark:hover:bg-[#162033] whitespace-nowrap"
              >
                <Sparkles className="h-3.5 w-3.5 text-[#16C784]" />
                Signals
              </button>
              <button
                type="button"
                onClick={() => onTradeSymbol(selectedSymbol)}
                className="rounded-lg bg-[#16C784] px-3.5 py-2 text-xs font-semibold text-[#0B1120] hover:bg-[#13b074] whitespace-nowrap"
              >
                Paper Trade
              </button>
            </>
          )}
        </div>
      </div>

      {!selectedSymbol ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center dark:border-[#263247] dark:bg-[#111827]">
          <CandlestickChart className="mx-auto h-9 w-9 text-slate-400 dark:text-slate-500" />
          <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">
            Enter a stock symbol to open terminal analysis
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Queries <code className="font-mono">/api/indicators/:symbol</code> for moving averages,
            RSI, MACD, Bollinger Bands, and ATR.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {error && (
            <div
              role="alert"
              className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-[#EA3943]/40 dark:bg-[#EA3943]/10 dark:text-red-200"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#EA3943]" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => void loadIndicators(selectedSymbol)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-800 dark:border-[#EA3943]/50 dark:bg-[#111827] dark:text-red-200 whitespace-nowrap"
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </button>
            </div>
          )}

          {/* Chart Terminal Area: Historical OHLCV/Volume Chart + Real Moving-Average Profile */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-[#263247] dark:bg-[#111827] lg:col-span-8">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 dark:border-[#263247]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Candlestick &amp; Volume Chart · {selectedSymbol}
                    </h2>
                    {!historyLoading && !historyError && candles.length > 0 && (
                      <span className="font-mono text-[11px] font-semibold text-[#16C784]">
                        {candles.length} sessions
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    TejHQ Historical / End-of-Day (EOD) series · Not live ({exchange})
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-[#263247] dark:bg-[#0B1120]">
                    {TIMEFRAMES.map((tf) => {
                      const active = timeframe === tf;
                      return (
                        <button
                          key={tf}
                          type="button"
                          onClick={() => setTimeframe(tf)}
                          className={`rounded-md px-2.5 py-1 font-mono text-[11px] font-semibold transition-colors ${
                            active
                              ? 'bg-[#16C784] text-[#0B1120]'
                              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                          }`}
                        >
                          {tf}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => void loadHistory(selectedSymbol, exchange, timeframe)}
                    disabled={historyLoading}
                    title="Refresh historical candles"
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-60 dark:border-[#263247] dark:bg-[#0B1120] dark:text-slate-300 dark:hover:bg-[#162033]"
                  >
                    <RefreshCw
                      className={`h-3 w-3 ${historyLoading ? 'animate-spin' : ''}`}
                    />
                  </button>
                </div>
              </div>

              {historyLoading ? (
                <div className="mt-4 flex h-[396px] flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 dark:border-[#263247] dark:bg-[#0B1120]">
                  <Loader2 className="h-6 w-6 animate-spin text-[#16C784]" />
                  <p className="mt-2.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                    Loading historical OHLCV candles for {selectedSymbol}...
                  </p>
                </div>
              ) : historyError ? (
                <div
                  role="alert"
                  className="mt-4 flex h-[396px] flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50/60 p-6 text-center dark:border-[#EA3943]/40 dark:bg-[#EA3943]/10"
                >
                  <AlertCircle className="h-7 w-7 text-[#EA3943]" />
                  <p className="mt-2.5 text-sm font-semibold text-slate-900 dark:text-white">
                    Unable to load historical OHLCV chart
                  </p>
                  <p className="mt-1 max-w-md text-xs text-red-700 dark:text-red-200">
                    {historyError}
                  </p>
                  <button
                    type="button"
                    onClick={() => void loadHistory(selectedSymbol, exchange, timeframe)}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-50 dark:border-[#EA3943]/50 dark:bg-[#111827] dark:text-red-200"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Retry
                  </button>
                </div>
              ) : candles.length === 0 ? (
                <div className="mt-4 flex h-[396px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center dark:border-[#263247] dark:bg-[#0B1120]">
                  <CandlestickChart className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                  <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
                    No Historical Candles Available
                  </p>
                  <p className="mt-1.5 max-w-md text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    No TejHQ OHLCV records were returned for{' '}
                    <span className="font-mono font-semibold">{selectedSymbol}</span> ({exchange})
                    in the selected {timeframe} range.
                  </p>
                </div>
              ) : (
                <OhlcvChart
                  candles={candles}
                  symbol={selectedSymbol}
                  exchange={exchange}
                  currency={currency}
                />
              )}
            </section>

            {/* Real Moving Average Comparison Profile from /api/indicators */}
            <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-[#263247] dark:bg-[#111827] lg:col-span-4">
              <div className="border-b border-slate-200 pb-3 dark:border-[#263247]">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Moving Average Alignment
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Plotted from /api/indicators/{selectedSymbol}
                </p>
              </div>

              {loading ? (
                <div className="flex items-center gap-2 py-16 text-xs text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading indicator profile...
                </div>
              ) : maBars.length === 0 ? (
                <p className="py-14 text-center text-xs text-slate-500 dark:text-slate-400">
                  Moving average values unavailable from backend response.
                </p>
              ) : (
                <div className="mt-5 space-y-4">
                  {maBars.map((bar) => {
                    const widthPct = maxMaValue > 0 ? (bar.value / maxMaValue) * 100 : 0;
                    const isAboveEod =
                      availablePrice !== null &&
                      bar.label !== 'EOD Price' &&
                      availablePrice >= bar.value;
                    return (
                      <div key={bar.label} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-600 dark:text-slate-300">
                            {bar.label}
                          </span>
                          <span className="font-mono font-semibold text-slate-900 tabular-nums dark:text-white">
                            {formatCurrencyValue(bar.value, currency)}
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-[#0B1120]">
                          <div
                            className={`h-full rounded-full ${
                              bar.label === 'EOD Price'
                                ? 'bg-sky-400'
                                : isAboveEod
                                  ? 'bg-[#16C784]'
                                  : 'bg-slate-400 dark:bg-slate-600'
                            }`}
                            style={{ width: `${Math.max(8, widthPct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* 8 Core Technical Indicator Cards */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Technical Indicators
              </h2>
              <button
                type="button"
                onClick={() => void loadIndicators(selectedSymbol)}
                disabled={loading}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh Indicators
              </button>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white dark:border-[#263247] dark:bg-[#111827]"
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <IndicatorCard
                  label="SMA 20"
                  value={sma20 !== null ? formatCurrencyValue(sma20, currency) : '—'}
                  hint={
                    sma20 !== null && availablePrice !== null
                      ? availablePrice >= sma20
                        ? 'Price above SMA 20'
                        : 'Price below SMA 20'
                      : '20-day Simple Moving Avg'
                  }
                  tone={
                    sma20 !== null && availablePrice !== null
                      ? availablePrice >= sma20
                        ? 'positive'
                        : 'negative'
                      : 'neutral'
                  }
                />

                <IndicatorCard
                  label="SMA 50"
                  value={sma50 !== null ? formatCurrencyValue(sma50, currency) : '—'}
                  hint={
                    sma50 !== null && availablePrice !== null
                      ? availablePrice >= sma50
                        ? 'Price above SMA 50'
                        : 'Price below SMA 50'
                      : '50-day Simple Moving Avg'
                  }
                  tone={
                    sma50 !== null && availablePrice !== null
                      ? availablePrice >= sma50
                        ? 'positive'
                        : 'negative'
                      : 'neutral'
                  }
                />

                <IndicatorCard
                  label="EMA 9"
                  value={ema9 !== null ? formatCurrencyValue(ema9, currency) : '—'}
                  hint={
                    ema9 !== null && availablePrice !== null
                      ? availablePrice >= ema9
                        ? 'Price above EMA 9'
                        : 'Price below EMA 9'
                      : '9-day Exponential Moving Avg'
                  }
                  tone={
                    ema9 !== null && availablePrice !== null
                      ? availablePrice >= ema9
                        ? 'positive'
                        : 'negative'
                      : 'neutral'
                  }
                />

                <IndicatorCard
                  label="EMA 21"
                  value={ema21 !== null ? formatCurrencyValue(ema21, currency) : '—'}
                  hint={
                    ema21 !== null && availablePrice !== null
                      ? availablePrice >= ema21
                        ? 'Price above EMA 21'
                        : 'Price below EMA 21'
                      : '21-day Exponential Moving Avg'
                  }
                  tone={
                    ema21 !== null && availablePrice !== null
                      ? availablePrice >= ema21
                        ? 'positive'
                        : 'negative'
                      : 'neutral'
                  }
                />

                <IndicatorCard
                  label="RSI 14"
                  value={rsi14 !== null ? formatNumber(rsi14, 2) : '—'}
                  hint={
                    rsi14 === null
                      ? '14-period Relative Strength'
                      : rsi14 >= 70
                        ? 'Overbought zone (≥ 70)'
                        : rsi14 <= 30
                          ? 'Oversold zone (≤ 30)'
                          : 'Neutral momentum (30–70)'
                  }
                  tone={
                    rsi14 === null
                      ? 'neutral'
                      : rsi14 <= 30
                        ? 'positive'
                        : rsi14 >= 70
                          ? 'negative'
                          : 'neutral'
                  }
                />

                <IndicatorCard
                  label="MACD"
                  value={macdVal !== null ? formatNumber(macdVal, 2) : '—'}
                  hint={
                    macdSignal !== null || macdHist !== null
                      ? `Signal: ${formatNumber(macdSignal, 2)} · Hist: ${formatNumber(macdHist, 2)}`
                      : 'Moving Avg Convergence Divergence'
                  }
                  tone={
                    macdVal === null
                      ? 'neutral'
                      : macdVal > 0
                        ? 'positive'
                        : macdVal < 0
                          ? 'negative'
                          : 'neutral'
                  }
                />

                <IndicatorCard
                  label="Bollinger Bands"
                  value={
                    bbMiddle !== null
                      ? formatCurrencyValue(bbMiddle, currency)
                      : bbUpper !== null
                        ? formatCurrencyValue(bbUpper, currency)
                        : '—'
                  }
                  hint={
                    bbUpper !== null || bbLower !== null
                      ? `Upper: ${formatNumber(bbUpper, 2)} · Lower: ${formatNumber(bbLower, 2)}`
                      : 'Upper / Middle / Lower volatility bands'
                  }
                  tone="neutral"
                />

                <IndicatorCard
                  label="ATR 14"
                  value={atr14 !== null ? formatNumber(atr14, 2) : '—'}
                  hint="14-period Average True Range"
                  tone="neutral"
                />
              </div>
            )}
          </section>

          {/* Raw Backend Indicator Fields if extra keys are returned */}
          {extraFields.length > 0 && (
            <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-[#263247] dark:bg-[#111827]">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Additional Returned Indicator Fields
              </h3>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {extraFields.map(([k, v]) => (
                  <div
                    key={k}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 dark:border-[#263247] dark:bg-[#0B1120]"
                  >
                    <p className="truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      {formatKeyLabel(k)}
                    </p>
                    <p className="mt-1 truncate font-mono text-xs font-semibold text-slate-900 tabular-nums dark:text-white">
                      {formatUnknownValue(v)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function IndicatorCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone: 'positive' | 'negative' | 'neutral';
}) {
  const toneClass =
    tone === 'positive'
      ? 'text-[#16C784]'
      : tone === 'negative'
        ? 'text-[#EA3943]'
        : 'text-slate-500 dark:text-slate-400';

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-[#263247] dark:bg-[#111827]">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 font-mono text-xl font-bold text-slate-900 tabular-nums dark:text-white">
        {value}
      </p>
      <p className={`mt-1.5 truncate text-[11px] font-medium ${toneClass}`} title={hint}>
        {hint}
      </p>
    </div>
  );
}
