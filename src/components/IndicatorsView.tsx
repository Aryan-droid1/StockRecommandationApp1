import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  Gauge,
  Loader2,
  RefreshCw,
  Search,
} from 'lucide-react';
import { getErrorMessage } from '../api/client';
import { getIndicators, HoldingItem, IndicatorsResult } from '../api/stocksense';
import {
  formatCurrencyValue,
  formatDateOnly,
  formatKeyLabel,
  formatNumber,
  formatUnknownValue,
} from '../utils/formatters';

interface IndicatorsViewProps {
  selectedSymbol: string;
  currency?: string;
  onSymbolChange: (symbol: string) => void;
  holdings: HoldingItem[];
  watchlist: string[];
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

export function IndicatorsView({
  selectedSymbol,
  currency = 'INR',
  onSymbolChange,
  holdings,
  watchlist,
}: IndicatorsViewProps) {
  const [symbolInput, setSymbolInput] = useState(selectedSymbol);
  const [result, setResult] = useState<IndicatorsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSymbolInput(selectedSymbol);
  }, [selectedSymbol]);

  const fetchIndicators = useCallback(async (sym: string) => {
    const clean = sym.trim().toUpperCase();
    if (!clean) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getIndicators(clean);
      setResult(res);
    } catch (err) {
      setResult(null);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSymbol.trim()) {
      void fetchIndicators(selectedSymbol);
    }
  }, [selectedSymbol, fetchIndicators]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = symbolInput.trim().toUpperCase();
    if (!clean) return;
    if (clean === selectedSymbol) {
      void fetchIndicators(clean);
    } else {
      onSymbolChange(clean);
    }
  };

  const merged: Record<string, unknown> = {
    ...(result?.raw ?? {}),
    ...(result?.indicators ?? {}),
  };

  const holding = holdings.find(
    (h) => h.symbol.toUpperCase() === selectedSymbol.toUpperCase()
  );
  const price =
    asNumeric(findIndicatorVal(merged, ['price', 'close', 'eodPrice', 'lastPrice'])) ??
    holding?.currentPrice ??
    null;

  const sma20 = asNumeric(findIndicatorVal(merged, ['sma20', 'sma_20', 'SMA20']));
  const sma50 = asNumeric(findIndicatorVal(merged, ['sma50', 'sma_50', 'SMA50']));
  const ema9 = asNumeric(findIndicatorVal(merged, ['ema9', 'ema_9', 'EMA9']));
  const ema21 = asNumeric(findIndicatorVal(merged, ['ema21', 'ema_21', 'EMA21']));
  const rsi14 = asNumeric(findIndicatorVal(merged, ['rsi14', 'rsi_14', 'rsi', 'RSI14']));
  const atr14 = asNumeric(findIndicatorVal(merged, ['atr14', 'atr_14', 'atr', 'ATR14']));

  const macdRaw = findIndicatorVal(merged, ['macd', 'MACD']);
  const macdVal =
    macdRaw && typeof macdRaw === 'object'
      ? asNumeric(findIndicatorVal(macdRaw as Record<string, unknown>, ['macd', 'value', 'line']))
      : asNumeric(macdRaw);
  const macdSignal =
    macdRaw && typeof macdRaw === 'object'
      ? asNumeric(findIndicatorVal(macdRaw as Record<string, unknown>, ['signal', 'signalLine']))
      : asNumeric(findIndicatorVal(merged, ['macdSignal', 'macd_signal']));
  const macdHist =
    macdRaw && typeof macdRaw === 'object'
      ? asNumeric(findIndicatorVal(macdRaw as Record<string, unknown>, ['histogram', 'hist']))
      : asNumeric(findIndicatorVal(merged, ['macdHistogram', 'macd_histogram']));

  const bbRaw = findIndicatorVal(merged, ['bollingerBands', 'bollinger_bands', 'bollinger', 'bb']);
  const bbUpper =
    bbRaw && typeof bbRaw === 'object'
      ? asNumeric(findIndicatorVal(bbRaw as Record<string, unknown>, ['upper', 'upperBand']))
      : asNumeric(findIndicatorVal(merged, ['bbUpper', 'bollingerUpper', 'upperBand']));
  const bbMiddle =
    bbRaw && typeof bbRaw === 'object'
      ? asNumeric(findIndicatorVal(bbRaw as Record<string, unknown>, ['middle', 'middleBand', 'mid']))
      : asNumeric(findIndicatorVal(merged, ['bbMiddle', 'bollingerMiddle', 'middleBand']));
  const bbLower =
    bbRaw && typeof bbRaw === 'object'
      ? asNumeric(findIndicatorVal(bbRaw as Record<string, unknown>, ['lower', 'lowerBand']))
      : asNumeric(findIndicatorVal(merged, ['bbLower', 'bollingerLower', 'lowerBand']));

  const quickSymbols = Array.from(
    new Set([
      ...holdings.map((h) => h.symbol.toUpperCase()),
      ...watchlist.map((w) => w.toUpperCase()),
    ])
  );

  const indicatorEntries = Object.entries(result?.indicators ?? {});

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-3.5 dark:border-[#263247] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            Technical Indicators{selectedSymbol ? ` · ${selectedSymbol}` : ''}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Endpoint: <code className="font-mono">/api/indicators/:symbol</code>
            {result?.asOf ? ` · TejHQ EOD ${formatDateOnly(result.asOf)}` : ' · TejHQ EOD data (not live)'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={symbolInput}
              onChange={(e) => setSymbolInput(e.target.value.toUpperCase())}
              placeholder="Enter ticker..."
              className="w-44 rounded-lg border border-slate-300 bg-white py-1.5 pr-3 pl-8 font-mono text-xs text-slate-900 focus:border-[#16C784] focus:outline-none dark:border-[#263247] dark:bg-[#111827] dark:text-white"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-[#16C784] px-3.5 py-1.5 text-xs font-bold text-[#0B1120] hover:bg-[#13b074] disabled:opacity-60"
          >
            Compute
          </button>
          {selectedSymbol && (
            <button
              type="button"
              onClick={() => void fetchIndicators(selectedSymbol)}
              disabled={loading}
              className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-100 dark:border-[#263247] dark:bg-[#111827] dark:text-slate-300 dark:hover:bg-[#162033]"
              title="Refresh indicators"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </form>
      </div>

      {quickSymbols.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Quick select:
          </span>
          {quickSymbols.map((sym) => (
            <button
              key={sym}
              type="button"
              onClick={() => onSymbolChange(sym)}
              className={`rounded border px-2 py-0.5 font-mono text-[11px] font-semibold ${
                selectedSymbol === sym
                  ? 'border-[#16C784] bg-[#16C784]/10 text-[#16C784]'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-[#263247] dark:bg-[#111827] dark:text-slate-300 dark:hover:bg-[#162033]'
              }`}
            >
              {sym}
            </button>
          ))}
        </div>
      )}

      {!selectedSymbol ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center dark:border-[#263247] dark:bg-[#111827]">
          <Gauge className="mx-auto h-8 w-8 text-slate-400 dark:text-slate-500" />
          <p className="mt-2.5 text-sm font-semibold text-slate-900 dark:text-white">
            Select a symbol to inspect technical indicators
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Enter a stock symbol above to load SMA, EMA, RSI, MACD, Bollinger Bands, and ATR from the backend.
          </p>
        </div>
      ) : loading ? (
        <div className="flex items-center gap-2 py-12 text-xs text-slate-500 dark:text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin text-[#16C784]" />
          Loading indicators for {selectedSymbol}...
        </div>
      ) : error ? (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 dark:border-[#EA3943]/40 dark:bg-[#EA3943]/10 dark:text-red-200"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-[#EA3943]" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => void fetchIndicators(selectedSymbol)}
            className="rounded border border-red-300 bg-white px-2.5 py-1 font-semibold text-red-800 dark:border-[#EA3943]/50 dark:bg-[#111827] dark:text-red-200"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <MetricBox
              title="SMA 20"
              val={sma20 !== null ? formatCurrencyValue(sma20, currency) : '—'}
              sub={
                sma20 !== null && price !== null
                  ? price >= sma20
                    ? 'Bullish (Price ≥ SMA 20)'
                    : 'Bearish (Price < SMA 20)'
                  : '20-period Simple MA'
              }
              tone={
                sma20 !== null && price !== null
                  ? price >= sma20
                    ? 'pos'
                    : 'neg'
                  : 'neutral'
              }
            />
            <MetricBox
              title="SMA 50"
              val={sma50 !== null ? formatCurrencyValue(sma50, currency) : '—'}
              sub={
                sma50 !== null && price !== null
                  ? price >= sma50
                    ? 'Bullish (Price ≥ SMA 50)'
                    : 'Bearish (Price < SMA 50)'
                  : '50-period Simple MA'
              }
              tone={
                sma50 !== null && price !== null
                  ? price >= sma50
                    ? 'pos'
                    : 'neg'
                  : 'neutral'
              }
            />
            <MetricBox
              title="EMA 9"
              val={ema9 !== null ? formatCurrencyValue(ema9, currency) : '—'}
              sub="9-period Exponential MA"
              tone={
                ema9 !== null && price !== null
                  ? price >= ema9
                    ? 'pos'
                    : 'neg'
                  : 'neutral'
              }
            />
            <MetricBox
              title="EMA 21"
              val={ema21 !== null ? formatCurrencyValue(ema21, currency) : '—'}
              sub="21-period Exponential MA"
              tone={
                ema21 !== null && price !== null
                  ? price >= ema21
                    ? 'pos'
                    : 'neg'
                  : 'neutral'
              }
            />
            <MetricBox
              title="RSI 14"
              val={rsi14 !== null ? formatNumber(rsi14, 2) : '—'}
              sub={
                rsi14 === null
                  ? '14-period RSI'
                  : rsi14 <= 30
                    ? 'Oversold (≤ 30)'
                    : rsi14 >= 70
                      ? 'Overbought (≥ 70)'
                      : 'Neutral range'
              }
              tone={
                rsi14 === null
                  ? 'neutral'
                  : rsi14 <= 30
                    ? 'pos'
                    : rsi14 >= 70
                      ? 'neg'
                      : 'neutral'
              }
            />
            <MetricBox
              title="MACD"
              val={macdVal !== null ? formatNumber(macdVal, 2) : '—'}
              sub={`Signal: ${formatNumber(macdSignal, 2)} · Hist: ${formatNumber(macdHist, 2)}`}
              tone={
                macdVal === null
                  ? 'neutral'
                  : macdVal > 0
                    ? 'pos'
                    : macdVal < 0
                      ? 'neg'
                      : 'neutral'
              }
            />
            <MetricBox
              title="Bollinger Bands"
              val={
                bbMiddle !== null
                  ? formatCurrencyValue(bbMiddle, currency)
                  : bbUpper !== null
                    ? formatCurrencyValue(bbUpper, currency)
                    : '—'
              }
              sub={`Upper: ${formatNumber(bbUpper, 2)} · Lower: ${formatNumber(bbLower, 2)}`}
              tone="neutral"
            />
            <MetricBox
              title="ATR 14"
              val={atr14 !== null ? formatNumber(atr14, 2) : '—'}
              sub="14-period Average True Range"
              tone="neutral"
            />
          </div>

          {indicatorEntries.length > 0 && (
            <section className="rounded-xl border border-slate-200 bg-white dark:border-[#263247] dark:bg-[#111827]">
              <div className="border-b border-slate-200 px-4 py-3 dark:border-[#263247]">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Full Backend Indicator Payload
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-500 dark:border-[#263247] dark:bg-[#0B1120] dark:text-slate-400">
                      <th className="px-4 py-2.5">Indicator</th>
                      <th className="px-4 py-2.5 text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-[#263247]">
                    {indicatorEntries.map(([key, value]) => (
                      <tr key={key}>
                        <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-300">
                          {formatKeyLabel(key)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-900 dark:text-white">
                          {formatUnknownValue(value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function MetricBox({
  title,
  val,
  sub,
  tone,
}: {
  title: string;
  val: string;
  sub: string;
  tone: 'pos' | 'neg' | 'neutral';
}) {
  const subTone =
    tone === 'pos'
      ? 'text-[#16C784]'
      : tone === 'neg'
        ? 'text-[#EA3943]'
        : 'text-slate-500 dark:text-slate-400';

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-[#263247] dark:bg-[#111827]">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{title}</p>
      <p className="mt-1.5 font-mono text-lg font-bold text-slate-900 tabular-nums dark:text-white">
        {val}
      </p>
      <p className={`mt-1 truncate text-[11px] font-medium ${subTone}`}>{sub}</p>
    </div>
  );
}
