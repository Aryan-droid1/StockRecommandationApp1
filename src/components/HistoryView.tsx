import React, { useState } from 'react';
import { AlertCircle, RefreshCw, Search } from 'lucide-react';
import { TradeRecord } from '../api/stocksense';
import { formatCurrencyValue, formatDateTime, formatNumber } from '../utils/formatters';

interface HistoryViewProps {
  trades: TradeRecord[];
  currency?: string;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onInspectSymbol: (symbol: string) => void;
}

export function HistoryView({
  trades,
  currency = 'INR',
  loading,
  error,
  onRefresh,
  onInspectSymbol,
}: HistoryViewProps) {
  const [sideFilter, setSideFilter] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [symbolQuery, setSymbolQuery] = useState('');

  const filteredTrades = trades.filter((t) => {
    const matchesSide = sideFilter === 'ALL' || t.side.toUpperCase() === sideFilter;
    const matchesSymbol =
      !symbolQuery.trim() ||
      t.symbol.toUpperCase().includes(symbolQuery.trim().toUpperCase());
    return matchesSide && matchesSymbol;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-3.5 dark:border-[#263247] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            Trade History
          </h1>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
            Paper order ledger from <code className="font-mono">/api/trades/history</code> ·
            Settled on TejHQ historical/EOD data.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={symbolQuery}
              onChange={(e) => setSymbolQuery(e.target.value.toUpperCase())}
              placeholder="Filter symbol..."
              className="w-36 rounded-lg border border-slate-200 bg-white py-1.5 pr-3 pl-8 font-mono text-xs text-slate-900 focus:border-[#16C784] focus:outline-none dark:border-[#263247] dark:bg-[#111827] dark:text-white"
            />
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-[#263247] dark:bg-[#111827]">
            {(['ALL', 'BUY', 'SELL'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setSideFilter(option)}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                  sideFilter === option
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-[#162033] dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60 dark:border-[#263247] dark:bg-[#111827] dark:text-slate-200 dark:hover:bg-[#162033] whitespace-nowrap"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-[#EA3943]/40 dark:bg-[#EA3943]/10 dark:text-red-200 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#EA3943]" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="self-start rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-800 dark:border-[#EA3943]/50 dark:bg-[#111827] dark:text-red-200 whitespace-nowrap"
          >
            Retry
          </button>
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white dark:border-[#263247] dark:bg-[#111827]">
        {loading && trades.length === 0 ? (
          <div className="space-y-3 p-5">
            <div className="h-10 w-full animate-pulse rounded bg-slate-100 dark:bg-[#162033]" />
            <div className="h-10 w-full animate-pulse rounded bg-slate-100 dark:bg-[#162033]" />
            <div className="h-10 w-full animate-pulse rounded bg-slate-100 dark:bg-[#162033]" />
          </div>
        ) : filteredTrades.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              No trade records found
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Executed paper BUY and SELL orders will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 dark:border-[#263247] dark:bg-[#0B1120] dark:text-slate-400">
                  <th className="px-5 py-3">Date</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Transaction Type</th>
                  <th className="px-4 py-3 text-right">Quantity</th>
                  <th className="px-4 py-3 text-right">Execution Price</th>
                  <th className="px-4 py-3 text-right">Total Amount</th>
                  <th className="px-5 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-[#263247]">
                {filteredTrades.map((trade, index) => {
                  const isBuy = trade.side === 'BUY';
                  const computedTotal =
                    trade.totalAmount ??
                    (trade.quantity !== null && trade.price !== null
                      ? trade.quantity * trade.price
                      : null);

                  return (
                    <tr
                      key={trade.id ?? `${trade.symbol}-${trade.timestamp ?? index}`}
                      className="hover:bg-slate-50 dark:hover:bg-[#162033]/50"
                    >
                      <td className="px-5 py-3.5 text-xs text-slate-600 tabular-nums dark:text-slate-400 whitespace-nowrap">
                        {formatDateTime(trade.timestamp)}
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() => onInspectSymbol(trade.symbol)}
                          className="font-mono font-semibold text-slate-900 hover:text-[#16C784] dark:text-white"
                        >
                          {trade.symbol}
                        </button>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`font-mono text-xs font-bold ${
                            isBuy ? 'text-[#16C784]' : 'text-[#EA3943]'
                          }`}
                        >
                          {trade.side}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono tabular-nums text-slate-800 dark:text-slate-200">
                        {formatNumber(trade.quantity, 0)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                        {formatCurrencyValue(trade.price, currency)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-semibold tabular-nums text-slate-900 dark:text-white">
                        {formatCurrencyValue(computedTotal, currency)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-xs font-medium text-slate-600 dark:text-slate-300">
                        {trade.status ?? 'Executed'}
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
