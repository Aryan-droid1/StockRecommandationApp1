import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  Cpu,
  Loader2,
  Lock,
  MinusCircle,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { getErrorMessage } from '../api/client';
import {
  getRecommendations,
  HoldingItem,
  RecommendationResult,
} from '../api/stocksense';
import { ExchangeCode } from '../types/navigation';
import { ScoreMethodologyCard } from './ScoreMethodologyCard';
import {
  formatCurrencyValue,
  formatDateOnly,
  formatKeyLabel,
  formatNumber,
  formatUnknownValue,
} from '../utils/formatters';

interface RecommendationsViewProps {
  selectedSymbol: string;
  exchange?: ExchangeCode;
  currency?: string;
  onSymbolChange: (symbol: string) => void;
  holdings: HoldingItem[];
  onTradeSymbol: (symbol: string, side?: 'BUY' | 'SELL') => void;
}

function findLevel(
  levels: Record<string, unknown> | null,
  keys: string[]
): unknown {
  if (!levels) return undefined;
  const lower = new Map<string, unknown>();
  for (const [k, v] of Object.entries(levels)) {
    lower.set(k.toLowerCase(), v);
  }
  for (const k of keys) {
    const val = lower.get(k.toLowerCase());
    if (val !== undefined && val !== null) return val;
  }
  return undefined;
}

function formatLevelMoney(val: unknown, currency: string): string {
  if (val === undefined || val === null) return '—';
  if (typeof val === 'number' && Number.isFinite(val)) {
    return formatCurrencyValue(val, currency);
  }
  if (typeof val === 'string' && val.trim() !== '' && Number.isFinite(Number(val))) {
    return formatCurrencyValue(Number(val), currency);
  }
  return formatUnknownValue(val);
}

function formatPositionSize(val: unknown): string {
  if (val === undefined || val === null || val === '') {
    return 'Not specified';
  }
  if (typeof val === 'number' && Number.isFinite(val)) {
    return `${val.toLocaleString('en-IN')} shares`;
  }
  if (typeof val === 'object') {
    const rec = val as Record<string, unknown>;
    const qty = rec.quantity ?? rec.qty ?? rec.shares;
    if (typeof qty === 'number' && Number.isFinite(qty)) {
      return `${qty.toLocaleString('en-IN')} shares`;
    }
  }
  return formatUnknownValue(val);
}

