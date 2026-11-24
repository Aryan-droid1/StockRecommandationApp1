import React, { useState } from 'react';
import {
  Activity,
  Bookmark,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { HoldingItem } from '../api/stocksense';
import { ExchangeCode } from '../types/navigation';
import { formatCurrencyValue } from '../utils/formatters';

interface WatchlistViewProps {
  exchange: ExchangeCode;
  currency?: string;
  watchlist: string[];
  holdings: HoldingItem[];
  onAddSymbol: (symbol: string) => void;
  onRemoveSymbol: (symbol: string) => void;
  onInspectSymbol: (symbol: string) => void;
  onRecommendSymbol: (symbol: string) => void;
  onTradeSymbol: (symbol: string) => void;
}

export function WatchlistView({
  exchange,
  currency = 'INR',
  watchlist,
  holdings,
  onAddSymbol,
  onRemoveSymbol,
  onInspectSymbol,
  onRecommendSymbol,
  onTradeSymbol,
}: WatchlistViewProps) {
  const [input, setInput] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const sym = input.trim().toUpperCase();
    if (!sym) return;
    onAddSymbol(sym);
    setInput('');
  };

  return (
    <div className="space-y-4">
      <div className="border-b border-slate-200 pb-3.5 dark:border-[#263247]">
        <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
          Watchlist ({exchange})
        </h1>
        <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
          Track ticker symbols for quick access to technical indicators, rule-based signals, and
          paper execution.
        </p>
      </div>

      <form
        onSubmit={handleAdd}
        className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-[#263247] dark:bg-[#111827] sm:flex-row"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          placeholder="Add ticker symbol to watchlist (e.g. RELIANCE, TCS)..."
          className="flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2.5 font-mono text-sm text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-[#16C784] focus:bg-white focus:outline-none dark:border-[#263247] dark:bg-[#0B1120] dark:text-white dark:placeholder:text-slate-500"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#16C784] px-4 py-2.5 text-xs font-semibold text-[#0B1120] hover:bg-[#13b074] disabled:opacity-60 whitespace-nowrap"
        >
          <Plus className="h-4 w-4" />
          Add Symbol
        </button>
      </form>

      <section className="rounded-xl border border-slate-200 bg-white dark:border-[#263247] dark:bg-[#111827]">
        {watchlist.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <Bookmark className="mx-auto h-8 w-8 text-slate-400 dark:text-slate-500" />
            <p className="mt-3 text-sm font-medium text-slate-800 dark:text-slate-200">
              Your watchlist is empty
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Add a stock symbol above or bookmark tickers from the Stock Explorer.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 dark:border-[#263247] dark:bg-[#0B1120] dark:text-slate-400">
                  <th className="px-5 py-3">Symbol</th>
                  <th className="px-4 py-3">Exchange</th>
                  <th className="px-4 py-3 text-right">Held Position</th>
                  <th className="px-4 py-3 text-right">Known EOD Price</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-[#263247]">
                {watchlist.map((sym) => {
                  const holding = holdings.find((h) => h.symbol.toUpperCase() === sym);
                  return (
                    <tr
                      key={sym}
                      className="hover:bg-slate-50 dark:hover:bg-[#162033]/50"
                    >
                      <td className="px-5 py-3.5 font-mono font-semibold text-slate-900 dark:text-white">
                        {sym}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-slate-500 dark:text-slate-400">
                        {exchange}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-xs tabular-nums text-slate-700 dark:text-slate-300">
                        {holding?.quantity ? `${holding.quantity} sh` : 'Not held'}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono tabular-nums text-slate-900 dark:text-white">
                        {holding?.currentPrice !== null && holding?.currentPrice !== undefined
                          ? formatCurrencyValue(holding.currentPrice, currency)
                          : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onInspectSymbol(sym)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-[#263247] dark:text-slate-200 dark:hover:bg-[#162033]"
                          >
                            <Activity className="h-3.5 w-3.5 text-[#16C784]" />
                            Analysis
                          </button>
                          <button
                            type="button"
                            onClick={() => onRecommendSymbol(sym)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-[#263247] dark:text-slate-200 dark:hover:bg-[#162033]"
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            Signal
                          </button>
                          <button
                            type="button"
                            onClick={() => onTradeSymbol(sym)}
                            className="rounded-lg bg-[#16C784] px-2.5 py-1.5 text-xs font-semibold text-[#0B1120] hover:bg-[#13b074]"
                          >
                            Trade
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveSymbol(sym)}
                            aria-label={`Remove ${sym} from watchlist`}
                            className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:text-[#EA3943] dark:border-[#263247]"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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
