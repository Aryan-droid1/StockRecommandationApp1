import React, { useState } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CandlestickChart,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface CandleDef {
  x: number;
  wickTop: number;
  wickBottom: number;
  bodyTop: number;
  bodyHeight: number;
  bullish: boolean;
  volHeight: number;
}

// Illustrative candlestick pattern for visual demonstration only
const ILLUSTRATIVE_CANDLES: CandleDef[] = [
  { x: 30, wickTop: 118, wickBottom: 158, bodyTop: 127, bodyHeight: 22, bullish: false, volHeight: 14 },
  { x: 60, wickTop: 122, wickBottom: 164, bodyTop: 132, bodyHeight: 24, bullish: true, volHeight: 18 },
  { x: 90, wickTop: 110, wickBottom: 150, bodyTop: 118, bodyHeight: 24, bullish: true, volHeight: 22 },
  { x: 120, wickTop: 102, wickBottom: 144, bodyTop: 112, bodyHeight: 20, bullish: false, volHeight: 15 },
  { x: 150, wickTop: 106, wickBottom: 148, bodyTop: 115, bodyHeight: 22, bullish: true, volHeight: 20 },
  { x: 180, wickTop: 92, wickBottom: 134, bodyTop: 100, bodyHeight: 24, bullish: true, volHeight: 25 },
  { x: 210, wickTop: 84, wickBottom: 124, bodyTop: 94, bodyHeight: 18, bullish: false, volHeight: 16 },
  { x: 240, wickTop: 74, wickBottom: 114, bodyTop: 82, bodyHeight: 24, bullish: true, volHeight: 24 },
  { x: 270, wickTop: 64, wickBottom: 104, bodyTop: 72, bodyHeight: 24, bullish: true, volHeight: 28 },
  { x: 300, wickTop: 68, wickBottom: 108, bodyTop: 78, bodyHeight: 18, bullish: false, volHeight: 17 },
  { x: 330, wickTop: 52, wickBottom: 94, bodyTop: 60, bodyHeight: 26, bullish: true, volHeight: 31 },
  { x: 360, wickTop: 40, wickBottom: 82, bodyTop: 48, bodyHeight: 24, bullish: true, volHeight: 29 },
  { x: 390, wickTop: 45, wickBottom: 86, bodyTop: 54, bodyHeight: 19, bullish: false, volHeight: 18 },
  { x: 420, wickTop: 32, wickBottom: 72, bodyTop: 40, bodyHeight: 24, bullish: true, volHeight: 33 },
  { x: 450, wickTop: 24, wickBottom: 64, bodyTop: 31, bodyHeight: 24, bullish: true, volHeight: 35 },
];

function StockSenseMark({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect
        x="1"
        y="1"
        width="34"
        height="34"
        rx="9"
        fill="#0F172A"
        stroke="#24324B"
        strokeWidth="1.5"
      />
      <line x1="11" y1="12" x2="11" y2="25" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="9" y="15" width="4" height="7" rx="1" fill="#3B82F6" />
      <line x1="18" y1="10" x2="18" y2="24" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="16" y="13" width="4" height="8" rx="1" fill="#10B981" />
      <line x1="25" y1="8" x2="25" y2="21" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="23" y="10" width="4" height="8" rx="1" fill="#10B981" />
      <path
        d="M8 25L15 19L20 21L28 11"
        stroke="#F8FAFC"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />
    </svg>
  );
}

