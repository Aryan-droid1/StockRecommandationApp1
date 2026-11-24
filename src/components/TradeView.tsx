import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { getErrorMessage } from '../api/client';
import {
  buyStock,
  HoldingItem,
  sellStock,
  TradeExecutionResult,
  WalletData,
} from '../api/stocksense';
import { ExchangeCode } from '../types/navigation';
import { formatCurrencyValue, formatNumber } from '../utils/formatters';

interface TradeViewProps {
  initialSymbol: string;
  initialSide?: 'BUY' | 'SELL';
  exchange: ExchangeCode;
  wallet: WalletData | null;
  holdings: HoldingItem[];
  watchlist: string[];
  onTradeSuccess: (result: TradeExecutionResult, side: 'BUY' | 'SELL', symbol: string) => Promise<void> | void;
}

export function TradeView({
  initialSymbol,
  initialSide = 'BUY',
  exchange,
  wallet,
  holdings,
  watchlist,
  onTradeSuccess,
}: TradeViewProps) {
  const [side, setSide] = useState<'BUY' | 'SELL'>(initialSide);
  const [symbol, setSymbol] = useState(initialSymbol);
  const [quantity, setQuantity] = useState('1');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TradeExecutionResult | null>(null);

  useEffect(() => {
    if (initialSymbol) setSymbol(initialSymbol.toUpperCase());
  }, [initialSymbol]);

  useEffect(() => {
    setSide(initialSide);
  }, [initialSide]);

  const currency = wallet?.currency ?? 'INR';
  const normalizedSymbol = symbol.trim().toUpperCase();
  const currentHolding = holdings.find(
    (h) => h.symbol.toUpperCase() === normalizedSymbol
  );

  const parsedQty = Number(quantity);
  const validQty = Number.isFinite(parsedQty) && parsedQty > 0 && Number.isInteger(parsedQty);

  const knownEodPrice = currentHolding?.currentPrice ?? null;
  const estimatedValue =
    knownEodPrice !== null && validQty ? knownEodPrice * parsedQty : null;

  const quickSymbols = Array.from(
    new Set([
      ...holdings.map((h) => h.symbol.toUpperCase()),
      ...watchlist.map((w) => w.toUpperCase()),
    ])
  ).slice(0, 8);

  const handleReviewOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!normalizedSymbol) {
      setError('Enter a valid stock symbol.');
      return;
    }
    if (!validQty) {
      setError('Quantity must be a positive whole number.');
      return;
    }
    if (side === 'SELL' && currentHolding?.quantity !== null && currentHolding?.quantity !== undefined && parsedQty > currentHolding.quantity) {
      setError(`Cannot sell ${parsedQty} shares; you hold ${currentHolding.quantity} shares of ${normalizedSymbol}.`);
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirmExecute = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const response =
        side === 'BUY'
          ? await buyStock({ symbol: normalizedSymbol, quantity: parsedQty })
          : await sellStock({ symbol: normalizedSymbol, quantity: parsedQty });

      setConfirmOpen(false);
      setResult(response);
      await onTradeSuccess(response, side, normalizedSymbol);
    } catch (err) {
      setConfirmOpen(false);
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 border-b border-slate-200 pb-3.5 dark:border-[#263247] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            Paper Trading ({exchange})
          </h1>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
            Virtual order execution only — no real money or live brokerage routing. Executed via
            TejHQ historical/EOD reference pricing.
          </p>
        </div>
        <span className="font-mono text-xs font-semibold text-[#16C784]">
          VIRTUAL TRADING MODE
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Order Ticket */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-[#263247] dark:bg-[#111827] lg:col-span-7">
          <div className="mb-6 grid grid-cols-2 gap-1.5 rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-[#263247] dark:bg-[#0B1120]">
            <button
              type="button"
              onClick={() => {
                setSide('BUY');
                setError(null);
                setResult(null);
                setConfirmOpen(false);
              }}
              className={`rounded-md px-4 py-2.5 text-xs font-bold tracking-wide transition-colors ${
                side === 'BUY'
                  ? 'bg-[#16C784] text-[#0B1120]'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              BUY
            </button>
            <button
              type="button"
              onClick={() => {
                setSide('SELL');
                setError(null);
                setResult(null);
                setConfirmOpen(false);
              }}
              className={`rounded-md px-4 py-2.5 text-xs font-bold tracking-wide transition-colors ${
                side === 'SELL'
                  ? 'bg-[#EA3943] text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              SELL
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-[#EA3943]/40 dark:bg-[#EA3943]/10 dark:text-red-200"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#EA3943]" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div
              role="status"
              className="mb-5 flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-[#16C784]/40 dark:bg-[#16C784]/10 dark:text-emerald-200"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#16C784]" />
              <div>
                <p className="font-semibold">
                  {result.message ?? `${side} paper order executed for ${normalizedSymbol}.`}
                </p>
                {result.trade && (
                  <p className="mt-1 font-mono text-xs tabular-nums opacity-90">
                    {result.trade.side} {formatNumber(result.trade.quantity, 0)}{' '}
                    {result.trade.symbol}
                    {result.trade.price !== null
                      ? ` @ ${formatCurrencyValue(result.trade.price, currency)} (TejHQ EOD)`
                      : ''}
                  </p>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleReviewOrder} className="space-y-5">
            <div>
              <label
                htmlFor="trade-symbol"
                className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Stock Symbol
              </label>
              <input
                id="trade-symbol"
                type="text"
                required
                value={symbol}
                onChange={(e) => {
                  setSymbol(e.target.value.toUpperCase());
                  setConfirmOpen(false);
                }}
                placeholder="e.g. RELIANCE, TCS, INFY"
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-sm text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-[#16C784] focus:outline-none dark:border-[#263247] dark:bg-[#0B1120] dark:text-white dark:placeholder:text-slate-500"
              />
              {quickSymbols.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Quick select:
                  </span>
                  {quickSymbols.map((sym) => (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => {
                        setSymbol(sym);
                        setConfirmOpen(false);
                      }}
                      className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-700 hover:bg-slate-100 dark:border-[#263247] dark:bg-[#0B1120] dark:text-slate-300 dark:hover:bg-[#162033]"
                    >
                      {sym}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label
                  htmlFor="trade-quantity"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Quantity (Shares)
                </label>
                {side === 'SELL' && currentHolding?.quantity !== null && currentHolding?.quantity !== undefined && (
                  <button
                    type="button"
                    onClick={() => setQuantity(String(currentHolding.quantity))}
                    className="font-mono text-[11px] font-semibold text-[#16C784] hover:underline"
                  >
                    Max: {formatNumber(currentHolding.quantity, 0)}
                  </button>
                )}
              </div>
              <input
                id="trade-quantity"
                type="number"
                min={1}
                step={1}
                required
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value);
                  setConfirmOpen(false);
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-sm text-slate-900 tabular-nums focus:border-[#16C784] focus:outline-none dark:border-[#263247] dark:bg-[#0B1120] dark:text-white"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[1, 5, 10, 25, 50].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setQuantity(String(preset));
                      setConfirmOpen(false);
                    }}
                    className="rounded border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-[11px] font-medium text-slate-700 hover:bg-slate-100 dark:border-[#263247] dark:bg-[#0B1120] dark:text-slate-300 dark:hover:bg-[#162033]"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-[#263247] dark:bg-[#0B1120]">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">
                  Estimated Order Value
                </span>
                <span className="font-mono font-bold text-slate-900 tabular-nums dark:text-white">
                  {estimatedValue !== null
                    ? formatCurrencyValue(estimatedValue, currency)
                    : 'Resolved at execution (TejHQ EOD)'}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">
                  Available Virtual Balance
                </span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums dark:text-white">
                  {formatCurrencyValue(wallet?.balance ?? null, currency)}
                </span>
              </div>
            </div>

            {!confirmOpen ? (
              <button
                type="submit"
                className={`flex w-full items-center justify-center rounded-lg px-4 py-3 text-sm font-bold transition-colors ${
                  side === 'BUY'
                    ? 'bg-[#16C784] text-[#0B1120] hover:bg-[#13b074]'
                    : 'bg-[#EA3943] text-white hover:bg-[#d13039]'
                }`}
              >
                Review Paper {side} Order
              </button>
            ) : (
              <div className="space-y-3 rounded-xl border border-slate-300 bg-slate-50 p-4 dark:border-[#263247] dark:bg-[#0B1120]">
                <p className="text-xs font-semibold text-slate-900 dark:text-white">
                  Confirm Virtual Order: {side} {parsedQty} {normalizedSymbol}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Submits directly to <code className="font-mono">/api/trades/{side.toLowerCase()}</code> using TejHQ EOD settlement price.
                </p>
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setConfirmOpen(false)}
                    disabled={submitting}
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-[#263247] dark:bg-[#111827] dark:text-slate-300 dark:hover:bg-[#162033]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleConfirmExecute()}
                    disabled={submitting}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-colors disabled:opacity-60 ${
                      side === 'BUY'
                        ? 'bg-[#16C784] text-[#0B1120] hover:bg-[#13b074]'
                        : 'bg-[#EA3943] text-white hover:bg-[#d13039]'
                    }`}
                  >
                    {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Confirm {side}
                  </button>
                </div>
              </div>
            )}
          </form>
        </section>

        {/* Right Summary */}
        <aside className="space-y-4 lg:col-span-5">
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-[#263247] dark:bg-[#111827]">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Account &amp; Position Context
            </h2>
            <dl className="mt-4 space-y-3 text-xs">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-500 dark:text-slate-400">Available Virtual Balance</dt>
                <dd className="font-mono font-bold text-slate-900 tabular-nums dark:text-white">
                  {formatCurrencyValue(wallet?.balance ?? null, currency)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-3 dark:border-[#263247]">
                <dt className="text-slate-500 dark:text-slate-400">
                  Held {normalizedSymbol ? `(${normalizedSymbol})` : 'Shares'}
                </dt>
                <dd className="font-mono font-semibold text-slate-900 tabular-nums dark:text-white">
                  {currentHolding ? `${formatNumber(currentHolding.quantity, 0)} sh` : '0 sh'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-3 dark:border-[#263247]">
                <dt className="text-slate-500 dark:text-slate-400">Avg Buy Price</dt>
                <dd className="font-mono font-semibold text-slate-900 tabular-nums dark:text-white">
                  {currentHolding
                    ? formatCurrencyValue(currentHolding.avgPrice, currency)
                    : '—'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-3 dark:border-[#263247]">
                <dt className="text-slate-500 dark:text-slate-400">Last EOD Price (TejHQ)</dt>
                <dd className="font-mono font-semibold text-slate-900 tabular-nums dark:text-white">
                  {currentHolding
                    ? formatCurrencyValue(currentHolding.currentPrice, currency)
                    : '—'}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-[#263247] dark:bg-[#111827]">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white">
              <ShieldAlert className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-semibold">Virtual Execution Disclosure</h2>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Paper trades execute exclusively within your StockSense virtual wallet using TejHQ
              historical end-of-day (EOD) prices. No real brokerage orders are transmitted.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
