import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  Sun,
  User,
} from 'lucide-react';
import { ExchangeCode, NavPage, NotificationItem } from '../types/navigation';
import { formatDateOnly } from '../utils/formatters';

interface HeaderBarProps {
  onOpenMobileMenu: () => void;
  onGlobalSearch: (symbol: string) => void;
  knownSymbols: string[];
  exchange: ExchangeCode;
  onChangeExchange: (exchange: ExchangeCode) => void;
  marketDataDate?: string;
  notifications: NotificationItem[];
  onClearNotifications: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  userEmail?: string;
  userName?: string;
  onNavigate: (page: NavPage) => void;
  onLogout: () => void;
}

export function HeaderBar({
  onOpenMobileMenu,
  onGlobalSearch,
  knownSymbols,
  exchange,
  onChangeExchange,
  marketDataDate,
  notifications,
  onClearNotifications,
  theme,
  onToggleTheme,
  userEmail,
  userName,
  onNavigate,
  onLogout,
}: HeaderBarProps) {
  const [searchValue, setSearchValue] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (notifRef.current && !notifRef.current.contains(target)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(target)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSuggestions = knownSymbols
    .filter((sym) =>
      searchValue.trim()
        ? sym.includes(searchValue.trim().toUpperCase())
        : true
    )
    .slice(0, 6);

  const handleSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = searchValue.trim().toUpperCase();
    if (!clean) return;
    setSearchFocused(false);
    onGlobalSearch(clean);
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 dark:border-[#263247] dark:bg-[#111827] sm:px-5">
      {/* Left: Mobile drawer + Global Stock Search */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-[#263247] dark:text-slate-300 dark:hover:bg-[#162033] dark:hover:text-white lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div ref={searchRef} className="relative w-full max-w-sm">
          <form onSubmit={handleSubmitSearch}>
            <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchValue}
              onFocus={() => setSearchFocused(true)}
              onChange={(e) => setSearchValue(e.target.value.toUpperCase())}
              placeholder="Search ticker (e.g. RELIANCE, TCS)..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pr-3 pl-8 font-mono text-xs text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-[#16C784] focus:bg-white focus:outline-none dark:border-[#263247] dark:bg-[#0B1120] dark:text-white dark:placeholder:text-slate-500 dark:focus:border-[#16C784] dark:focus:bg-[#0B1120]"
            />
          </form>

          {searchFocused && filteredSuggestions.length > 0 && (
            <div className="absolute top-full right-0 left-0 z-40 mt-1.5 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-[#263247] dark:bg-[#111827]">
              <div className="border-b border-slate-100 px-3 py-1.5 text-[11px] font-medium text-slate-500 dark:border-[#263247] dark:text-slate-400">
                Holdings &amp; Watchlist Quick Jump
              </div>
              {filteredSuggestions.map((sym) => (
                <button
                  key={sym}
                  type="button"
                  onClick={() => {
                    setSearchValue(sym);
                    setSearchFocused(false);
                    onGlobalSearch(sym);
                  }}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-slate-50 dark:hover:bg-[#162033]"
                >
                  <span className="font-mono font-semibold text-slate-900 dark:text-white">
                    {sym}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {exchange} · Open Analysis
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Exchange, Market EOD Date, Notifications, Theme, Profile */}
      <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
        {/* NSE / BSE Exchange Switcher */}
        <div
          role="group"
          aria-label="Exchange context"
          className="hidden items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 dark:border-[#263247] dark:bg-[#0B1120] sm:flex"
        >
          {(['NSE', 'BSE'] as const).map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => onChangeExchange(ex)}
              className={`rounded-md px-2.5 py-1 font-mono text-[11px] font-semibold transition-colors whitespace-nowrap ${
                exchange === ex
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-[#162033] dark:text-white'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {ex}
            </button>
          ))}
        </div>

        {/* Market Data Date / EOD Status */}
        <div className="hidden xl:flex items-center gap-2 border-l border-slate-200 pl-4 text-xs text-slate-500 dark:border-[#263247] dark:text-slate-400 whitespace-nowrap">
          <span className="font-medium text-slate-700 dark:text-slate-300">
            TejHQ EOD
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">
            {marketDataDate ? formatDateOnly(marketDataDate) : 'Historical'}
          </span>
        </div>

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            type="button"
            onClick={() => {
              setNotifOpen((p) => !p);
              setProfileOpen(false);
            }}
            aria-label="Notifications"
            className="relative rounded-lg border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-[#263247] dark:text-slate-300 dark:hover:bg-[#162033] dark:hover:text-white"
          >
            <Bell className="h-4 w-4" />
            {notifications.length > 0 && (
              <span className="sr-only">{notifications.length} notifications</span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-[#263247] dark:bg-[#111827]">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-[#263247]">
                <span className="text-xs font-semibold text-slate-900 dark:text-white">
                  Session Activity ({notifications.length})
                </span>
                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearNotifications}
                    className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto dark:divide-[#263247]">
                {notifications.length === 0 ? (
                  <p className="px-4 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                    No session alerts or trade executions yet.
                  </p>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className="px-4 py-3">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">
                        {n.title}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                        {n.detail}
                      </p>
                      <p className="mt-1 font-mono text-[10px] text-slate-400 dark:text-slate-500">
                        {n.timestamp}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          className="rounded-lg border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-[#263247] dark:text-slate-300 dark:hover:bg-[#162033] dark:hover:text-white"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>

        {/* User Profile Menu */}
        <div ref={profileRef} className="relative">
          <button
            type="button"
            onClick={() => {
              setProfileOpen((p) => !p);
              setNotifOpen(false);
            }}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-800 transition-colors hover:bg-slate-100 dark:border-[#263247] dark:bg-[#0B1120] dark:text-slate-200 dark:hover:bg-[#162033]"
          >
            <User className="h-3.5 w-3.5 text-[#16C784]" />
            <span className="hidden max-w-[130px] truncate md:inline">
              {userName || userEmail || 'Account'}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-[#263247] dark:bg-[#111827]">
              <div className="border-b border-slate-100 px-4 py-3 dark:border-[#263247]">
                <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">
                  {userName || 'StockSense Trader'}
                </p>
                <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                  {userEmail}
                </p>
              </div>
              <div className="p-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    onNavigate('settings');
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-[#162033]"
                >
                  <Settings className="h-3.5 w-3.5" />
                  Terminal Settings
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    onLogout();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-[#EA3943] hover:bg-red-50 dark:hover:bg-[#EA3943]/10"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
