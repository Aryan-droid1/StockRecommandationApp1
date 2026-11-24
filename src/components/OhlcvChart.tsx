import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CandlestickData,
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramData,
  HistogramSeries,
  IChartApi,
  ISeriesApi,
  MouseEventParams,
  Time,
  createChart,
} from 'lightweight-charts';
import { OhlcvCandle } from '../api/stocksense';
import { formatCurrencyValue, formatDateOnly, formatNumber } from '../utils/formatters';

interface OhlcvChartProps {
  candles: OhlcvCandle[];
  symbol: string;
  exchange: string;
  currency?: string;
}

function formatVolumeCompact(volume: number): string {
  if (!Number.isFinite(volume)) return '—';
  if (volume >= 1_00_00_000) {
    return `${(volume / 1_00_00_000).toFixed(2)} Cr`;
  }
  if (volume >= 1_00_000) {
    return `${(volume / 1_00_000).toFixed(2)} L`;
  }
  if (volume >= 1_000) {
    return `${(volume / 1_000).toFixed(1)} K`;
  }
  return volume.toLocaleString('en-IN');
}

function getIsDarkTheme(): boolean {
  if (typeof document === 'undefined') return true;
  return document.documentElement.classList.contains('dark');
}

export function OhlcvChart({
  candles,
  symbol,
  exchange,
  currency = 'INR',
}: OhlcvChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick', Time> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram', Time> | null>(null);

  const [isDark, setIsDark] = useState<boolean>(getIsDarkTheme);
  const [hoveredCandle, setHoveredCandle] = useState<OhlcvCandle | null>(null);

  const candleByTime = useMemo(() => {
    const map = new Map<string, OhlcvCandle>();
    for (const c of candles) {
      map.set(c.time, c);
    }
    return map;
  }, [candles]);

  const latestCandle = candles.length > 0 ? candles[candles.length - 1] : null;
  const activeCandle = hoveredCandle ?? latestCandle;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const observer = new MutationObserver(() => {
      setIsDark(getIsDarkTheme());
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const dark = isDark;
    const chart = createChart(container, {
      width: Math.max(container.clientWidth, 300),
      height: 360,
      layout: {
        background: {
          type: ColorType.Solid,
          color: dark ? '#0B1120' : '#FFFFFF',
        },
        textColor: dark ? '#94A3B8' : '#475569',
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: 11,
      },
      grid: {
        vertLines: {
          color: dark ? 'rgba(38, 50, 71, 0.45)' : 'rgba(226, 232, 240, 0.8)',
        },
        horzLines: {
          color: dark ? 'rgba(38, 50, 71, 0.45)' : 'rgba(226, 232, 240, 0.8)',
        },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: dark ? '#475569' : '#94A3B8',
          labelBackgroundColor: dark ? '#1E293B' : '#334155',
        },
        horzLine: {
          color: dark ? '#475569' : '#94A3B8',
          labelBackgroundColor: dark ? '#1E293B' : '#334155',
        },
      },
      rightPriceScale: {
        borderColor: dark ? '#263247' : '#E2E8F0',
        scaleMargins: {
          top: 0.08,
          bottom: 0.28,
        },
      },
      timeScale: {
        borderColor: dark ? '#263247' : '#E2E8F0',
        timeVisible: false,
        rightOffset: 4,
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#16C784',
      downColor: '#EA3943',
      borderVisible: false,
      wickUpColor: '#16C784',
      wickDownColor: '#EA3943',
      priceLineVisible: true,
      lastValueVisible: true,
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
      lastValueVisible: false,
      priceLineVisible: false,
    });

    chart.priceScale('').applyOptions({
      scaleMargins: {
        top: 0.78,
        bottom: 0,
      },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const nextWidth = Math.floor(entry.contentRect.width);
        if (nextWidth > 0) {
          chart.applyOptions({ width: nextWidth });
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, [isDark]);

  useEffect(() => {
    const chart = chartRef.current;
    const candleSeries = candleSeriesRef.current;
    const volumeSeries = volumeSeriesRef.current;
    if (!chart || !candleSeries || !volumeSeries) return;

    const candleData: CandlestickData<Time>[] = candles.map((c) => ({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    const volumeData: HistogramData<Time>[] = candles.map((c) => ({
      time: c.time as Time,
      value: c.volume,
      color:
        c.close >= c.open
          ? 'rgba(22, 199, 132, 0.45)'
          : 'rgba(234, 57, 67, 0.45)',
    }));

    candleSeries.setData(candleData);
    volumeSeries.setData(volumeData);
    chart.timeScale().fitContent();
    setHoveredCandle(null);
  }, [candles, isDark]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const handleCrosshairMove = (param: MouseEventParams<Time>) => {
      if (!param.time) {
        setHoveredCandle(null);
        return;
      }
      const key =
        typeof param.time === 'string'
          ? param.time
          : typeof param.time === 'object' && 'year' in param.time
            ? `${param.time.year}-${String(param.time.month).padStart(2, '0')}-${String(param.time.day).padStart(2, '0')}`
            : '';
      const matched = key ? candleByTime.get(key) ?? null : null;
      setHoveredCandle(matched);
    };

    chart.subscribeCrosshairMove(handleCrosshairMove);
    return () => {
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
    };
  }, [candleByTime, isDark]);

  const candleChange =
    activeCandle && activeCandle.open !== 0
      ? ((activeCandle.close - activeCandle.open) / activeCandle.open) * 100
      : null;
  const isBullish = activeCandle ? activeCandle.close >= activeCandle.open : true;

  return (
    <div className="mt-4 space-y-2.5">
      {/* Crosshair OHLCV Legend Bar */}
      {activeCandle && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-[#263247] dark:bg-[#0B1120]">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-mono font-semibold text-slate-900 dark:text-white">
              {symbol} · {exchange}
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              {formatDateOnly(activeCandle.rawDate ?? activeCandle.time)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 font-mono tabular-nums">
            <span className="text-slate-500 dark:text-slate-400">
              O:{' '}
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {formatNumber(activeCandle.open, 2)}
              </span>
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              H:{' '}
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {formatNumber(activeCandle.high, 2)}
              </span>
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              L:{' '}
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {formatNumber(activeCandle.low, 2)}
              </span>
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              C:{' '}
              <span
                className={`font-semibold ${
                  isBullish ? 'text-[#16C784]' : 'text-[#EA3943]'
                }`}
              >
                {formatCurrencyValue(activeCandle.close, currency)}
              </span>
            </span>
            {candleChange !== null && (
              <span
                className={`font-semibold ${
                  candleChange >= 0 ? 'text-[#16C784]' : 'text-[#EA3943]'
                }`}
              >
                {candleChange >= 0 ? '+' : ''}
                {candleChange.toFixed(2)}%
              </span>
            )}
            <span className="text-slate-500 dark:text-slate-400">
              Vol:{' '}
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {formatVolumeCompact(activeCandle.volume)}
              </span>
            </span>
          </div>
        </div>
      )}

      {/* TradingView Lightweight Chart Canvas */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-[#263247] dark:bg-[#0B1120]">
        <div ref={containerRef} className="h-[360px] w-full" />
      </div>
    </div>
  );
}
