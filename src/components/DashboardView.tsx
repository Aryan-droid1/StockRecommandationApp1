import React from 'react';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  HoldingItem,
  PortfolioSummaryData,
  TradeRecord,
  WalletData,
} from '../api/stocksense';
import { ExchangeCode, NavPage } from '../types/navigation';
import {
  formatCurrencyValue,
  formatDateOnly,
  formatDateTime,
  formatNumber,
  formatSignedCurrency,
  formatSignedPercent,
} from '../utils/formatters';

interface DashboardViewProps {
  userName?: string;
  userEmail?: string;
  exchange: ExchangeCode;
  wallet: WalletData | null;
  portfolio: PortfolioSummaryData | null;
  holdings: HoldingItem[];
  trades: TradeRecord[];
  watchlist: string[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onNavigate: (page: NavPage) => void;
  onInspectSymbol: (symbol: string) => void;
  onRecommendSymbol: (symbol: string) => void;
  onTradeSymbol: (symbol: string, side?: 'BUY' | 'SELL') => void;
}

export function DashboardView({
  userName,
  userEmail,
  exchange,
  wallet,
  portfolio,
  holdings,
  trades,
  watchlist,
  loading,
  error,
  onRefresh,
  onNavigate,
  onInspectSymbol,
  onRecommendSymbol,
  onTradeSymbol,
}: DashboardViewProps) {
  const currency = portfolio?.currency ?? wallet?.currency ?? 'INR';
  const availableBalance = wallet?.balance ?? portfolio?.cashBalance ?? null;
  const holdingsInvested =
    holdings.length > 0
      ? holdings.reduce((sum, h) => sum + (h.investedValue ?? 0), 0)
      : null;
  const holdingsMarket =
    holdings.length > 0
      ? holdings.reduce(
          (sum, h) =>
            sum +
            (h.quantity !== null && h.currentPrice !== null
              ? h.quantity * h.currentPrice
              : (h.marketValue ?? h.investedValue ?? 0)),
          0
        )
      : null;

  const investedAmount =
    portfolio?.investedValue ?? holdingsInvested ?? wallet?.investedAmount ?? null;
  const holdingsCurrent =
    portfolio?.currentValue ?? holdingsMarket ?? wallet?.currentHoldingsValue ?? null;
  const totalValue =
    portfolio?.totalValue ??
    (availableBalance !== null && holdingsCurrent !== null
      ? availableBalance + holdingsCurrent
      : wallet?.totalPortfolioValue ?? null);
  const totalPnl =
    portfolio?.totalPnl ??
    (holdingsCurrent !== null && investedAmount !== null
      ? holdingsCurrent - investedAmount
      : wallet?.profitLoss ?? null);
  const totalPnlPercent =
    portfolio?.totalPnlPercent ??
    (totalPnl !== null && investedAmount !== null && investedAmount > 0
      ? (totalPnl / investedAmount) * 100
      : totalPnl === 0 && wallet !== null
        ? 0
        : null);

  const latestHoldingDate = holdings.find((h) => h.lastUpdated)?.lastUpdated;
  const displayName = userName || userEmail?.split('@')[0] || 'Trader';

  const pnlColor =
    totalPnl === null
      ? 'text-slate-900 dark:text-white'
      : totalPnl > 0
        ? 'text-[#16C784]'
        : totalPnl < 0
          ? 'text-[#EA3943]'
          : 'text-slate-900 dark:text-white';

  const totalHoldingsMarket = holdings.reduce(
    (sum, h) => sum + Math.max(0, h.marketValue ?? h.investedValue ?? 0),
    0
  );

  return (
    <div className="space-y-4">
      {/* Top Welcome & Market EOD Bar */}
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-3.5 dark:border-[#263247] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            Welcome back, {displayName}
          </h1>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
            {exchange} Virtual Portfolio · Market Data:{' '}
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              TejHQ Historical / EOD ({latestHoldingDate ? formatDateOnly(latestHoldingDate) : 'Not live'})
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-60 dark:border-[#263247] dark:bg-[#111827] dark:text-slate-200 dark:hover:bg-[#162033] whitespace-nowrap"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => onNavigate('trade')}
            className="inline-flex items-center gap-2 rounded-lg bg-[#16C784] px-4 py-2 text-xs font-semibold text-[#0B1120] transition-colors hover:bg-[#13b074] whitespace-nowrap"
          >
            New Paper Order
            <ArrowRight className="h-3.5 w-3.5" />
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
            className="self-start rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-100 dark:border-[#EA3943]/50 dark:bg-[#111827] dark:text-red-200 dark:hover:bg-[#162033] whitespace-nowrap"
          >
            Retry
          </button>
        </div>
      )}

      {/* 4 Financial Metric Cards */}
      <section
        aria-label="Portfolio summary metrics"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-[#263247] dark:bg-[#111827]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Total Portfolio Value
          </p>
          {loading && !portfolio ? (
            <div className="mt-3 h-8 w-36 animate-pulse rounded bg-slate-100 dark:bg-[#162033]" />
          ) : (
            <p className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums dark:text-white">
              {formatCurrencyValue(totalValue, currency)}
            </p>
          )}
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Cash + holdings (TejHQ EOD)
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-[#263247] dark:bg-[#111827]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Available Balance
          </p>
          {loading && !wallet ? (
            <div className="mt-3 h-8 w-36 animate-pulse rounded bg-slate-100 dark:bg-[#162033]" />
          ) : (
            <p className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums dark:text-white">
              {formatCurrencyValue(availableBalance, currency)}
            </p>
          )}
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Virtual paper trading funds
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-[#263247] dark:bg-[#111827]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Invested Amount
          </p>
          {loading && !portfolio ? (
            <div className="mt-3 h-8 w-36 animate-pulse rounded bg-slate-100 dark:bg-[#162033]" />
          ) : (
            <p className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums dark:text-white">
              {formatCurrencyValue(investedAmount, currency)}
            </p>
          )}
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {portfolio?.holdingsCount ?? holdings.length} active positions
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-[#263247] dark:bg-[#111827]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Total Profit / Loss
          </p>
          {loading && !portfolio ? (
            <div className="mt-3 h-8 w-36 animate-pulse rounded bg-slate-100 dark:bg-[#162033]" />
          ) : (
            <div className="mt-2 flex items-center gap-2">
              {totalPnl !== null && totalPnl > 0 && (
                <TrendingUp className="h-5 w-5 shrink-0 text-[#16C784]" />
              )}
              {totalPnl !== null && totalPnl < 0 && (
                <TrendingDown className="h-5 w-5 shrink-0 text-[#EA3943]" />
              )}
              <p className={`font-mono text-2xl font-bold tabular-nums ${pnlColor}`}>
                {formatSignedCurrency(totalPnl, currency)}
              </p>
            </div>
          )}
          <p className={`mt-2 font-mono text-xs tabular-nums ${pnlColor}`}>
            {totalPnlPercent !== null
              ? formatSignedPercent(totalPnlPercent)
              : 'Return % unavailable'}
          </p>
        </div>
      </section>

      {/* Main Grid: Portfolio Breakdown Chart + Market Overview */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-[#263247] dark:bg-[#111827] lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-[#263247]">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Portfolio Allocation &amp; Position Return
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Computed directly from /api/holdings · Historical equity time-series endpoint not connected
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('portfolio')}
              className="text-xs font-semibold text-[#16C784] hover:underline whitespace-nowrap"
            >
              Full Portfolio
            </button>
          </div>

          {holdings.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                No active holdings to chart
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Place a paper BUY order to populate your portfolio allocation breakdown.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-3.5">
              {holdings.slice(0, 6).map((h) => {
                const posValue = h.marketValue ?? h.investedValue ?? 0;
                const weight =
                  totalHoldingsMarket > 0 ? (posValue / totalHoldingsMarket) * 100 : 0;
                const posPnl = h.unrealizedPnl ?? 0;
                const barColor =
                  posPnl > 0
                    ? 'bg-[#16C784]'
                    : posPnl < 0
                      ? 'bg-[#EA3943]'
                      : 'bg-slate-400 dark:bg-slate-500';
                const textTone =
                  h.unrealizedPnl === null
                    ? 'text-slate-500 dark:text-slate-400'
                    : posPnl > 0
                      ? 'text-[#16C784]'
                      : posPnl < 0
                        ? 'text-[#EA3943]'
                        : 'text-slate-500 dark:text-slate-400';

                return (
                  <div key={h.symbol} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-4 text-xs">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onInspectSymbol(h.symbol)}
                          className="font-mono font-semibold text-slate-900 hover:text-[#16C784] dark:text-white"
                        >
                          {h.symbol}
                        </button>
                        <span className="font-mono text-slate-500 tabular-nums dark:text-slate-400">
                          {weight.toFixed(1)}% weight
                        </span>
                      </div>
                      <div className="flex items-center gap-3 font-mono tabular-nums">
                        <span className="text-slate-700 dark:text-slate-300">
                          {formatCurrencyValue(posValue, currency)}
                        </span>
                        <span className={textTone}>
                          {formatSignedCurrency(h.unrealizedPnl, currency)}
                        </span>
                      </div>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-[#0B1120]">
                      <div
                        className={`h-full rounded-full ${barColor}`}
                        style={{ width: `${Math.max(4, Math.min(100, weight))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Market Overview & Watchlist Snapshot */}
        <div className="space-y-6 lg:col-span-4">
          <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-[#263247] dark:bg-[#111827]">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-[#263247]">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Market Overview ({exchange})
              </h2>
              <span className="font-mono text-[11px] font-semibold text-amber-500">
                Not Connected
              </span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Bulk index and market-overview endpoints require inspecting the Express market route
              files not present in this workspace. All valuations use TejHQ historical/EOD data
              rather than live prices.
            </p>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-[#263247] dark:bg-[#111827]">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-[#263247]">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Watchlist
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('watchlist')}
                className="text-xs font-semibold text-[#16C784] hover:underline"
              >
                Manage
              </button>
            </div>
            {watchlist.length === 0 ? (
              <p className="py-5 text-xs text-slate-500 dark:text-slate-400">
                No symbols in watchlist yet.
              </p>
            ) : (
              <div className="mt-2 divide-y divide-slate-100 dark:divide-[#263247]">
                {watchlist.slice(0, 5).map((sym) => (
                  <div
                    key={sym}
                    className="flex items-center justify-between py-2.5 text-xs"
                  >
                    <span className="font-mono font-semibold text-slate-900 dark:text-white">
                      {sym}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onInspectSymbol(sym)}
                        className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                      >
                        Analyze
                      </button>
                      <button
                        type="button"
                        onClick={() => onRecommendSymbol(sym)}
                        className="font-semibold text-[#16C784] hover:underline"
                      >
                        Signal
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Bottom Row: Current Holdings + Recent Transactions */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <section className="rounded-xl border border-slate-200 bg-white dark:border-[#263247] dark:bg-[#111827] xl:col-span-7">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-[#263247]">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Current Holdings
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Real positions from /api/holdings · EOD valuation
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('holdings')}
              className="text-xs font-semibold text-[#16C784] hover:underline"
            >
              View All
            </button>
          </div>

          {holdings.length === 0 ? (
            <div className="px-5 py-10 text-center text-xs text-slate-500 dark:text-slate-400">
              No active holdings. Execute a paper BUY trade to open a position.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-500 dark:border-[#263247] dark:bg-[#0B1120] dark:text-slate-400">
                    <th className="px-5 py-3">Symbol</th>
                    <th className="px-3 py-3 text-right">Qty</th>
                    <th className="px-3 py-3 text-right">Avg Price</th>
                    <th className="px-3 py-3 text-right">EOD Price</th>
                    <th className="px-3 py-3 text-right">P&amp;L</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-[#263247]">
                  {holdings.slice(0, 5).map((h) => {
                    const rowTone =
                      h.unrealizedPnl === null
                        ? 'text-slate-500 dark:text-slate-400'
                        : h.unrealizedPnl > 0
                          ? 'text-[#16C784]'
                          : h.unrealizedPnl < 0
                            ? 'text-[#EA3943]'
                            : 'text-slate-500 dark:text-slate-400';

                    return (
                      <tr
                        key={h.symbol}
                        className="hover:bg-slate-50 dark:hover:bg-[#162033]/50"
                      >
                        <td className="px-5 py-3">
                          <button
                            type="button"
                            onClick={() => onInspectSymbol(h.symbol)}
                            className="font-mono font-semibold text-slate-900 hover:text-[#16C784] dark:text-white"
                          >
                            {h.symbol}
                          </button>
                        </td>
                        <td className="px-3 py-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                          {formatNumber(h.quantity, 0)}
                        </td>
                        <td className="px-3 py-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">
                          {formatCurrencyValue(h.avgPrice, currency)}
                        </td>
                        <td className="px-3 py-3 text-right font-mono tabular-nums text-slate-900 dark:text-white">
                          {formatCurrencyValue(h.currentPrice, currency)}
                        </td>
                        <td className={`px-3 py-3 text-right font-mono tabular-nums ${rowTone}`}>
                          {formatSignedCurrency(h.unrealizedPnl, currency)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => onTradeSymbol(h.symbol, 'SELL')}
                            className="rounded border border-[#EA3943]/40 px-2.5 py-1 text-[11px] font-semibold text-[#EA3943] hover:bg-[#EA3943]/10"
                          >
                            Sell
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white dark:border-[#263247] dark:bg-[#111827] xl:col-span-5">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-[#263247]">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Recent Transactions
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Latest paper orders from /api/trades/history
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('history')}
              className="text-xs font-semibold text-[#16C784] hover:underline"
            >
              Full History
            </button>
          </div>

          {trades.length === 0 ? (
            <div className="px-5 py-10 text-center text-xs text-slate-500 dark:text-slate-400">
              No paper trades recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-[#263247]">
              {trades.slice(0, 5).map((t, idx) => {
                const isBuy = t.side === 'BUY';
                return (
                  <div
                    key={t.id ?? `${t.symbol}-${idx}`}
                    className="flex items-center justify-between gap-3 px-5 py-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      {isBuy ? (
                        <ArrowUpRight className="h-4 w-4 shrink-0 text-[#16C784]" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 shrink-0 text-[#EA3943]" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono font-bold ${
                              isBuy ? 'text-[#16C784]' : 'text-[#EA3943]'
                            }`}
                          >
                            {t.side}
                          </span>
                          <span className="font-mono font-semibold text-slate-900 dark:text-white">
                            {t.symbol}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {formatDateTime(t.timestamp)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right font-mono tabular-nums">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {formatNumber(t.quantity, 0)} sh
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        @ {formatCurrencyValue(t.price, currency)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
