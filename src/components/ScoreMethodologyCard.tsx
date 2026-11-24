import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  HelpCircle,
  Info,
  MinusCircle,
} from 'lucide-react';
import { RecommendationResult } from '../api/stocksense';

interface ScoreMethodologyCardProps {
  recommendation: RecommendationResult | null;
}

interface RuleEvaluation {
  id: string;
  number: number;
  title: string;
  description: string;
  points: number;
  status: 'earned' | 'unearned' | 'penalty' | 'neutral';
  earnedPoints: number | null;
}

function asNum(val: unknown): number | null {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val === 'string' && val.trim() !== '') {
    const parsed = Number(val);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function getRuleEvaluations(
  recommendation: RecommendationResult | null
): { rules: RuleEvaluation[]; rsiOverbought: boolean } {
  const ind = recommendation?.indicators ?? null;
  const close = recommendation?.currentPrice ?? null;

  const ema9 = asNum(ind?.ema9);
  const ema21 = asNum(ind?.ema21);
  const ema200 = asNum(ind?.ema200);
  const sma20 = asNum(ind?.sma20);
  const sma50 = asNum(ind?.sma50);
  const rsi14 = asNum(ind?.rsi14);
  const averageVolume20 = asNum(ind?.averageVolume20);
  const latestVolume = asNum(ind?.latestVolume);

  const macdRaw =
    ind?.macd && typeof ind.macd === 'object' && !Array.isArray(ind.macd)
      ? (ind.macd as Record<string, unknown>)
      : null;
  const macdHist = asNum(macdRaw?.histogram ?? macdRaw?.hist);

  const rsiOverbought = rsi14 !== null && rsi14 > 70;

  const evalBool = (
    condition: boolean | null,
    maxPts: number
  ): { status: 'earned' | 'unearned' | 'neutral'; earnedPoints: number | null } => {
    if (condition === null) {
      return { status: 'neutral', earnedPoints: null };
    }
    return condition
      ? { status: 'earned', earnedPoints: maxPts }
      : { status: 'unearned', earnedPoints: 0 };
  };

  const r1 = evalBool(ema9 !== null && ema21 !== null ? ema9 > ema21 : null, 15);
  const r2 = evalBool(close !== null && ema200 !== null ? close > ema200 : null, 15);
  const r3 = evalBool(sma20 !== null && sma50 !== null ? sma20 > sma50 : null, 20);

  let r4: {
    status: 'earned' | 'unearned' | 'penalty' | 'neutral';
    earnedPoints: number | null;
  } = { status: 'neutral', earnedPoints: null };
  if (rsi14 !== null) {
    if (rsi14 > 70) {
      r4 = { status: 'penalty', earnedPoints: -10 };
    } else if (rsi14 >= 50 && rsi14 <= 70) {
      r4 = { status: 'earned', earnedPoints: 15 };
    } else {
      r4 = { status: 'unearned', earnedPoints: 0 };
    }
  }

  const r5 = evalBool(macdHist !== null ? macdHist > 0 : null, 20);
  const r6 = evalBool(close !== null && sma20 !== null ? close > sma20 : null, 10);
  const r7 = evalBool(
    latestVolume !== null && averageVolume20 !== null
      ? latestVolume > averageVolume20
      : null,
    5
  );

  return {
    rsiOverbought,
    rules: [
      {
        id: 'ema_9_21',
        number: 1,
        title: 'EMA 9/21 alignment',
        description: 'EMA 9 above EMA 21 earns 15 points.',
        points: 15,
        ...r1,
      },
      {
        id: 'price_ema_200',
        number: 2,
        title: 'Price above EMA 200',
        description: 'Closing price above EMA 200 earns 15 points.',
        points: 15,
        ...r2,
      },
      {
        id: 'sma_20_50',
        number: 3,
        title: 'SMA 20/50 trend',
        description: 'SMA 20 above SMA 50 earns 20 points.',
        points: 20,
        ...r3,
      },
      {
        id: 'rsi_momentum',
        number: 4,
        title: 'RSI momentum',
        description: 'RSI between 50 and 70 earns 15 points.',
        points: 15,
        ...r4,
      },
      {
        id: 'macd_momentum',
        number: 5,
        title: 'MACD momentum',
        description: 'Positive MACD histogram earns 20 points.',
        points: 20,
        ...r5,
      },
      {
        id: 'price_sma_20',
        number: 6,
        title: 'Price above SMA 20',
        description: 'Closing price above SMA 20 earns 10 points.',
        points: 10,
        ...r6,
      },
      {
        id: 'volume_confirmation',
        number: 7,
        title: 'Volume confirmation',
        description: 'Latest trading volume above its 20-day average earns 5 points.',
        points: 5,
        ...r7,
      },
    ],
  };
}

export function ScoreMethodologyCard({
  recommendation,
}: ScoreMethodologyCardProps) {
  const [expanded, setExpanded] = useState(false);

  const { rules, rsiOverbought } = getRuleEvaluations(recommendation);
  const hasActiveBreakdown = rules.some((r) => r.status !== 'neutral');

  return (
    <section
      aria-label="How is this score calculated?"
      className="rounded-xl border border-slate-200 bg-white dark:border-[#263247] dark:bg-[#111827]"
    >
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition-colors hover:bg-slate-50 dark:hover:bg-[#162033]/50"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 dark:border-[#263247] dark:bg-[#0B1120]">
            <HelpCircle className="h-4 w-4 text-[#16C784]" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              How is this score calculated?
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Understand the rules behind each stock recommendation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="hidden font-mono text-xs font-semibold text-slate-500 dark:text-slate-400 sm:inline">
            Max 100 pts
          </span>
          <ChevronDown
            className={`h-4 w-4 text-slate-500 transition-transform dark:text-slate-400 ${
              expanded ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {expanded && (
        <div className="space-y-6 border-t border-slate-200 p-6 dark:border-[#263247]">
          {/* Header Meta */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <span>7 deterministic indicator rules</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-white">
                Maximum score: 100 points
              </span>
            </div>

            {hasActiveBreakdown && (
              <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium">
                <span className="inline-flex items-center gap-1 text-[#16C784]">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Earned
                </span>
                <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
                  <MinusCircle className="h-3.5 w-3.5" />
                  Not Earned
                </span>
                {rsiOverbought && (
                  <span className="inline-flex items-center gap-1 text-[#EA3943]">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Penalty Applied
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Seven Scoring Rules */}
          <div className="space-y-3">
            {rules.map((rule) => {
              const isEarned = rule.status === 'earned';
              const isUnearned = rule.status === 'unearned';
              const isPenalty = rule.status === 'penalty';

              const containerClass = isEarned
                ? 'border-[#16C784]/35 bg-[#16C784]/5 dark:border-[#16C784]/30 dark:bg-[#16C784]/5'
                : isPenalty
                  ? 'border-[#EA3943]/40 bg-[#EA3943]/5 dark:border-[#EA3943]/40 dark:bg-[#EA3943]/10'
                  : 'border-slate-200 bg-slate-50 dark:border-[#263247] dark:bg-[#0B1120]';

              const barFillWidth = `${Math.min(100, (rule.points / 20) * 100)}%`;
              const barColor = isEarned
                ? 'bg-[#16C784]'
                : isPenalty
                  ? 'bg-[#EA3943]'
                  : isUnearned
                    ? 'bg-slate-300 dark:bg-slate-700'
                    : 'bg-sky-500/80 dark:bg-sky-400/70';

              return (
                <div
                  key={rule.id}
                  className={`rounded-lg border p-3.5 transition-colors ${containerClass}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-slate-200 bg-white font-mono text-[11px] font-bold text-slate-700 dark:border-[#263247] dark:bg-[#111827] dark:text-slate-300">
                        {rule.number}
                      </span>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {rule.title} — {rule.points} points
                          </p>
                          {isEarned && (
                            <span className="inline-flex items-center gap-1 rounded bg-[#16C784]/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#16C784]">
                              <CheckCircle2 className="h-3 w-3" />
                              EARNED
                            </span>
                          )}
                          {isUnearned && (
                            <span className="inline-flex items-center gap-1 rounded bg-slate-200/80 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-600 dark:bg-[#162033] dark:text-slate-400">
                              <MinusCircle className="h-3 w-3" />
                              NOT EARNED
                            </span>
                          )}
                          {isPenalty && (
                            <span className="inline-flex items-center gap-1 rounded bg-[#EA3943]/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#EA3943]">
                              <AlertTriangle className="h-3 w-3" />
                              OVERBOUGHT (-10 PTS)
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                          {rule.description}
                        </p>
                      </div>
                    </div>

                    <div className="text-right font-mono text-xs font-bold tabular-nums">
                      {rule.status === 'neutral' ? (
                        <span className="text-slate-700 dark:text-slate-300">
                          {rule.points} pts ({rule.points}%)
                        </span>
                      ) : isPenalty ? (
                        <span className="text-[#EA3943]">-10 / {rule.points} pts</span>
                      ) : (
                        <span
                          className={
                            isEarned
                              ? 'text-[#16C784]'
                              : 'text-slate-500 dark:text-slate-400'
                          }
                        >
                          {rule.earnedPoints} / {rule.points} pts
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Rule Weight Bar */}
                  <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-[#162033]">
                    <div
                      className={`h-full rounded-full transition-all ${barColor}`}
                      style={{ width: barFillWidth }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Overbought RSI Penalty Rule */}
          <div
            className={`rounded-lg border p-4 ${
              rsiOverbought
                ? 'border-[#EA3943]/50 bg-[#EA3943]/10'
                : 'border-amber-500/30 bg-amber-500/5'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <AlertTriangle
                className={`mt-0.5 h-4 w-4 shrink-0 ${
                  rsiOverbought ? 'text-[#EA3943]' : 'text-amber-500'
                }`}
              />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-900 dark:text-white">
                    Overbought RSI Penalty (-10 points)
                  </p>
                  {rsiOverbought && (
                    <span className="font-mono text-[10px] font-bold text-[#EA3943]">
                      ACTIVE FOR {recommendation?.symbol}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  When RSI exceeds 70, deduct 10 points from the total score as an overbought
                  penalty. RSI above 70 does not earn the 15 bullish RSI points.
                </p>
              </div>
            </div>
          </div>

          {/* Recommendation Classification Thresholds */}
          <div>
            <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
              Recommendation Classification
            </h3>
            <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-[#16C784]/35 bg-[#16C784]/10 px-4 py-3">
                <p className="font-mono text-sm font-bold text-[#16C784]">
                  70–100 · BUY
                </p>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                  Strong bullish technical alignment
                </p>
              </div>
              <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-4 py-3">
                <p className="font-mono text-sm font-bold text-amber-500">
                  40–69 · HOLD
                </p>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                  Mixed or neutral momentum signals
                </p>
              </div>
              <div className="rounded-lg border border-[#EA3943]/35 bg-[#EA3943]/10 px-4 py-3">
                <p className="font-mono text-sm font-bold text-[#EA3943]">
                  0–39 · SELL
                </p>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                  Bearish trend &amp; momentum pressure
                </p>
              </div>
            </div>
          </div>

          {/* Educational Disclaimer */}
          <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600 dark:border-[#263247] dark:bg-[#0B1120] dark:text-slate-400">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
            <span>
              This score is based on historical technical indicators (TejHQ EOD data) and is
              not a guaranteed prediction or financial advice.
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
