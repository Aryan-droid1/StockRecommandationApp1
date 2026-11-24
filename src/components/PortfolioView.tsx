import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Loader2,
  RefreshCw,
  Wallet,
  X,
} from 'lucide-react';
import { getErrorMessage } from '../api/client';
import {
  HoldingItem,
  PortfolioSummaryData,
  sellStock,
  TradeExecutionResult,
  WalletData,
} from '../api/stocksense';
import {
  formatCurrencyValue,
  formatDateOnly,
  formatNumber,
  formatSignedCurrency,
  formatSignedPercent,
} from '../utils/formatters';

interface PortfolioViewProps {
  mode: 'portfolio' | 'holdings';
  wallet: WalletData | null;
  portfolio: PortfolioSummaryData | null;
  holdings: HoldingItem[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onInspectSymbol: (symbol: string) => void;
  onSellSuccess?: (
    result: TradeExecutionResult,
    symbol: string
  ) => Promise<void> | void;
}

export function PortfolioView({
  mode,
  wallet,
  portfolio,
  holdings,
  loading,
  error,
  onRefresh,
  onInspectSymbol,
  onSellSuccess,
}: PortfolioViewProps) {
  const [sellTarget, setSellTarget] = useState<HoldingItem | null>(null);
  const [sellQtyInput, setSellQtyInput] = useState('1');
  const [sellSubmitting, setSellSubmitting] = useState(false);
  const [sellError, setSellError] = useState<string | null>(null);

  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    onRefreshRef.current();
  }, [mode]);

  useEffect(() => {
    if (!sellTarget) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !sellSubmitting) {
        setSellTarget(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sellTarget, sellSubmitting]);

  const currency = wallet?.currency ?? portfolio?.currency ?? 'INR';
  const cashBalance = wallet?.balance ?? null;

  const holdingRows = holdings.map((h) => {
    const rowInvested =
      h.investedValue ??
      (h.quantity !== null && h.avgPrice !== null
        ? h.quantity * h.avgPrice
        : null);
    const rowMarket =
      h.quantity !== null && h.currentPrice !== null
        ? h.quantity * h.currentPrice
        : h.marketValue;
    const rowPnl =
      rowMarket !== null && rowInvested !== null
        ? rowMarket - rowInvested
        : h.unrealizedPnl;
    const rowPnlPct =
      rowPnl !== null && rowInvested !== null && rowInvested > 0
        ? (rowPnl / rowInvested) * 100
        : h.unrealizedPnlPercent;

    return {
      holding: h,
      rowInvested,
      rowMarket,
      rowPnl,
      rowPnlPct,
    };
  });

  const hasHoldingsMarket = holdingRows.some((r) => r.rowMarket !== null);
  const hasHoldingsInvested = holdingRows.some((r) => r.rowInvested !== null);

  const holdingsMarketSum = hasHoldingsMarket
    ? holdingRows.reduce((sum, r) => sum + (r.rowMarket ?? 0), 0)
    : null;
  const holdingsInvestedSum = hasHoldingsInvested
    ? holdingRows.reduce((sum, r) => sum + (r.rowInvested ?? 0), 0)
    : null;

  const currentValue =
    holdings.length > 0
      ? (holdingsMarketSum ?? wallet?.currentHoldingsValue ?? null)
      : wallet !== null && !error
        ? (wallet.currentHoldingsValue ?? 0)
        : null;

  const investedValue =
    holdings.length > 0
      ? (holdingsInvestedSum ?? wallet?.investedAmount ?? null)
      : wallet !== null && !error
        ? (wallet.investedAmount ?? 0)
        : null;

  const totalValue =
    cashBalance !== null && currentValue !== null
      ? cashBalance + currentValue
      : null;

  const totalPnl =
    holdings.length > 0
      ? currentValue !== null && investedValue !== null
        ? currentValue - investedValue
        : (wallet?.profitLoss ?? null)
      : wallet !== null && !error
        ? (wallet.profitLoss ?? 0)
        : null;

  const totalPnlPercent =
    totalPnl !== null && investedValue !== null
      ? investedValue > 0
        ? (totalPnl / investedValue) * 100
        : holdings.length === 0 && totalPnl === 0
          ? 0
          : null
      : null;

  const pnlTone =
    totalPnl === null
      ? 'text-slate-900 dark:text-white'
      : totalPnl > 0
        ? 'text-[#16C784]'
        : totalPnl < 0
          ? 'text-[#EA3943]'
          : 'text-slate-900 dark:text-white';

  const openSellDialog = (holding: HoldingItem) => {
    setSellTarget(holding);
    setSellQtyInput('1');
    setSellError(null);
  };

  const closeSellDialog = () => {
    if (sellSubmitting) return;
    setSellTarget(null);
    setSellError(null);
  };

  const handleConfirmSell = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellTarget || sellSubmitting) return;

    const maxQty = sellTarget.quantity ?? 0;
    const qty = Number(sellQtyInput);

    if (!Number.isFinite(qty) || !Number.isInteger(qty) || qty <= 0) {
      setSellError('Enter a valid whole-number quantity of at least 1.');
      return;
    }
    if (maxQty > 0 && qty > maxQty) {
      setSellError(
        `Cannot sell ${qty} shares. You currently hold ${formatNumber(maxQty, 0)} shares.`
      );
      return;
    }

    setSellSubmitting(true);
    setSellError(null);
    try {
      const result = await sellStock({
        symbol: sellTarget.symbol,
        quantity: qty,
      });
      const soldSymbol = sellTarget.symbol;
      setSellTarget(null);
      if (onSellSuccess) {
        await onSellSuccess(result, soldSymbol);
      } else {
        onRefresh();
      }
    } catch (err) {
      setSellError(getErrorMessage(err));
    } finally {
      setSellSubmitting(false);
    }
  };

  const parsedSellQty = Number(sellQtyInput);
  const validSellQty =
    Number.isFinite(parsedSellQty) && parsedSellQty > 0 ? parsedSellQty : null;
  const estimatedProceeds =
    sellTarget &&
    sellTarget.currentPrice !== null &&
    validSellQty !== null
      ? sellTarget.currentPrice * validSellQty
      : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-3.5 dark:border-[#263247] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            {mode === 'portfolio' ? 'Portfolio Overview' : 'Active Holdings'}
          </h1>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
            Holdings valuation and unrealized returns based on TejHQ historical EOD prices (not live market prices).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {mode === 'holdings' && (
            <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs dark:border-[#263247] dark:bg-[#111827]">
              <Wallet className="h-3.5 w-3.5 text-[#16C784]" />
              <span className="text-slate-500 dark:text-slate-400">Wallet:</span>
              <span className="font-mono font-bold tabular-nums text-slate-900 dark:text-white">
                {formatCurrencyValue(cashBalance, currency)}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60 dark:border-[#263247] dark:bg-[#111827] dark:text-slate-200 dark:hover:bg-[#162033] whitespace-nowrap"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

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
            onClick={onRefresh}
            className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-800 dark:border-[#EA3943]/50 dark:bg-[#111827] dark:text-red-200"
          >
            Retry
          </button>
        </div>
      )}

      {mode === 'portfolio' && (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-[#263247] dark:bg-[#111827]">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Total Portfolio Value
            </p>
            {loading && wallet === null ? (
              <div className="mt-2.5 h-7 w-32 animate-pulse rounded bg-slate-100 dark:bg-[#162033]" />
            ) : (
              <p className="mt-2 font-mono text-xl font-bold text-slate-900 tabular-nums dark:text-white">
                {formatCurrencyValue(totalValue, currency)}
              </p>
            )}
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-[#263247] dark:bg-[#111827]">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Available Cash
            </p>
            {loading && wallet === null ? (
              <div className="mt-2.5 h-7 w-32 animate-pulse rounded bg-slate-100 dark:bg-[#162033]" />
            ) : (
              <p className="mt-2 font-mono text-xl font-bold text-slate-900 tabular-nums dark:text-white">
                {formatCurrencyValue(cashBalance, currency)}
              </p>
            )}
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-[#263247] dark:bg-[#111827]">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Holdings Market Value (EOD)
            </p>
            {loading && wallet === null ? (
              <div className="mt-2.5 h-7 w-32 animate-pulse rounded bg-slate-100 dark:bg-[#162033]" />
            ) : (
              <p className="mt-2 font-mono text-xl font-bold text-slate-900 tabular-nums dark:text-white">
                {formatCurrencyValue(currentValue, currency)}
              </p>
            )}
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-[#263247] dark:bg-[#111827]">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Total Profit / Loss
            </p>
            {loading && wallet === null ? (
              <div className="mt-2.5 h-7 w-28 animate-pulse rounded bg-slate-100 dark:bg-[#162033]" />
            ) : (
              <>
                <p className={`mt-2 font-mono text-xl font-bold tabular-nums ${pnlTone}`}>
                  {formatSignedCurrency(totalPnl, currency)}
                </p>
                {totalPnlPercent !== null && (
                  <p className={`mt-1 font-mono text-xs tabular-nums ${pnlTone}`}>
                    {formatSignedPercent(totalPnlPercent)}
                  </p>
                )}
              </>
            )}
          </div>
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white dark:border-[#263247] dark:bg-[#111827]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-4 dark:border-[#263247]">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Holdings ({holdings.length})
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            GET /api/holdings · EOD valuation (Not live)
          </span>
        </div>

        {loading && holdings.length === 0 ? (
          <div className="space-y-3 p-5">
            <div className="h-10 w-full animate-pulse rounded bg-slate-100 dark:bg-[#162033]" />
            <div className="h-10 w-full animate-pulse rounded bg-slate-100 dark:bg-[#162033]" />
            <div className="h-10 w-full animate-pulse rounded bg-slate-100 dark:bg-[#162033]" />
          </div>
        ) : holdings.length === 0 && error ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm font-medium text-red-700 dark:text-red-300">
              Unable to load holdings data
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Check the error banner above and click Retry to fetch your wallet and holdings.
            </p>
          </div>
        ) : holdings.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              No active holdings
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Positions opened via Paper Trading will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 dark:border-[#263247] dark:bg-[#0B1120] dark:text-slate-400">
                  <th className="px-5 py-3">Stock</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Avg Buy Price</th>
                  <th className="px-4 py-3 text-right">Current EOD Price</th>
                  <th className="px-4 py-3 text-right">Invested Amount</th>
                  <th className="px-4 py-3 text-right">Current Market Value</th>
                  <th className="px-4 py-3 text-right">Unrealized P&amp;L</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-[#263247]">
                {holdingRows.map(({ holding: h, rowInvested, rowMarket, rowPnl, rowPnlPct }, idx) => {

                  const rowTone =
                    rowPnl === null
                      ? 'text-slate-500 dark:text-slate-400'
                      : rowPnl > 0
                        ? 'text-[#16C784]'
                        : rowPnl < 0
                          ? 'text-[#EA3943]'
                          : 'text-slate-500 dark:text-slate-400';

                  return (
                    <tr
                      key={String(h.raw._id ?? h.raw.id ?? `${h.symbol}-${idx}`)}
                      className="hover:bg-slate-50 dark:hover:bg-[#162033]/50"
                    >
                      <td className="px-5 py-3.5">
                        <button
                          type="button"
                          onClick={() => onInspectSymbol(h.symbol)}
                          className="font-mono font-semibold text-slate-900 hover:text-[#16C784] dark:text-white"
                        >
                          {h.symbol}
                        </button>
                        {h.name && (
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {h.name}
                          </div>
                        )}
                        {h.lastUpdated && (
                          <div className="text-[11px] text-slate-400 dark:text-slate-500">
                            EOD {formatDateOnly(h.lastUpdated)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono tabular-nums text-slate-800 dark:text-slate-200">
                        {formatNumber(h.quantity, 0)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">
                        {formatCurrencyValue(h.avgPrice, currency)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono tabular-nums text-slate-900 dark:text-white">
                        <div>{formatCurrencyValue(h.currentPrice, currency)}</div>
                        <div className="font-sans text-[10px] text-slate-400 dark:text-slate-500">
                          EOD Price
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                        {formatCurrencyValue(rowInvested, currency)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-semibold tabular-nums text-slate-900 dark:text-white">
                        {formatCurrencyValue(rowMarket, currency)}
                      </td>
                      <td className={`px-4 py-3.5 text-right font-mono tabular-nums ${rowTone}`}>
                        <div className="font-semibold">
                          {formatSignedCurrency(rowPnl, currency)}
                        </div>
                        <div className="text-xs">
                          {formatSignedPercent(rowPnlPct)}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onInspectSymbol(h.symbol)}
                            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-[#263247] dark:text-slate-300 dark:hover:bg-[#162033] whitespace-nowrap"
                          >
                            Analysis
                          </button>
                          <button
                            type="button"
                            onClick={() => openSellDialog(h)}
                            className="rounded-lg bg-[#EA3943] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#d13039] whitespace-nowrap"
                          >
                            SELL
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

      {/* SELL Confirmation Dialog */}
      {sellTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="sell-dialog-title"
          onClick={closeSellDialog}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-[#263247] dark:bg-[#111827]"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4 dark:border-[#263247]">
              <div>
                <h2
                  id="sell-dialog-title"
                  className="text-base font-bold text-slate-900 dark:text-white"
                >
                  Confirm Paper Sell ·{' '}
                  <span className="font-mono">{sellTarget.symbol}</span>
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {sellTarget.name || sellTarget.symbol} · Settled at latest available EOD price
                </p>
              </div>
              <button
                type="button"
                onClick={closeSellDialog}
                disabled={sellSubmitting}
                aria-label="Close sell confirmation dialog"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 dark:hover:bg-[#162033] dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 dark:border-[#263247] dark:bg-[#0B1120]">
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Held Quantity
                </p>
                <p className="mt-1 font-mono text-sm font-bold tabular-nums text-slate-900 dark:text-white">
                  {formatNumber(sellTarget.quantity, 0)} shares
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 dark:border-[#263247] dark:bg-[#0B1120]">
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Latest EOD Price (Not live)
                </p>
                <p className="mt-1 font-mono text-sm font-bold tabular-nums text-slate-900 dark:text-white">
                  {formatCurrencyValue(sellTarget.currentPrice, currency)}
                </p>
              </div>
            </div>

            {sellError && (
              <div
                role="alert"
                className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800 dark:border-[#EA3943]/40 dark:bg-[#EA3943]/10 dark:text-red-200"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#EA3943]" />
                <span>{sellError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmSell} className="mt-4 space-y-4">
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label
                    htmlFor="sell-qty-input"
                    className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Quantity to Sell
                  </label>
                  {sellTarget.quantity !== null && sellTarget.quantity > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSellQtyInput(String(sellTarget.quantity));
                        setSellError(null);
                      }}
                      className="font-mono text-[11px] font-semibold text-[#16C784] hover:underline"
                    >
                      Sell All ({formatNumber(sellTarget.quantity, 0)})
                    </button>
                  )}
                </div>
                <input
                  id="sell-qty-input"
                  type="number"
                  min={1}
                  max={sellTarget.quantity ?? undefined}
                  step={1}
                  required
                  value={sellQtyInput}
                  onChange={(e) => {
                    setSellQtyInput(e.target.value);
                    if (sellError) setSellError(null);
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2.5 font-mono text-sm text-slate-900 focus:border-[#EA3943] focus:bg-white focus:outline-none dark:border-[#263247] dark:bg-[#0B1120] dark:text-white dark:focus:border-[#EA3943] dark:focus:bg-[#0B1120]"
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs dark:border-[#263247] dark:bg-[#0B1120]">
                <span className="text-slate-500 dark:text-slate-400">
                  Estimated EOD Proceeds
                </span>
                <span className="font-mono font-bold tabular-nums text-slate-900 dark:text-white">
                  {formatCurrencyValue(estimatedProceeds, currency)}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={closeSellDialog}
                  disabled={sellSubmitting}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60 dark:border-[#263247] dark:bg-[#0B1120] dark:text-slate-300 dark:hover:bg-[#162033]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sellSubmitting}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#EA3943] px-4 py-2 text-xs font-semibold text-white hover:bg-[#d13039] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sellSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {sellSubmitting ? 'Executing Sale...' : `Confirm Sell ${sellTarget.symbol}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
