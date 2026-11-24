import React, { useState } from 'react';
import {
  Activity,
  ArrowRight,
  Globe,
  Search,
  Sparkles,
} from 'lucide-react';
import { HoldingItem } from '../api/stocksense';
import { ExchangeCode } from '../types/navigation';
import { formatCurrencyValue, formatDateOnly } from '../utils/formatters';

interface MarketsViewProps {
  exchange: ExchangeCode;
  onChangeExchange: (ex: ExchangeCode) => void;
  currency?: string;
  marketDataDate?: string;
  holdings: HoldingItem[];
  watchlist: string[];
  onInspectSymbol: (symbol: string) => void;
  onOpenIndicators: (symbol: string) => void;
  onRecommendSymbol: (symbol: string) => void;
}

export function MarketsView({
  exchange,
  onChangeExchange,
  currency = 'INR',
  marketDataDate,
  holdings,
  watchlist,
  onInspectSymbol,
  onOpenIndicators,
  onRecommendSymbol,
}: MarketsViewProps) {
  const [symbolInput, setSymbolInput] = useState('');

  const handleLaunch = (e: React.FormEvent) => {
    e.preventDefault();
    const sym = symbolInput.trim().toUpperCase();
    if (!sym) return;
    onInspectSymbol(sym);
  };

  const trackedSymbols = Array.from(
    new Set([
      ...holdings.map((h) => h.symbol.toUpperCase()),
      ...watchlist.map((w) => w.toUpperCase()),
    ])
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3.5 dark:border-[#263247]">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            Markets ({exchange})
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Exchange context &amp; TejHQ historical EOD feed status
          </p>
        </div>

        <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 dark:border-[#263247] dark:bg-[#111827]">
          {(['NSE', 'BSE'] as const).map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => onChangeExchange(ex)}
              className={`rounded-md px-3 py-1 font-mono text-xs font-semibold transition-colors ${
                exchange === ex
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-[#162033] dark:text-white'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-[#263247] dark:bg-[#111827]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Selected Exchange
          </p>
          <p className="mt-1.5 font-mono text-lg font-bold text-slate-900 dark:text-white">
            {exchange}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Indian Equity Paper Trading Context
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-[#263247] dark:bg-[#111827]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Market Data Feed
          </p>
          <p className="mt-1.5 font-mono text-lg font-bold text-slate-900 dark:text-white">
            TejHQ Historical / EOD
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {marketDataDate
              ? `Latest EOD date: ${formatDateOnly(marketDataDate)} (Not live)`
              : 'End-of-day reference pricing (Not live)'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-[#263247] dark:bg-[#111827]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Index &amp; Market Breadth Endpoints
          </p>
          <p className="mt-1.5 font-mono text-lg font-bold text-amber-500">
            Not Connected
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Backend market routes not present to inspect
          </p>
        </div>
      </div>

      {/* Quick Ticker Terminal Launcher */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-[#263247] dark:bg-[#111827]">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-[#16C784]" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Direct Ticker Lookup
          </h2>
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Bulk market overview routes are not connected, so no fabricated NIFTY/SENSEX ticks are shown. Enter any {exchange} symbol to inspect real indicators and recommendations from your backend.
        </p>

        <form onSubmit={handleLaunch} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={symbolInput}
              onChange={(e) => setSymbolInput(e.target.value.toUpperCase())}
              placeholder={`Enter ${exchange} symbol (e.g. RELIANCE, TCS, INFY)...`}
              className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2 pr-3 pl-8 font-mono text-xs text-slate-900 focus:border-[#16C784] focus:bg-white focus:outline-none dark:border-[#263247] dark:bg-[#0B1120] dark:text-white"
            />
          </div>
          <button
            type="submit"
            disabled={!symbolInput.trim()}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#16C784] px-4 py-2 text-xs font-bold text-[#0B1120] hover:bg-[#13b074] disabled:opacity-50 whitespace-nowrap"
          >
            Open Analysis
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </form>
      </section>

      {/* Active Symbols Table (Holdings + Watchlist) */}
      <section className="rounded-xl border border-slate-200 bg-white dark:border-[#263247] dark:bg-[#111827]">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-[#263247]">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Tracked Symbols ({trackedSymbols.length})
          </h2>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            From Holdings &amp; Watchlist
          </span>
        </div>

        {trackedSymbols.length === 0 ? (
          <p className="px-4 py-10 text-center text-xs text-slate-500 dark:text-slate-400">
            No tracked symbols yet. Add tickers to your Watchlist or execute a Paper Trade.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-500 dark:border-[#263247] dark:bg-[#0B1120] dark:text-slate-400">
                  <th className="px-4 py-2.5">Symbol</th>
                  <th className="px-4 py-2.5">Exchange</th>
                  <th className="px-4 py-2.5 text-right">Known EOD Price</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-[#263247]">
                {trackedSymbols.map((sym) => {
                  const holding = holdings.find((h) => h.symbol.toUpperCase() === sym);
                  return (
                    <tr
                      key={sym}
                      className="hover:bg-slate-50 dark:hover:bg-[#162033]/50"
                    >
                      <td className="px-4 py-2.5 font-mono font-semibold text-slate-900 dark:text-white">
                        {sym}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-slate-500 dark:text-slate-400">
                        {exchange}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-900 dark:text-white">
                        {holding?.currentPrice !== null && holding?.currentPrice !== undefined
                          ? formatCurrencyValue(holding.currentPrice, currency)
                          : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onInspectSymbol(sym)}
                            className="rounded border border-slate-200 px-2 py-1 font-medium text-slate-700 hover:bg-slate-100 dark:border-[#263247] dark:text-slate-300 dark:hover:bg-[#162033]"
                          >
                            Analysis
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenIndicators(sym)}
                            className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 font-medium text-slate-700 hover:bg-slate-100 dark:border-[#263247] dark:text-slate-300 dark:hover:bg-[#162033]"
                          >
                            <Activity className="h-3 w-3 text-[#16C784]" />
                            Indicators
                          </button>
                          <button
                            type="button"
                            onClick={() => onRecommendSymbol(sym)}
                            className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 font-medium text-slate-700 hover:bg-slate-100 dark:border-[#263247] dark:text-slate-300 dark:hover:bg-[#162033]"
                          >
                            <Sparkles className="h-3 w-3" />
                            Signal
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
