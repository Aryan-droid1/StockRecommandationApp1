import React from 'react';
import { LogOut, Moon, Server, ShieldCheck, Sun } from 'lucide-react';
import { API_BASE_URL } from '../api/client';
import { ExchangeCode } from '../types/navigation';

interface SettingsViewProps {
  userEmail?: string;
  userName?: string;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  exchange: ExchangeCode;
  onChangeExchange: (exchange: ExchangeCode) => void;
  onLogout: () => void;
}

export function SettingsView({
  userEmail,
  userName,
  theme,
  onToggleTheme,
  exchange,
  onChangeExchange,
  onLogout,
}: SettingsViewProps) {
  return (
    <div className="space-y-4">
      <div className="border-b border-slate-200 pb-3.5 dark:border-[#263247]">
        <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
          Terminal Settings
        </h1>
        <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
          Display preferences, exchange context, and active backend session status.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-[#263247] dark:bg-[#111827]">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Interface &amp; Market Preferences
          </h2>

          <div className="mt-5 space-y-5">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4 dark:border-[#263247]">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  Terminal Theme
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Switch between dark-first navy terminal and light workspace.
                </p>
              </div>
              <button
                type="button"
                onClick={onToggleTheme}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 dark:border-[#263247] dark:bg-[#0B1120] dark:text-white dark:hover:bg-[#162033]"
              >
                {theme === 'dark' ? (
                  <>
                    <Moon className="h-3.5 w-3.5 text-[#16C784]" />
                    Dark Mode
                  </>
                ) : (
                  <>
                    <Sun className="h-3.5 w-3.5 text-amber-500" />
                    Light Mode
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  Default Exchange Label
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Sets the exchange indicator across header and explorer views.
                </p>
              </div>
              <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-[#263247] dark:bg-[#0B1120]">
                {(['NSE', 'BSE'] as const).map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => onChangeExchange(ex)}
                    className={`rounded-md px-3 py-1.5 font-mono text-xs font-semibold transition-colors ${
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
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-[#263247] dark:bg-[#111827]">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Account &amp; Backend Connection
          </h2>

          <dl className="mt-5 space-y-4 text-sm">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 dark:border-[#263247]">
              <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Signed-in Account
              </dt>
              <dd className="font-mono text-xs font-semibold text-slate-900 dark:text-white">
                {userName ? `${userName} (${userEmail})` : userEmail}
              </dd>
            </div>

            <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 dark:border-[#263247]">
              <dt className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                <Server className="h-3.5 w-3.5" />
                Backend Base URL
              </dt>
              <dd className="font-mono text-xs text-slate-900 dark:text-white">
                {API_BASE_URL}
              </dd>
            </div>

            <div className="flex items-center justify-between gap-4">
              <dt className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5 text-[#16C784]" />
                JWT Storage
              </dt>
              <dd className="text-xs font-medium text-slate-700 dark:text-slate-300">
                In-memory Authorization Bearer
              </dd>
            </div>
          </dl>

          <button
            type="button"
            onClick={onLogout}
            className="mt-6 inline-flex items-center gap-2 rounded-lg border border-[#EA3943]/40 px-4 py-2 text-xs font-semibold text-[#EA3943] hover:bg-[#EA3943]/10"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out of Terminal
          </button>
        </section>
      </div>
    </div>
  );
}