function asNumeric(val: unknown): number | null {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val === 'string' && val.trim() !== '') {
    const parsed = Number(val);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

interface SignalContribution {
  delta: number;
  maxPoints: number;
  tone: 'positive' | 'negative' | 'neutral';
  label: string;
  note: string;
}

function getSignalContribution(
  reason: string,
  recommendation: RecommendationResult
): SignalContribution | null {
  const lower = reason.toLowerCase();
  const rsi14 = asNumeric(recommendation.indicators?.rsi14);

  if (lower.includes('ema 9/21') || lower.includes('ema9/21')) {
    const earned = lower.includes('bullish') || lower.includes('above');
    return {
      delta: earned ? 15 : 0,
      maxPoints: 15,
      tone: earned ? 'positive' : 'neutral',
      label: earned ? '+15 / 15 pts' : '0 / 15 pts',
      note: earned
        ? 'Impact: EMA 9 above EMA 21 confirms short-term upward momentum (+15 pts).'
        : 'Impact: EMA 9 trails EMA 21, withholding 15 short-term momentum points.',
    };
  }

  if (lower.includes('ema 200') || lower.includes('ema200')) {
    const earned = lower.includes('above') || lower.includes('bullish');
    return {
      delta: earned ? 15 : 0,
      maxPoints: 15,
      tone: earned ? 'positive' : 'neutral',
      label: earned ? '+15 / 15 pts' : '0 / 15 pts',
      note: earned
        ? 'Impact: Price holds above the 200-day institutional baseline, signaling long-term strength (+15 pts).'
        : 'Impact: Price sits below the 200-day baseline, indicating long-term weakness (0 of 15 pts).',
    };
  }

  if (lower.includes('sma trend') || lower.includes('sma 20/50')) {
    const earned = lower.includes('positive') || lower.includes('bullish');
    return {
      delta: earned ? 20 : 0,
      maxPoints: 20,
      tone: earned ? 'positive' : 'neutral',
      label: earned ? '+20 / 20 pts' : '0 / 20 pts',
      note: earned
        ? 'Impact: SMA 20 above SMA 50 confirms a sustained medium-term uptrend (+20 pts).'
        : 'Impact: SMA 20 below SMA 50 weighs on the medium-term trend score (0 of 20 pts).',
    };
  }

  if (lower.includes('rsi')) {
    const isOverbought =
      lower.includes('overbought') || (rsi14 !== null && rsi14 > 70);
    if (isOverbought) {
      return {
        delta: -10,
        maxPoints: 15,
        tone: 'negative',
        label: '-10 pts (Penalty)',
        note: 'Impact: RSI above 70 flags overbought exhaustion—loses the 15 bullish pts and deducts 10 pts.',
      };
    }
    const earned =
      lower.includes('healthy') ||
      lower.includes('bullish') ||
      (rsi14 !== null && rsi14 >= 50 && rsi14 <= 70 && !lower.includes('weak'));
    return {
      delta: earned ? 15 : 0,
      maxPoints: 15,
      tone: earned ? 'positive' : 'neutral',
      label: earned ? '+15 / 15 pts' : '0 / 15 pts',
      note: earned
        ? 'Impact: RSI in the 50–70 zone shows healthy buying momentum without overheating (+15 pts).'
        : 'Impact: RSI below 50 reflects subdued momentum, withholding 15 points.',
    };
  }

  if (lower.includes('macd')) {
    const earned = lower.includes('positive') || lower.includes('bullish');
    return {
      delta: earned ? 20 : 0,
      maxPoints: 20,
      tone: earned ? 'positive' : 'neutral',
      label: earned ? '+20 / 20 pts' : '0 / 20 pts',
      note: earned
        ? 'Impact: Positive MACD histogram signals accelerating trend momentum (+20 pts).'
        : 'Impact: Non-positive MACD histogram shows weak or bearish momentum (0 of 20 pts).',
    };
  }

  if (lower.includes('sma 20') || lower.includes('sma20')) {
    const earned = lower.includes('above');
    return {
      delta: earned ? 10 : 0,
      maxPoints: 10,
      tone: earned ? 'positive' : 'neutral',
      label: earned ? '+10 / 10 pts' : '0 / 10 pts',
      note: earned
        ? 'Impact: Close above SMA 20 shows near-term price support (+10 pts).'
        : 'Impact: Close below SMA 20 indicates short-term overhead resistance (0 of 10 pts).',
    };
  }

  if (lower.includes('volume')) {
    const earned = lower.includes('above') && !lower.includes('no volume');
    return {
      delta: earned ? 5 : 0,
      maxPoints: 5,
      tone: earned ? 'positive' : 'neutral',
      label: earned ? '+5 / 5 pts' : '0 / 5 pts',
      note: earned
        ? 'Impact: Above-average volume confirms institutional/market participation (+5 pts).'
        : 'Impact: Below-average volume shows muted participation (0 of 5 pts).',
    };
  }

  return null;
}

export function RecommendationsView({
  selectedSymbol,
  exchange = 'NSE',
  currency = 'INR',
  onSymbolChange,
  holdings,
  onTradeSymbol,
}: RecommendationsViewProps) {
  const [symbolInput, setSymbolInput] = useState(selectedSymbol);
  const [recommendation, setRecommendation] = useState<RecommendationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    setSymbolInput(selectedSymbol);
  }, [selectedSymbol]);

  const loadRecommendation = useCallback(
    async (sym: string, exch: ExchangeCode) => {
      const clean = sym.trim().toUpperCase();
      if (!clean) return;
      const reqId = ++requestIdRef.current;
      // Clear stale recommendation data immediately when switching or refreshing
      setRecommendation(null);
      setError(null);
      setLoading(true);
      try {
        const res = await getRecommendations(clean, exch);
        if (requestIdRef.current === reqId) {
          setRecommendation(res);
        }
      } catch (err) {
        if (requestIdRef.current === reqId) {
          setRecommendation(null);
          setError(getErrorMessage(err));
        }
      } finally {
        if (requestIdRef.current === reqId) {
          setLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    if (selectedSymbol.trim()) {
      void loadRecommendation(selectedSymbol, exchange);
    } else {
      requestIdRef.current += 1;
      setRecommendation(null);
      setError(null);
      setLoading(false);
    }
  }, [selectedSymbol, exchange, loadRecommendation]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = symbolInput.trim().toUpperCase();
    if (!clean) return;
    if (clean === selectedSymbol) {
      void loadRecommendation(clean, exchange);
    } else {
      onSymbolChange(clean);
    }
  };

  const levels = recommendation?.tradeLevels ?? null;
  const entryVal = findLevel(levels, ['entry', 'entryPrice', 'entry_price']);
  const stopLossVal = findLevel(levels, ['stopLoss', 'stop_loss', 'sl']);
  const targetVal = findLevel(levels, ['target', 'targetPrice', 'target_price', 'takeProfit', 'take_profit']);
  const riskRewardVal = findLevel(levels, ['riskReward', 'riskRewardRatio', 'risk_reward', 'rr']);
  const positionSizeVal =
    recommendation?.positionSize ??
    findLevel(levels, ['positionSize', 'position_size', 'qty', 'quantity']) ??
    null;

  const extraLevelEntries = levels
    ? Object.entries(levels).filter(
        ([k]) =>
          ![
            'entry',
            'entryprice',
            'entry_price',
            'stoploss',
            'stop_loss',
            'sl',
            'target',
            'targetprice',
            'target_price',
            'takeprofit',
            'take_profit',
            'riskreward',
            'riskrewardratio',
            'risk_reward',
            'rr',
            'positionsize',
            'position_size',
            'qty',
            'quantity',
          ].includes(k.toLowerCase())
      )
    : [];

  const signal = recommendation?.signal ?? null;
  const signalColor =
    signal === 'BUY'
      ? 'border-[#16C784]/40 bg-[#16C784]/10 text-[#16C784]'
      : signal === 'SELL'
        ? 'border-[#EA3943]/40 bg-[#EA3943]/10 text-[#EA3943]'
        : signal === 'HOLD'
          ? 'border-amber-500/40 bg-amber-500/10 text-amber-500'
          : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-[#263247] dark:bg-[#0B1120] dark:text-slate-300';

  const scorePct =
    recommendation?.score !== null && recommendation?.score !== undefined
      ? recommendation.maxScore
        ? Math.max(0, Math.min(100, (recommendation.score / recommendation.maxScore) * 100))
        : recommendation.score >= 0 && recommendation.score <= 100
          ? recommendation.score
          : null
      : null;

  const indObj = recommendation?.indicators ?? null;
  const closeNum = recommendation?.currentPrice ?? null;
  const sma20Num = asNumeric(indObj?.sma20);
  const sma50Num = asNumeric(indObj?.sma50);
  const ema9Num = asNumeric(indObj?.ema9);
  const ema21Num = asNumeric(indObj?.ema21);
  const ema200Num = asNumeric(indObj?.ema200);
  const rsi14Num = asNumeric(indObj?.rsi14);
  const atr14Num = asNumeric(indObj?.atr14);

  const indicatorItems = indObj
    ? [
        {
          label: 'SMA 20',
          value: formatLevelMoney(sma20Num, currency),
          note: '20-day simple moving average (short-term trend)',
          impact:
            closeNum !== null && sma20Num !== null
              ? closeNum > sma20Num
                ? 'Impact: Price above SMA 20 (+10 pts) & feeds SMA 20/50 trend.'
                : 'Impact: Price below SMA 20 (0/10 pts) & feeds SMA 20/50 trend.'
              : 'Impact: Worth 10 pts vs Close and 20 pts vs SMA 50.',
          tone: (
            closeNum !== null && sma20Num !== null
              ? closeNum > sma20Num
                ? 'positive'
                : 'negative'
              : 'neutral'
          ) as 'positive' | 'negative' | 'neutral',
        },
        {
          label: 'SMA 50',
          value: formatLevelMoney(sma50Num, currency),
          note: '50-day medium-term trend average',
          impact:
            sma20Num !== null && sma50Num !== null
              ? sma20Num > sma50Num
                ? 'Impact: SMA 20 > SMA 50 confirms medium-term uptrend (+20 pts).'
                : 'Impact: SMA 20 ≤ SMA 50 misses medium-term trend (+0/20 pts).'
              : 'Impact: Compared with SMA 20 for 20-point trend score.',
          tone: (
            sma20Num !== null && sma50Num !== null
              ? sma20Num > sma50Num
                ? 'positive'
                : 'negative'
              : 'neutral'
          ) as 'positive' | 'negative' | 'neutral',
        },
        {
          label: 'EMA 9',
          value: formatLevelMoney(ema9Num, currency),
          note: 'Fast 9-day exponential average',
          impact:
            ema9Num !== null && ema21Num !== null
              ? ema9Num > ema21Num
                ? 'Impact: EMA 9 > EMA 21 signals bullish momentum (+15 pts).'
                : 'Impact: EMA 9 ≤ EMA 21 signals weak short-term momentum (0/15 pts).'
              : 'Impact: Paired with EMA 21 for 15-point crossover rule.',
          tone: (
            ema9Num !== null && ema21Num !== null
              ? ema9Num > ema21Num
                ? 'positive'
                : 'negative'
              : 'neutral'
          ) as 'positive' | 'negative' | 'neutral',
        },
        {
          label: 'EMA 21',
          value: formatLevelMoney(ema21Num, currency),
          note: '21-day swing trend baseline',
          impact: 'Impact: Acts as dynamic swing baseline for the 15-pt EMA 9/21 rule.',
          tone: 'neutral' as const,
        },
        {
          label: 'EMA 200',
          value: formatLevelMoney(ema200Num, currency),
          note: '200-day long-term trend filter',
          impact:
            closeNum !== null && ema200Num !== null
              ? closeNum > ema200Num
                ? 'Impact: Price above EMA 200 confirms long-term uptrend (+15 pts).'
                : 'Impact: Price below EMA 200 signals long-term pressure (0/15 pts).'
              : 'Impact: Worth 15 pts when Close trades above EMA 200.',
          tone: (
            closeNum !== null && ema200Num !== null
              ? closeNum > ema200Num
                ? 'positive'
                : 'negative'
              : 'neutral'
          ) as 'positive' | 'negative' | 'neutral',
        },
        {
          label: 'RSI 14',
          value: formatNumber(rsi14Num, 2),
          note: '14-period momentum oscillator (0–100)',
          impact:
            rsi14Num !== null
              ? rsi14Num > 70
                ? 'Impact: Overbought (>70) triggers -10 pts penalty & 0 bullish pts.'
                : rsi14Num >= 50
                  ? 'Impact: Healthy 50–70 zone earns +15 bullish momentum pts.'
                  : 'Impact: Below 50 shows muted momentum (0/15 pts).'
              : 'Impact: +15 pts in 50–70 range; -10 pts penalty above 70.',
          tone: (
            rsi14Num === null
              ? 'neutral'
              : rsi14Num > 70
                ? 'negative'
                : rsi14Num >= 50
                  ? 'positive'
                  : 'neutral'
          ) as 'positive' | 'negative' | 'neutral',
        },
        {
          label: 'ATR 14',
          value: formatNumber(atr14Num, 2),
          note: '14-day Average True Range (volatility)',
          impact: 'Impact: Sizes volatility-adjusted Stop-Loss & Target Price (not scored).',
          tone: 'neutral' as const,
        },
      ].filter((item) => item.value !== '—')
    : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-3.5 dark:border-[#263247] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            Rule-Based Recommendations{selectedSymbol ? ` · ${selectedSymbol}` : ''}
          </h1>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
            Signal evaluation from <code className="font-mono">/api/recommendations/:symbol</code>{' '}
            ({exchange}) using TejHQ historical/EOD data.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={symbolInput}
              onChange={(e) => setSymbolInput(e.target.value.toUpperCase())}
              placeholder="Enter symbol..."
              className="w-48 rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-9 font-mono text-xs text-slate-900 focus:border-[#16C784] focus:outline-none dark:border-[#263247] dark:bg-[#111827] dark:text-white"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-[#16C784] px-4 py-2 text-xs font-semibold text-[#0B1120] hover:bg-[#13b074] disabled:opacity-60 whitespace-nowrap"
          >
            Evaluate
          </button>
        </form>
      </div>

      {holdings.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Your holdings:
          </span>
          {holdings.map((h) => (
            <button
              key={h.symbol}
              type="button"
              onClick={() => onSymbolChange(h.symbol)}
              className={`rounded-md border px-2.5 py-1 font-mono text-xs font-semibold transition-colors ${
                selectedSymbol === h.symbol
                  ? 'border-[#16C784] bg-[#16C784]/10 text-[#16C784]'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-[#263247] dark:bg-[#111827] dark:text-slate-300 dark:hover:bg-[#162033]'
              }`}
            >
              {h.symbol}
            </button>
          ))}
        </div>
      )}

      {/* Section 1: Rule-Based Recommendations */}
      <section
        aria-label="Rule-based recommendations"
        className="rounded-xl border border-slate-200 bg-white p-6 dark:border-[#263247] dark:bg-[#111827]"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-[#263247]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                {recommendation?.companyName
                  ? `${recommendation.companyName} (${recommendation.symbol})`
                  : 'Rule-Based Recommendations'}
              </h2>
              {recommendation?.currentPrice !== null &&
                recommendation?.currentPrice !== undefined && (
                  <span className="font-mono text-sm font-bold text-slate-900 tabular-nums dark:text-white">
                    {formatCurrencyValue(recommendation.currentPrice, currency)}
                  </span>
                )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Active deterministic scoring engine · {recommendation?.exchange ?? exchange}
              {recommendation?.asOf ? ` · EOD ${formatDateOnly(recommendation.asOf)}` : ''}
            </p>
          </div>
          {selectedSymbol && (
            <button
              type="button"
              onClick={() => void loadRecommendation(selectedSymbol, exchange)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-[#263247] dark:text-slate-300 dark:hover:bg-[#162033]"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          )}
        </div>

        {!selectedSymbol ? (
          <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            Enter a stock symbol above to fetch rule-based signal evaluation and trade levels.
          </p>
        ) : loading ? (
          <div className="flex items-center gap-2.5 py-12 text-sm text-slate-500 dark:text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin text-[#16C784]" />
            Evaluating rules for {selectedSymbol}...
          </div>
        ) : error ? (
          <div
            role="alert"
            className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-[#EA3943]/40 dark:bg-[#EA3943]/10 dark:text-red-200"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#EA3943]" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => void loadRecommendation(selectedSymbol, exchange)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-800 dark:border-[#EA3943]/50 dark:bg-[#111827] dark:text-red-200 whitespace-nowrap"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          </div>
        ) : !recommendation ? (
          <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            No recommendation payload returned for {selectedSymbol}.
          </p>
        ) : (
          <div className="mt-6 space-y-6">
            {/* Signal + Score Banner */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
              <div
                className={`flex items-center justify-between rounded-xl border p-5 md:col-span-5 ${signalColor}`}
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
                    Action Signal
                  </p>
                  <p className="mt-1 font-mono text-3xl font-bold tracking-tight">
                    {signal ?? 'UNAVAILABLE'}
                  </p>
                </div>
                {signal === 'BUY' ? (
                  <TrendingUp className="h-9 w-9" />
                ) : signal === 'SELL' ? (
                  <TrendingDown className="h-9 w-9" />
                ) : null}
              </div>

              <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-[#263247] dark:bg-[#0B1120] md:col-span-4">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Recommendation Score
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-mono text-3xl font-bold text-slate-900 tabular-nums dark:text-white">
                    {recommendation.score !== null ? recommendation.score : '—'}
                  </span>
                  {recommendation.maxScore !== null &&
                    recommendation.maxScore !== undefined && (
                      <span className="font-mono text-sm text-slate-500 dark:text-slate-400">
                        / {recommendation.maxScore}
                      </span>
                    )}
                </div>
                {scorePct !== null && (
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-[#162033]">
                    <div
                      className={`h-full rounded-full ${
                        signal === 'SELL'
                          ? 'bg-[#EA3943]'
                          : signal === 'HOLD'
                            ? 'bg-amber-500'
                            : 'bg-[#16C784]'
                      }`}
                      style={{ width: `${scorePct}%` }}
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-col justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-[#263247] dark:bg-[#0B1120] md:col-span-3">
                <button
                  type="button"
                  onClick={() => onTradeSymbol(selectedSymbol, 'BUY')}
                  className="w-full rounded-lg bg-[#16C784] px-3 py-2 text-xs font-semibold text-[#0B1120] hover:bg-[#13b074]"
                >
                  Paper BUY {selectedSymbol}
                </button>
                <button
                  type="button"
                  onClick={() => onTradeSymbol(selectedSymbol, 'SELL')}
                  className="w-full rounded-lg border border-[#EA3943]/40 bg-transparent px-3 py-2 text-xs font-semibold text-[#EA3943] hover:bg-[#EA3943]/10"
                >
                  Paper SELL {selectedSymbol}
                </button>
              </div>
            </div>

            {/* Trade Parameters */}
            <div>
              <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                Trade Levels &amp; Risk Parameters
              </h3>

              {levels ? (
                <>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    <LevelBox label="Entry Price" value={formatLevelMoney(entryVal, currency)} />
                    <LevelBox
                      label="Stop-Loss"
                      value={formatLevelMoney(stopLossVal, currency)}
                      tone="negative"
                    />
                    <LevelBox
                      label="Target Price"
                      value={formatLevelMoney(targetVal, currency)}
                      tone="positive"
                    />
                    <LevelBox label="Risk / Reward Ratio" value={formatUnknownValue(riskRewardVal)} />
                    <LevelBox
                      label="Position Size"
                      value={formatPositionSize(positionSizeVal)}
                    />
                  </div>

                  {extraLevelEntries.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                      {extraLevelEntries.map(([k, v]) => (
                        <LevelBox
                          key={k}
                          label={formatKeyLabel(k)}
                          value={formatUnknownValue(v)}
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-12">
                  <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-xs text-slate-600 dark:border-[#263247] dark:bg-[#0B1120] dark:text-slate-400 sm:col-span-9">
                    No active entry, stop-loss, or target trade levels returned for this{' '}
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {signal ?? 'neutral'}
                    </span>{' '}
                    signal.
                  </div>
                  <div className="sm:col-span-3">
                    <LevelBox
                      label="Position Size"
                      value={formatPositionSize(positionSizeVal)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Key Indicators Snapshot from Recommendation Payload */}
            {indicatorItems.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                  Evaluated Indicators &amp; Impact
                </h3>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {indicatorItems.map((item) => {
                    const impactColor =
                      item.tone === 'positive'
                        ? 'text-[#16C784]'
                        : item.tone === 'negative'
                          ? 'text-[#EA3943]'
                          : 'text-slate-600 dark:text-slate-300';
                    return (
                      <div
                        key={item.label}
                        className="flex flex-col justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-[#263247] dark:bg-[#0B1120]"
                      >
                        <div>
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                              {item.label}
                            </p>
                            <p className="font-mono text-sm font-bold tabular-nums text-slate-900 dark:text-white">
                              {item.value}
                            </p>
                          </div>
                          <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                            {item.note}
                          </p>
                        </div>
                        <p className={`mt-2 text-[11px] font-medium leading-snug ${impactColor}`}>
                          {item.impact}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Analysis Reasoning */}
            <div>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                  Analysis Reasoning
                </h3>
                {recommendation.reasons.length > 0 && (
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Score Contribution
                  </span>
                )}
              </div>
              {recommendation.reasons.length === 0 ? (
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  No individual rule explanations returned by the backend for {selectedSymbol}.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200 dark:divide-[#263247] dark:border-[#263247]">
                  {recommendation.reasons.map((reason, idx) => {
                    const contrib = getSignalContribution(reason, recommendation);
                    const iconEl =
                      contrib?.tone === 'positive' ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#16C784]" />
                      ) : contrib?.tone === 'negative' ? (
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#EA3943]" />
                      ) : (
                        <MinusCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                      );
                    const contribClass =
                      contrib?.tone === 'positive'
                        ? 'text-[#16C784]'
                        : contrib?.tone === 'negative'
                          ? 'text-[#EA3943]'
                          : 'text-slate-500 dark:text-slate-400';

                    return (
                      <li
                        key={idx}
                        className="flex items-start justify-between gap-4 px-4 py-3 text-sm text-slate-700 dark:text-slate-300"
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          {iconEl}
                          <div className="min-w-0">
                            <p className="font-medium text-slate-800 dark:text-slate-200">
                              {reason}
                            </p>
                            {contrib?.note && (
                              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                {contrib.note}
                              </p>
                            )}
                          </div>
                        </div>
                        {contrib && (
                          <span
                            className={`mt-0.5 shrink-0 font-mono text-xs font-bold tabular-nums ${contribClass}`}
                          >
                            {contrib.label}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Collapsible Scoring Methodology Explanation */}
      <ScoreMethodologyCard recommendation={recommendation} />

      {/* Section 2: ML-Based Recommendations (Locked / COMING SOON) */}
      <section
        aria-label="ML-based recommendations coming soon"
        className="rounded-xl border border-slate-200 bg-white p-6 dark:border-[#263247] dark:bg-[#111827]"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-[#263247]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 dark:border-[#263247] dark:bg-[#0B1120]">
              <BrainCircuit className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                ML-Based Recommendations
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                XGBoost + Groq AI Model Pipeline
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-slate-100 px-3 py-1 font-mono text-xs font-bold text-slate-700 dark:border-[#263247] dark:bg-[#0B1120] dark:text-slate-300">
            <Lock className="h-3 w-3" />
            COMING SOON
          </span>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-3 lg:col-span-8">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              XGBoost + Groq AI Predictive Engine
            </h3>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Our upcoming machine-learning layer pairs gradient-boosted tabular models
              (XGBoost) trained on multi-horizon TejHQ historical price and technical indicator
              features with Groq AI natural-language rationale synthesis.
            </p>
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Per StockSense integrity standards, no simulated predictions, synthetic probabilities,
              or mock confidence scores are displayed while this module is in development.
            </p>
          </div>

          <div className="flex flex-col justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center dark:border-[#263247] dark:bg-[#0B1120] lg:col-span-4">
            <Cpu className="mx-auto h-6 w-6 text-slate-400 dark:text-slate-500" />
            <p className="mt-2 font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
              COMING SOON
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              XGBoost Inference · Groq AI Explanation
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function LevelBox({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'positive' | 'negative' | 'neutral';
}) {
  const valueClass =
    tone === 'positive'
      ? 'text-[#16C784]'
      : tone === 'negative'
        ? 'text-[#EA3943]'
        : 'text-slate-900 dark:text-white';

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-[#263247] dark:bg-[#0B1120]">
      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 font-mono text-sm font-bold tabular-nums ${valueClass}`}>
        {value}
      </p>
    </div>
  );
}
