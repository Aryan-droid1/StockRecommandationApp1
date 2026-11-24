import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getErrorMessage } from './api/client';
import {
  getHoldings,
  getPortfolioSummary,
  getTradeHistory,
  getWallet,
  HoldingItem,
  PortfolioSummaryData,
  TradeExecutionResult,
  TradeRecord,
  WalletData,
} from './api/stocksense';
import { AnalysisView } from './components/AnalysisView';
import { AuthPanel } from './components/AuthPanel';
import { DashboardView } from './components/DashboardView';
import { ExplorerView } from './components/ExplorerView';
import { HeaderBar } from './components/HeaderBar';
import { HistoryView } from './components/HistoryView';
import { IndicatorsView } from './components/IndicatorsView';
import { MarketsView } from './components/MarketsView';
import { PortfolioView } from './components/PortfolioView';
import { RecommendationsView } from './components/RecommendationsView';
import { SettingsView } from './components/SettingsView';
import { Sidebar } from './components/Sidebar';
import { ToastContainer } from './components/ToastContainer';
import { TradeView } from './components/TradeView';
import { WatchlistView } from './components/WatchlistView';
import { AuthProvider, useAuth } from './context/AuthContext';
import {
  ExchangeCode,
  NavPage,
  NotificationItem,
  ToastItem,
} from './types/navigation';

