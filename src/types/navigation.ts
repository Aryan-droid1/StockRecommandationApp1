export type NavPage =
  | 'dashboard'
  | 'markets'
  | 'explorer'
  | 'analysis'
  | 'indicators'
  | 'recommendations'
  | 'trade'
  | 'portfolio'
  | 'holdings'
  | 'history'
  | 'watchlist'
  | 'settings';

export type ExchangeCode = 'NSE' | 'BSE';

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  detail: string;
  timestamp: string;
  type: 'trade' | 'system' | 'error';
}