function MarketPreviewIllustration() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#1E293B] bg-[#0B1221]/90 shadow-xl shadow-black/30">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1E293B] px-4 py-3 text-[11px]">
        <div className="flex items-center gap-2 font-mono">
          <CandlestickChart className="h-3.5 w-3.5 text-[#10B981]" />
          <span className="font-semibold text-slate-100">
            Market Structure &amp; Trend Study
          </span>
        </div>
        <span className="rounded-md border border-[#3B82F6]/30 bg-[#3B82F6]/10 px-2 py-0.5 font-mono text-[10px] font-medium text-sky-300">
          Illustrative Chart · Not Live Data
        </span>
      </div>

      <div className="px-2 pt-2">
        <svg
          viewBox="0 0 480 216"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="Illustrative financial candlestick and moving average chart"
          className="block h-40 w-full sm:h-48"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="ssEmeraldArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Subtle Grid */}
          <line x1="0" y1="36" x2="480" y2="36" stroke="#1E293B" strokeWidth="0.75" strokeDasharray="3 4" />
          <line x1="0" y1="78" x2="480" y2="78" stroke="#1E293B" strokeWidth="0.75" strokeDasharray="3 4" />
          <line x1="0" y1="120" x2="480" y2="120" stroke="#1E293B" strokeWidth="0.75" strokeDasharray="3 4" />
          <line x1="0" y1="164" x2="480" y2="164" stroke="#1E293B" strokeWidth="0.85" />

          <line x1="90" y1="0" x2="90" y2="164" stroke="#1E293B" strokeWidth="0.6" strokeDasharray="3 4" />
          <line x1="180" y1="0" x2="180" y2="164" stroke="#1E293B" strokeWidth="0.6" strokeDasharray="3 4" />
          <line x1="270" y1="0" x2="270" y2="164" stroke="#1E293B" strokeWidth="0.6" strokeDasharray="3 4" />
          <line x1="360" y1="0" x2="360" y2="164" stroke="#1E293B" strokeWidth="0.6" strokeDasharray="3 4" />

          {/* Area Gradient under Fast EMA */}
          <path
            d="M22 146 C 78 139, 128 125, 180 114 C 236 102, 290 86, 344 70 C 392 56, 428 48, 458 40 L458 164 L22 164 Z"
            fill="url(#ssEmeraldArea)"
          />

          {/* Secondary Blue Slow EMA Line */}
          <motion.path
            d="M22 154 C 86 149, 146 140, 210 128 C 278 114, 344 98, 458 76"
            stroke="#3B82F6"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0.2 }}
            animate={{ pathLength: 1, opacity: 0.7 }}
            transition={{ duration: 1.1, ease: 'easeOut' }}
          />

          {/* Primary Emerald Fast EMA Line */}
          <motion.path
            d="M22 146 C 78 139, 128 125, 180 114 C 236 102, 290 86, 344 70 C 392 56, 428 48, 458 40"
            stroke="#10B981"
            strokeWidth="1.85"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0.3 }}
            animate={{ pathLength: 1, opacity: 0.95 }}
            transition={{ duration: 1.0, ease: 'easeOut' }}
          />

          {/* Candlesticks + Volume Bars */}
          {ILLUSTRATIVE_CANDLES.map((c, idx) => {
            const fill = c.bullish ? '#10B981' : '#F04452';
            return (
              <motion.g
                key={c.x}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: idx * 0.03 }}
              >
                <line
                  x1={c.x}
                  y1={c.wickTop}
                  x2={c.x}
                  y2={c.wickBottom}
                  stroke={fill}
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
                <rect
                  x={c.x - 5.5}
                  y={c.bodyTop}
                  width="11"
                  height={c.bodyHeight}
                  rx="1.5"
                  fill={fill}
                />
                <rect
                  x={c.x - 4.5}
                  y={208 - c.volHeight}
                  width="9"
                  height={c.volHeight}
                  rx="1"
                  fill={fill}
                  opacity="0.32"
                />
              </motion.g>
            );
          })}
        </svg>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#1E293B] bg-[#080E1B]/70 px-4 py-2 text-[11px] text-slate-400">
        <div className="flex items-center gap-3 font-mono">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#10B981]" />
            EMA 9/21
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#3B82F6]" />
            SMA Trend
          </span>
        </div>
        <span className="text-[11px] text-slate-500">
          Illustrative pattern · Dashboard uses TejHQ EOD data
        </span>
      </div>
    </div>
  );
}

const FEATURE_HIGHLIGHTS = [
  {
    icon: Activity,
    title: 'Real-Time-Ready Market Analysis',
    description:
      'Interactive OHLCV candlesticks, moving averages, RSI, MACD, and ATR. Current feed uses TejHQ historical EOD data (not live).',
  },
  {
    icon: Sparkles,
    title: 'AI-Powered Stock Insights',
    description:
      'Transparent deterministic rule scoring and rationale today, paired with an upcoming XGBoost + Groq AI pipeline.',
  },
  {
    icon: ShieldCheck,
    title: 'Risk Management & Paper Trading',
    description:
      'Evaluate entry, stop-loss, and target levels while executing risk-free virtual trades with full portfolio tracking.',
  },
] as const;