function StockSenseShell() {
  const { isAuthenticated, user, logout } = useAuth();

  const [activePage, setActivePage] = useState<NavPage>('dashboard');
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [tradeSide, setTradeSide] = useState<'BUY' | 'SELL'>('BUY');

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [exchange, setExchange] = useState<ExchangeCode>('NSE');

  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioSummaryData | null>(null);
  const [holdings, setHoldings] = useState<HoldingItem[]>([]);
  const [trades, setTrades] = useState<TradeRecord[]>([]);

  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [portfolioAccountError, setPortfolioAccountError] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const accountRequestIdRef = useRef(0);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const pushToast = useCallback(
    (type: ToastItem['type'], title: string, message?: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, type, title, message }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    },
    []
  );

  const pushNotification = useCallback(
    (type: NotificationItem['type'], title: string, detail: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const timestamp = new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      });
      setNotifications((prev) => [{ id, type, title, detail, timestamp }, ...prev].slice(0, 20));
    },
    []
  );

  const loadAccountData = useCallback(async () => {
    if (!isAuthenticated) return;
    const reqId = ++accountRequestIdRef.current;
    setAccountLoading(true);
    setAccountError(null);
    setPortfolioAccountError(null);

    const [walletRes, portfolioRes, holdingsRes] = await Promise.allSettled([
      getWallet(),
      getPortfolioSummary(),
      getHoldings(),
    ]);

    if (reqId !== accountRequestIdRef.current) {
      return;
    }

    const allErrors: string[] = [];
    const walletHoldingsErrors: string[] = [];

    if (walletRes.status === 'fulfilled') {
      setWallet(walletRes.value);
    } else {
      setWallet(null);
      const msg = `Wallet: ${getErrorMessage(walletRes.reason)}`;
      allErrors.push(msg);
      walletHoldingsErrors.push(msg);
    }

    if (portfolioRes.status === 'fulfilled') {
      setPortfolio(portfolioRes.value);
    } else {
      setPortfolio(null);
      allErrors.push(`Portfolio: ${getErrorMessage(portfolioRes.reason)}`);
    }

    if (holdingsRes.status === 'fulfilled') {
      setHoldings(holdingsRes.value);
      setSelectedSymbol((prev) => prev || holdingsRes.value[0]?.symbol || '');
    } else {
      setHoldings([]);
      const msg = `Holdings: ${getErrorMessage(holdingsRes.reason)}`;
      allErrors.push(msg);
      walletHoldingsErrors.push(msg);
    }

    if (allErrors.length > 0) {
      setAccountError(allErrors.join(' | '));
    }
    if (walletHoldingsErrors.length > 0) {
      setPortfolioAccountError(walletHoldingsErrors.join(' | '));
    }
    setAccountLoading(false);
  }, [isAuthenticated]);

  const loadTradeHistory = useCallback(async () => {
    if (!isAuthenticated) return;
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const records = await getTradeHistory();
      setTrades(records);
    } catch (err) {
      setHistoryError(getErrorMessage(err));
    } finally {
      setHistoryLoading(false);
    }
  }, [isAuthenticated]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadAccountData(), loadTradeHistory()]);
  }, [loadAccountData, loadTradeHistory]);

  useEffect(() => {
    if (isAuthenticated) {
      void refreshAll();
    } else {
      accountRequestIdRef.current += 1;
      setWallet(null);
      setPortfolio(null);
      setHoldings([]);
      setTrades([]);
      setAccountError(null);
      setPortfolioAccountError(null);
      setHistoryError(null);
    }
  }, [isAuthenticated, refreshAll]);

  const handleInspectSymbol = (symbol: string) => {
    setSelectedSymbol(symbol.trim().toUpperCase());
    setActivePage('analysis');
  };

  const handleOpenIndicators = (symbol: string) => {
    setSelectedSymbol(symbol.trim().toUpperCase());
    setActivePage('indicators');
  };

  const handleRecommendSymbol = (symbol: string) => {
    setSelectedSymbol(symbol.trim().toUpperCase());
    setActivePage('recommendations');
  };

  const handleTradeSymbol = (symbol: string, side: 'BUY' | 'SELL' = 'BUY') => {
    setSelectedSymbol(symbol.trim().toUpperCase());
    setTradeSide(side);
    setActivePage('trade');
  };

  const handleAddWatchlist = (symbol: string) => {
    const clean = symbol.trim().toUpperCase();
    if (!clean) return;
    setWatchlist((prev) => {
      if (prev.includes(clean)) return prev;
      pushToast('info', 'Added to Watchlist', `${clean} added to your ${exchange} watchlist.`);
      return [clean, ...prev];
    });
  };

  const handleRemoveWatchlist = (symbol: string) => {
    const clean = symbol.trim().toUpperCase();
    setWatchlist((prev) => prev.filter((s) => s !== clean));
    pushToast('info', 'Removed from Watchlist', `${clean} removed.`);
  };

  const handleToggleWatchlist = (symbol: string) => {
    const clean = symbol.trim().toUpperCase();
    if (watchlist.includes(clean)) {
      handleRemoveWatchlist(clean);
    } else {
      handleAddWatchlist(clean);
    }
  };

  const handleTradeSuccess = async (
    result: TradeExecutionResult,
    side: 'BUY' | 'SELL',
    symbol: string
  ) => {
    const msg = result.message ?? `Paper ${side} order executed for ${symbol}.`;
    pushToast('success', `${side} Executed · ${symbol}`, msg);
    pushNotification('trade', `${side} Order · ${symbol}`, msg);
    await refreshAll();
  };

  const knownSymbols = Array.from(
    new Set([
      ...holdings.map((h) => h.symbol.toUpperCase()),
      ...watchlist.map((w) => w.toUpperCase()),
    ])
  );

  const marketDataDate = holdings.find((h) => h.lastUpdated)?.lastUpdated;
  const currency = portfolio?.currency ?? wallet?.currency ?? 'INR';

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#080E1B] text-[#F1F5F9]">
        <AuthPanel />
        <ToastContainer
          toasts={toasts}
          onDismiss={(id) => setToasts((p) => p.filter((t) => t.id !== id))}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0B1120] dark:text-slate-100">
      <Sidebar
        activePage={activePage}
        onSelectPage={setActivePage}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <HeaderBar
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onGlobalSearch={handleInspectSymbol}
          knownSymbols={knownSymbols}
          exchange={exchange}
          onChangeExchange={setExchange}
          marketDataDate={marketDataDate}
          notifications={notifications}
          onClearNotifications={() => setNotifications([])}
          theme={theme}
          onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          userEmail={user?.email}
          userName={user?.name}
          onNavigate={setActivePage}
          onLogout={logout}
        />

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-4 sm:px-5 lg:py-5">
          {activePage === 'dashboard' && (
            <DashboardView
              userName={user?.name}
              userEmail={user?.email}
              exchange={exchange}
              wallet={wallet}
              portfolio={portfolio}
              holdings={holdings}
              trades={trades}
              watchlist={watchlist}
              loading={accountLoading}
              error={accountError}
              onRefresh={() => void refreshAll()}
              onNavigate={setActivePage}
              onInspectSymbol={handleInspectSymbol}
              onRecommendSymbol={handleRecommendSymbol}
              onTradeSymbol={handleTradeSymbol}
            />
          )}

          {activePage === 'markets' && (
            <MarketsView
              exchange={exchange}
              onChangeExchange={setExchange}
              currency={currency}
              marketDataDate={marketDataDate}
              holdings={holdings}
              watchlist={watchlist}
              onInspectSymbol={handleInspectSymbol}
              onOpenIndicators={handleOpenIndicators}
              onRecommendSymbol={handleRecommendSymbol}
            />
          )}

          {activePage === 'explorer' && (
            <ExplorerView
              exchange={exchange}
              currency={currency}
              holdings={holdings}
              watchlist={watchlist}
              onToggleWatchlist={handleToggleWatchlist}
              onInspectSymbol={handleInspectSymbol}
              onRecommendSymbol={handleRecommendSymbol}
              onTradeSymbol={(sym) => handleTradeSymbol(sym, 'BUY')}
            />
          )}

          {activePage === 'analysis' && (
            <AnalysisView
              selectedSymbol={selectedSymbol}
              exchange={exchange}
              currency={currency}
              onSymbolChange={setSelectedSymbol}
              holdings={holdings}
              watchlist={watchlist}
              onToggleWatchlist={handleToggleWatchlist}
              onTradeSymbol={(sym) => handleTradeSymbol(sym, 'BUY')}
              onOpenRecommendations={handleRecommendSymbol}
            />
          )}

          {activePage === 'indicators' && (
            <IndicatorsView
              selectedSymbol={selectedSymbol}
              currency={currency}
              onSymbolChange={setSelectedSymbol}
              holdings={holdings}
              watchlist={watchlist}
            />
          )}

          {activePage === 'recommendations' && (
            <RecommendationsView
              selectedSymbol={selectedSymbol}
              exchange={exchange}
              currency={currency}
              onSymbolChange={setSelectedSymbol}
              holdings={holdings}
              onTradeSymbol={handleTradeSymbol}
            />
          )}

          {activePage === 'trade' && (
            <TradeView
              initialSymbol={selectedSymbol}
              initialSide={tradeSide}
              exchange={exchange}
              wallet={wallet}
              holdings={holdings}
              watchlist={watchlist}
              onTradeSuccess={handleTradeSuccess}
            />
          )}

          {(activePage === 'portfolio' || activePage === 'holdings') && (
            <PortfolioView
              mode={activePage}
              wallet={wallet}
              portfolio={portfolio}
              holdings={holdings}
              loading={accountLoading}
              error={portfolioAccountError}
              onRefresh={() => void refreshAll()}
              onInspectSymbol={handleInspectSymbol}
              onSellSuccess={(result, sym) => handleTradeSuccess(result, 'SELL', sym)}
            />
          )}

          {activePage === 'history' && (
            <HistoryView
              trades={trades}
              currency={currency}
              loading={historyLoading}
              error={historyError}
              onRefresh={() => void loadTradeHistory()}
              onInspectSymbol={handleInspectSymbol}
            />
          )}

          {activePage === 'watchlist' && (
            <WatchlistView
              exchange={exchange}
              currency={currency}
              watchlist={watchlist}
              holdings={holdings}
              onAddSymbol={handleAddWatchlist}
              onRemoveSymbol={handleRemoveWatchlist}
              onInspectSymbol={handleInspectSymbol}
              onRecommendSymbol={handleRecommendSymbol}
              onTradeSymbol={(sym) => handleTradeSymbol(sym, 'BUY')}
            />
          )}

          {activePage === 'settings' && (
            <SettingsView
              userEmail={user?.email}
              userName={user?.name}
              theme={theme}
              onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              exchange={exchange}
              onChangeExchange={setExchange}
              onLogout={logout}
            />
          )}
        </main>
      </div>

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((p) => p.filter((t) => t.id !== id))}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <StockSenseShell />
    </AuthProvider>
  );
}