export function AuthPanel() {
  const { login, register, sessionNotice, clearSessionNotice } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
  }>({});

  const switchMode = (nextMode: 'login' | 'register') => {
    if (submitting) return;
    setMode(nextMode);
    setError(null);
    setFieldErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setError(null);
    clearSessionNotice();

    const trimmedEmail = email.trim();
    const trimmedName = name.trim();
    const nextFieldErrors: {
      name?: string;
      email?: string;
      password?: string;
    } = {};

    if (mode === 'register' && !trimmedName) {
      nextFieldErrors.name = 'Full name is required to create an account.';
    }
    if (!trimmedEmail) {
      nextFieldErrors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      nextFieldErrors.email = 'Enter a valid email address.';
    }
    if (!password) {
      nextFieldErrors.password = 'Password is required.';
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setError(
        nextFieldErrors.email ||
          nextFieldErrors.password ||
          nextFieldErrors.name ||
          'Please complete all required fields.'
      );
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(trimmedEmail, password);
      } else {
        await register(trimmedName, trimmedEmail, password);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col justify-center overflow-x-hidden bg-[#080D18] px-4 py-8 text-slate-50 sm:px-6 lg:px-10">
      {/* Subtle Ambient Fintech Lighting & Hairline Grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 12% 18%, rgba(16, 185, 129, 0.08), transparent 42%), radial-gradient(circle at 88% 16%, rgba(59, 130, 246, 0.07), transparent 40%), linear-gradient(to right, rgba(30, 41, 59, 0.25) 1px, transparent 1px), linear-gradient(to bottom, rgba(30, 41, 59, 0.25) 1px, transparent 1px)',
          backgroundSize: 'auto, auto, 52px 52px, 52px 52px',
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-6xl">
        {/* Mobile Brand Header */}
        <div className="mb-6 flex items-center justify-between md:hidden">
          <div className="flex items-center gap-3">
            <StockSenseMark size={34} />
            <div>
              <span className="block text-base font-bold tracking-tight text-white">
                StockSense
              </span>
              <span className="block text-[11px] text-slate-400">
                Equity Analysis &amp; Paper Trading
              </span>
            </div>
          </div>
          <span className="rounded-md border border-[#1E293B] bg-[#0F172A] px-2.5 py-1 font-mono text-[10px] font-semibold text-[#10B981]">
            NSE / BSE
          </span>
        </div>

        <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-[54fr_46fr] lg:gap-14">
          {/* LEFT SECTION — BRANDING & MARKET OVERVIEW */}
          <motion.section
            aria-label="StockSense platform overview"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="order-2 flex flex-col space-y-6 md:order-1"
          >
            {/* Desktop Brand Header */}
            <div className="hidden items-center gap-3 md:flex">
              <StockSenseMark size={38} />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold tracking-tight text-white">
                    StockSense
                  </span>
                  <span className="rounded border border-[#10B981]/30 bg-[#10B981]/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#10B981]">
                    TERMINAL
                  </span>
                </div>
                <span className="block text-xs text-slate-400">
                  Stock Market Analysis &amp; Risk-Free Paper Trading
                </span>
              </div>
            </div>

            {/* Hero Heading & Supporting Copy */}
            <div className="space-y-3">
              <h1 className="max-w-xl text-2xl font-bold tracking-tight text-white [text-wrap:balance] sm:text-3xl lg:text-[2.45rem] lg:leading-[1.15]">
                Trade Smarter.{' '}
                <span className="text-[#10B981]">Invest with Confidence.</span>
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-slate-400 sm:text-[15px]">
                Make informed decisions with technical analysis, intelligent stock
                recommendations and professional market insights.
              </p>
            </div>

            {/* Illustrative Financial Market Chart */}
            <MarketPreviewIllustration />

            {/* Three Feature Highlights */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {FEATURE_HIGHLIGHTS.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="rounded-xl border border-[#1E293B] bg-[#0D1526]/85 p-3.5 transition-colors hover:border-[#2B3B55]"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#1E293B] bg-[#080D18]">
                        <Icon className="h-3.5 w-3.5 text-[#10B981]" />
                      </div>
                      <p className="text-xs font-semibold leading-tight text-slate-100">
                        {item.title}
                      </p>
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
                      {item.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </motion.section>

          {/* RIGHT SECTION — LOGIN / REGISTRATION CARD */}
          <motion.section
            aria-label="Account authentication"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.06, ease: 'easeOut' }}
            className="order-1 flex justify-center md:order-2 md:justify-end"
          >
            <div className="relative w-full max-w-[440px] overflow-hidden rounded-2xl border border-[#1E293B] bg-[#0E1729]/95 p-6 shadow-2xl shadow-black/50 backdrop-blur-sm sm:p-8">
              {/* Top Subtle Accent Hairline */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#10B981]/60 to-[#3B82F6]/40"
              />

              {/* Mode Switcher Tabs */}
              <div
                role="tablist"
                aria-label="Authentication mode"
                className="mb-6 grid grid-cols-2 gap-1 rounded-xl border border-[#1E293B] bg-[#080D18] p-1"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'login'}
                  onClick={() => switchMode('login')}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-150 ${
                    mode === 'login'
                      ? 'bg-[#152238] text-white shadow-xs ring-1 ring-[#26354D]'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'register'}
                  onClick={() => switchMode('register')}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-150 ${
                    mode === 'register'
                      ? 'bg-[#152238] text-white shadow-xs ring-1 ring-[#26354D]'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {/* Heading & Subtitle */}
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.16 }}
                  className="mb-6"
                >
                  <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                    {mode === 'login' ? 'Welcome back' : 'Create your account'}
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400 sm:text-sm">
                    {mode === 'login'
                      ? 'Sign in to continue to your trading dashboard.'
                      : 'Register to access technical analysis and paper trading.'}
                  </p>
                </motion.div>
              </AnimatePresence>

              {/* Alert / Error Banner */}
              {(sessionNotice || error) && (
                <div
                  role="alert"
                  className="mb-5 flex items-start gap-2.5 rounded-xl border border-[#F04452]/40 bg-[#F04452]/10 px-3.5 py-2.5 text-xs leading-relaxed text-red-100"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#F04452]" />
                  <span>{error ?? sessionNotice}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {mode === 'register' && (
                  <div>
                    <label
                      htmlFor="auth-name"
                      className="mb-1.5 block text-xs font-semibold text-slate-300"
                    >
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        id="auth-name"
                        type="text"
                        required
                        autoComplete="name"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          if (fieldErrors.name) {
                            setFieldErrors((prev) => ({ ...prev, name: undefined }));
                          }
                        }}
                        placeholder="Aarav Mehta"
                        aria-invalid={Boolean(fieldErrors.name)}
                        className={`auth-dark-input h-11 w-full rounded-xl border bg-[#0B1424] pr-3.5 pl-10 text-sm text-white placeholder:text-slate-500 transition-all duration-150 focus:outline-none focus:ring-2 ${
                          fieldErrors.name
                            ? 'border-[#F04452]/70 focus:border-[#F04452] focus:ring-[#F04452]/20'
                            : 'border-[#25344A] focus:border-[#10B981] focus:ring-[#10B981]/20'
                        }`}
                      />
                    </div>
                    {fieldErrors.name && (
                      <p className="mt-1 text-[11px] text-[#F04452]">{fieldErrors.name}</p>
                    )}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="auth-email"
                    className="mb-1.5 block text-xs font-semibold text-slate-300"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      id="auth-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (fieldErrors.email) {
                          setFieldErrors((prev) => ({ ...prev, email: undefined }));
                        }
                      }}
                      placeholder="trader@example.com"
                      aria-invalid={Boolean(fieldErrors.email)}
                      className={`auth-dark-input h-11 w-full rounded-xl border bg-[#0B1424] pr-3.5 pl-10 text-sm text-white placeholder:text-slate-500 transition-all duration-150 focus:outline-none focus:ring-2 ${
                        fieldErrors.email
                          ? 'border-[#F04452]/70 focus:border-[#F04452] focus:ring-[#F04452]/20'
                          : 'border-[#25344A] focus:border-[#10B981] focus:ring-[#10B981]/20'
                      }`}
                    />
                  </div>
                  {fieldErrors.email && (
                    <p className="mt-1 text-[11px] text-[#F04452]">{fieldErrors.email}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="auth-password"
                    className="mb-1.5 block text-xs font-semibold text-slate-300"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      id="auth-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (fieldErrors.password) {
                          setFieldErrors((prev) => ({ ...prev, password: undefined }));
                        }
                      }}
                      placeholder="Enter your password"
                      aria-invalid={Boolean(fieldErrors.password)}
                      className={`auth-dark-input h-11 w-full rounded-xl border bg-[#0B1424] pr-11 pl-10 text-sm text-white placeholder:text-slate-500 transition-all duration-150 focus:outline-none focus:ring-2 ${
                        fieldErrors.password
                          ? 'border-[#F04452]/70 focus:border-[#F04452] focus:ring-[#F04452]/20'
                          : 'border-[#25344A] focus:border-[#10B981] focus:ring-[#10B981]/20'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800/70 hover:text-white focus-visible:outline-2 focus-visible:outline-[#10B981]"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="mt-1 text-[11px] text-[#F04452]">{fieldErrors.password}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#10B981] px-4 text-sm font-bold text-[#080D18] shadow-lg shadow-[#10B981]/15 transition-all duration-150 hover:bg-[#0ea572] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{mode === 'login' ? 'Signing In...' : 'Creating Account...'}</span>
                    </>
                  ) : (
                    <>
                      <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Mode Switch Link */}
              <div className="mt-5 text-center text-xs text-slate-400">
                {mode === 'login' ? (
                  <>
                    Don&apos;t have an account?{' '}
                    <button
                      type="button"
                      onClick={() => switchMode('register')}
                      disabled={submitting}
                      className="font-semibold text-[#10B981] transition-colors hover:text-emerald-300 hover:underline disabled:opacity-60"
                    >
                      Create an account
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => switchMode('login')}
                      disabled={submitting}
                      className="font-semibold text-[#10B981] transition-colors hover:text-emerald-300 hover:underline disabled:opacity-60"
                    >
                      Sign in
                    </button>
                  </>
                )}
              </div>

              {/* Clean Security Footer */}
              <div className="mt-6 flex items-center justify-between gap-2 border-t border-[#1E293B] pt-4 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#10B981]" />
                  Authenticated session
                </span>
                <span className="font-mono text-slate-400">
                  TejHQ EOD · Paper Trading
                </span>
              </div>
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  );
}
