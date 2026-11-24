import { apiClient } from './client';

export interface AuthUser {
  id?: string | number;
  name?: string;
  username?: string;
  email: string;
  [key: string]: unknown;
}

export interface AuthResponse {
  token: string;
  user: AuthUser | null;
  raw: Record<string, unknown>;
}

export interface RegisterPayload {
  name?: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface WalletData {
  balance: number | null;
  initialBalance?: number | null;
  investedAmount?: number | null;
  currentHoldingsValue?: number | null;
  profitLoss?: number | null;
  totalPortfolioValue?: number | null;
  currency?: string;
  raw: Record<string, unknown>;
}

export interface PortfolioSummaryData {
  totalValue: number | null;
  cashBalance: number | null;
  investedValue: number | null;
  currentValue: number | null;
  totalPnl: number | null;
  totalPnlPercent: number | null;
  holdingsCount: number | null;
  currency?: string;
  priceSourceNote?: string;
  raw: Record<string, unknown>;
}

export interface HoldingItem {
  symbol: string;
  name?: string;
  quantity: number | null;
  avgPrice: number | null;
  currentPrice: number | null;
  investedValue: number | null;
  marketValue: number | null;
  unrealizedPnl: number | null;
  unrealizedPnlPercent: number | null;
  lastUpdated?: string;
  raw: Record<string, unknown>;
}

export interface TradeRecord {
  id?: string | number;
  symbol: string;
  side: string;
  quantity: number | null;
  price: number | null;
  totalAmount: number | null;
  status?: string;
  timestamp?: string;
  raw: Record<string, unknown>;
}

export interface TradeOrderPayload {
  symbol: string;
  quantity: number;
}

export interface TradeExecutionResult {
  message?: string;
  trade?: TradeRecord | null;
  raw: Record<string, unknown>;
}

export interface StockDirectoryItem {
  id?: string;
  symbol: string;
  companyName?: string;
  exchange?: string;
  instrumentKey?: string;
  logoUrl?: string;
  currentPrice: number | null;
  lastDayTradedPrice: number | null;
  priceDataDate?: string;
  priceSource?: string;
  priceUpdatedAt?: string;
  raw: Record<string, unknown>;
}

export interface IndicatorsResult {
  symbol: string;
  asOf?: string;
  closePrice: number | null;
  indicators: Record<string, unknown>;
  raw: Record<string, unknown>;
}

export type SignalType = 'BUY' | 'HOLD' | 'SELL' | string;

export interface RecommendationResult {
  symbol: string;
  companyName?: string;
  exchange?: string;
  currentPrice: number | null;
  signal: SignalType | null;
  score: number | null;
  maxScore?: number | null;
  ruleBased: boolean;
  tradeLevels: Record<string, unknown> | null;
  positionSize: number | string | Record<string, unknown> | null;
  indicators: Record<string, unknown> | null;
  reasons: string[];
  asOf?: string;
  raw: Record<string, unknown>;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function parseJsonIfString(payload: unknown): unknown {
  if (typeof payload !== 'string') {
    return payload;
  }
  const trimmed = payload.trim();
  if (!trimmed) {
    throw new Error('Backend returned an empty response.');
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    throw new Error('Backend returned a non-JSON response. Check API base URL or ngrok tunnel.');
  }
}

function unwrapEnvelope(payload: unknown): Record<string, unknown> {
  const parsed = parseJsonIfString(payload);
  const root = asRecord(parsed);
  if (root.data && typeof root.data === 'object' && !Array.isArray(root.data)) {
    return root.data as Record<string, unknown>;
  }
  return root;
}

function unwrapArray(
  payload: unknown,
  candidateKeys: string[],
  options: { requireArray?: boolean } = {}
): Record<string, unknown>[] {
  const parsed = parseJsonIfString(payload);
  if (Array.isArray(parsed)) {
    return parsed.map(asRecord);
  }
  const root = asRecord(parsed);
  for (const key of candidateKeys) {
    if (Array.isArray(root[key])) {
      return (root[key] as unknown[]).map(asRecord);
    }
  }
  if (root.data !== undefined && root.data !== null) {
    if (Array.isArray(root.data)) {
      return (root.data as unknown[]).map(asRecord);
    }
    const nested = asRecord(root.data);
    for (const key of candidateKeys) {
      if (Array.isArray(nested[key])) {
        return (nested[key] as unknown[]).map(asRecord);
      }
    }
  }
  if (options.requireArray) {
    throw new Error('Unexpected holdings response format from /api/holdings.');
  }
  return [];
}

function pickNumber(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === 'number' && Number.isFinite(val)) {
      return val;
    }
    if (typeof val === 'string' && val.trim() !== '') {
      const parsed = Number(val);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === 'string' && val.trim() !== '') {
      return val.trim();
    }
  }
  return undefined;
}

function parseResponsePayload(payload: unknown): Record<string, unknown> {
  if (typeof payload === 'string') {
    try {
      return asRecord(JSON.parse(payload));
    } catch {
      return {};
    }
  }
  return asRecord(payload);
}

function extractAuthResult(
  payload: unknown,
  fallbackEmail: string
): AuthResponse {
  const root = parseResponsePayload(payload);
  const nestedData = asRecord(root.data);

  if (root.success === false) {
    const errMsg =
      pickString(root, ['message', 'error']) ??
      'Authentication failed.';
    throw new Error(errMsg);
  }

  // Extract JWT from response.data.data.token (Axios envelope) or response.data.token (flat/fetch)
  const token =
    pickString(nestedData, ['token', 'accessToken', 'jwt']) ||
    pickString(root, ['token', 'accessToken', 'jwt']);

  if (!token) {
    throw new Error(
      'Authentication succeeded, but no JWT token was returned in response.data.data.token or response.data.token.'
    );
  }

  // Extract user from response.data.data.user or response.data.user
  const rawUser =
    Object.keys(asRecord(nestedData.user)).length > 0
      ? asRecord(nestedData.user)
      : asRecord(root.user);

  const email = pickString(rawUser, ['email']) ?? fallbackEmail;
  const user: AuthUser = {
    ...rawUser,
    email,
  };

  return {
    token,
    user,
    raw: root,
  };
}

export async function registerUser(payload: RegisterPayload): Promise<AuthResponse> {
  const res = await apiClient.post('/api/auth/register', payload);
  return extractAuthResult(res.data, payload.email);
}

export async function loginUser(payload: LoginPayload): Promise<AuthResponse> {
  const res = await apiClient.post('/api/auth/login', payload);
  return extractAuthResult(res.data, payload.email);
}

export async function getWallet(): Promise<WalletData> {
  const res = await apiClient.get('/api/wallet');
  const parsed = parseJsonIfString(res.data);
  const raw = asRecord(parsed);
  if (raw.success === false) {
    throw new Error(
      pickString(raw, ['message', 'error']) ?? 'Failed to load wallet.'
    );
  }
  const data = unwrapEnvelope(parsed);
  const walletNested = asRecord(data.wallet);
  const source = Object.keys(walletNested).length > 0 ? walletNested : data;

  return {
    balance: pickNumber(source, [
      'availableBalance',
      'balance',
      'cashBalance',
      'cash',
      'amount',
    ]),
    initialBalance: pickNumber(source, ['initialBalance', 'startingBalance']),
    investedAmount: pickNumber(source, ['investedAmount', 'totalInvested']),
    currentHoldingsValue: pickNumber(source, [
      'currentHoldingsValue',
      'holdingsValue',
      'totalCurrentValue',
    ]),
    profitLoss: pickNumber(source, ['profitLoss', 'totalPnl', 'pnl']),
    totalPortfolioValue: pickNumber(source, [
      'totalPortfolioValue',
      'portfolioValue',
      'totalValue',
    ]),
    currency: pickString(source, ['currency']),
    raw,
  };
}

export async function getPortfolioSummary(): Promise<PortfolioSummaryData> {
  const res = await apiClient.get('/api/portfolio/summary');
  const parsed = parseJsonIfString(res.data);
  const raw = asRecord(parsed);
  if (raw.success === false) {
    throw new Error(
      pickString(raw, ['message', 'error']) ??
        'Failed to load portfolio summary.'
    );
  }
  const data = unwrapEnvelope(parsed);
  const summaryNested = asRecord(data.summary ?? data.portfolio);
  const source = Object.keys(summaryNested).length > 0 ? summaryNested : data;

  const investedValue = pickNumber(source, [
    'investedValue',
    'totalInvested',
    'investedAmount',
    'costBasis',
  ]);
  const currentValue = pickNumber(source, [
    'totalCurrentValue',
    'currentHoldingsValue',
    'currentValue',
    'holdingsValue',
    'marketValue',
  ]);
  const totalPnl =
    pickNumber(source, [
      'totalPnl',
      'unrealizedPnl',
      'pnl',
      'profitLoss',
      'totalProfitLoss',
    ]) ??
    (currentValue !== null && investedValue !== null
      ? currentValue - investedValue
      : null);

  const totalPnlPercent =
    pickNumber(source, [
      'totalPnlPercent',
      'pnlPercent',
      'profitLossPercent',
      'returnPercent',
    ]) ??
    (totalPnl !== null && investedValue !== null
      ? investedValue > 0
        ? (totalPnl / investedValue) * 100
        : totalPnl === 0
          ? 0
          : null
      : null);

  const holdingsCount =
    pickNumber(source, ['holdingsCount', 'positionsCount', 'totalPositions']) ??
    (Array.isArray(source.holdings) ? source.holdings.length : null);

  return {
    totalValue: pickNumber(source, [
      'totalValue',
      'portfolioValue',
      'netWorth',
      'totalPortfolioValue',
    ]),
    cashBalance: pickNumber(source, [
      'availableBalance',
      'cashBalance',
      'walletBalance',
      'cash',
      'balance',
    ]),
    investedValue,
    currentValue,
    totalPnl,
    totalPnlPercent,
    holdingsCount,
    currency: pickString(source, ['currency']),
    priceSourceNote: pickString(source, ['priceSource', 'dataSource', 'note']),
    raw,
  };
}

export async function getHoldings(): Promise<HoldingItem[]> {
  const res = await apiClient.get('/api/holdings');
  const parsed = parseJsonIfString(res.data);
  const raw = asRecord(parsed);
  if (raw.success === false) {
    throw new Error(
      pickString(raw, ['message', 'error']) ?? 'Failed to load holdings.'
    );
  }
  const items = unwrapArray(
    parsed,
    ['data', 'holdings', 'positions', 'items'],
    { requireArray: true }
  );

  return items.map((item) => {
    const stockObj = asRecord(item.stock);
    const symbol = (
      pickString(item, ['symbol', 'ticker', 'stockSymbol']) ??
      pickString(stockObj, ['symbol', 'ticker']) ??
      'UNKNOWN'
    ).toUpperCase();
    const name =
      pickString(item, ['name', 'companyName']) ??
      pickString(stockObj, ['companyName', 'name']);
    const quantity = pickNumber(item, ['quantity', 'shares', 'qty']);
    const avgPrice = pickNumber(item, [
      'avgPrice',
      'averagePrice',
      'avgBuyPrice',
      'averageBuyPrice',
      'buyPrice',
    ]);
    const currentPrice =
      pickNumber(item, [
        'currentPrice',
        'eodPrice',
        'closePrice',
        'lastPrice',
        'price',
      ]) ??
      pickNumber(stockObj, [
        'currentPrice',
        'eodPrice',
        'closePrice',
        'lastPrice',
        'price',
      ]);

    const investedValue =
      pickNumber(item, [
        'investedValue',
        'investedAmount',
        'costBasis',
        'totalCost',
        'totalInvested',
      ]) ?? (quantity !== null && avgPrice !== null ? quantity * avgPrice : null);

    const marketValue =
      pickNumber(item, ['marketValue', 'currentValue', 'value']) ??
      (quantity !== null && currentPrice !== null ? quantity * currentPrice : null);

    const unrealizedPnl =
      pickNumber(item, [
        'unrealizedPnl',
        'pnl',
        'profitLoss',
        'unrealizedProfitLoss',
      ]) ??
      (marketValue !== null && investedValue !== null
        ? marketValue - investedValue
        : null);

    const unrealizedPnlPercent =
      pickNumber(item, [
        'unrealizedPnlPercent',
        'pnlPercent',
        'profitLossPercent',
        'returnPercent',
      ]) ??
      (unrealizedPnl !== null && investedValue !== null && investedValue > 0
        ? (unrealizedPnl / investedValue) * 100
        : null);

    const lastUpdated =
      pickString(item, [
        'asOf',
        'priceDate',
        'priceDataDate',
        'updatedAt',
        'date',
      ]) ?? pickString(stockObj, ['priceDataDate', 'asOf', 'updatedAt']);

    return {
      symbol,
      name,
      quantity,
      avgPrice,
      currentPrice,
      investedValue,
      marketValue,
      unrealizedPnl,
      unrealizedPnlPercent,
      lastUpdated,
      raw: item,
    };
  });
}

export async function getTradeHistory(): Promise<TradeRecord[]> {
  const res = await apiClient.get('/api/trades/history');
  const items = unwrapArray(res.data, ['trades', 'history', 'orders', 'items']);

  return items.map((item) => ({
    id:
      typeof item.id === 'string' || typeof item.id === 'number'
        ? item.id
        : typeof item._id === 'string'
          ? item._id
          : undefined,
    symbol: pickString(item, ['symbol', 'ticker', 'stockSymbol']) ?? 'UNKNOWN',
    side: (pickString(item, ['side', 'type', 'action', 'tradeType']) ?? 'UNKNOWN').toUpperCase(),
    quantity: pickNumber(item, ['quantity', 'shares', 'qty']),
    price: pickNumber(item, ['price', 'executionPrice', 'executedPrice', 'unitPrice']),
    totalAmount: pickNumber(item, ['totalAmount', 'total', 'amount', 'value']),
    status: pickString(item, ['status']),
    timestamp: pickString(item, ['createdAt', 'executedAt', 'timestamp', 'date']),
    raw: item,
  }));
}

export async function buyStock(payload: TradeOrderPayload): Promise<TradeExecutionResult> {
  const res = await apiClient.post('/api/trades/buy', {
    symbol: payload.symbol.trim().toUpperCase(),
    quantity: payload.quantity,
  });
  const raw = asRecord(res.data);
  const data = unwrapEnvelope(res.data);
  const tradeRaw = asRecord(data.trade ?? raw.trade);
  return {
    message: pickString(raw, ['message']) ?? pickString(data, ['message']),
    trade:
      Object.keys(tradeRaw).length > 0
        ? {
            symbol:
              pickString(tradeRaw, ['symbol', 'ticker']) ?? payload.symbol.trim().toUpperCase(),
            side: (pickString(tradeRaw, ['side', 'type', 'action']) ?? 'BUY').toUpperCase(),
            quantity: pickNumber(tradeRaw, ['quantity', 'shares', 'qty']) ?? payload.quantity,
            price: pickNumber(tradeRaw, ['price', 'executionPrice', 'unitPrice']),
            totalAmount: pickNumber(tradeRaw, ['totalAmount', 'total', 'amount']),
            timestamp: pickString(tradeRaw, ['createdAt', 'executedAt', 'timestamp']),
            raw: tradeRaw,
          }
        : null,
    raw,
  };
}

export async function sellStock(payload: TradeOrderPayload): Promise<TradeExecutionResult> {
  const res = await apiClient.post('/api/trades/sell', {
    symbol: payload.symbol.trim().toUpperCase(),
    quantity: payload.quantity,
  });
  const raw = asRecord(res.data);
  const data = unwrapEnvelope(res.data);
  const tradeRaw = asRecord(data.trade ?? raw.trade);
  return {
    message: pickString(raw, ['message']) ?? pickString(data, ['message']),
    trade:
      Object.keys(tradeRaw).length > 0
        ? {
            symbol:
              pickString(tradeRaw, ['symbol', 'ticker']) ?? payload.symbol.trim().toUpperCase(),
            side: (pickString(tradeRaw, ['side', 'type', 'action']) ?? 'SELL').toUpperCase(),
            quantity: pickNumber(tradeRaw, ['quantity', 'shares', 'qty']) ?? payload.quantity,
            price: pickNumber(tradeRaw, ['price', 'executionPrice', 'unitPrice']),
            totalAmount: pickNumber(tradeRaw, ['totalAmount', 'total', 'amount']),
            timestamp: pickString(tradeRaw, ['createdAt', 'executedAt', 'timestamp']),
            raw: tradeRaw,
          }
        : null,
    raw,
  };
}

export async function getAllStocks(): Promise<StockDirectoryItem[]> {
  const res = await apiClient.get('/api/stocks');
  const items = unwrapArray(res.data, ['data', 'stocks', 'items']);

  return items.map((item) => ({
    id: pickString(item, ['_id', 'id']),
    symbol: (pickString(item, ['symbol', 'ticker']) ?? 'UNKNOWN').toUpperCase(),
    companyName: pickString(item, ['companyName', 'name']),
    exchange: pickString(item, ['exchange']),
    instrumentKey: pickString(item, ['instrumentKey']),
    logoUrl: pickString(item, ['logo', 'logoUrl', 'logo_url', 'image', 'imageUrl', 'icon']),
    currentPrice: pickNumber(item, ['currentPrice', 'close', 'eodPrice', 'price']),
    lastDayTradedPrice: pickNumber(item, ['lastDayTradedPrice', 'previousClose', 'prevClose']),
    priceDataDate: pickString(item, ['priceDataDate', 'date', 'asOf']),
    priceSource: pickString(item, ['priceSource', 'source']),
    priceUpdatedAt: pickString(item, ['priceUpdatedAt', 'updatedAt']),
    raw: item,
  }));
}

export async function getIndicators(symbol: string): Promise<IndicatorsResult> {
  const cleanSymbol = encodeURIComponent(symbol.trim().toUpperCase());
  const res = await apiClient.get(`/api/indicators/${cleanSymbol}`);
  const raw = asRecord(res.data);
  const data = unwrapEnvelope(res.data);
  const nestedIndicators = asRecord(data.indicators);
  const indicators =
    Object.keys(nestedIndicators).length > 0 ? nestedIndicators : data;

  return {
    symbol: pickString(data, ['symbol', 'ticker']) ?? symbol.trim().toUpperCase(),
    asOf: pickString(data, ['asOf', 'date', 'priceDate', 'updatedAt']),
    closePrice: pickNumber(data, ['close', 'currentPrice', 'eodPrice', 'price']),
    indicators,
    raw,
  };
}

export async function getRecommendations(
  symbol: string,
  exchange = 'NSE'
): Promise<RecommendationResult> {
  const cleanSymbol = encodeURIComponent(symbol.trim().toUpperCase());
  const cleanExchange = (exchange || 'NSE').trim().toUpperCase();
  const res = await apiClient.get(`/api/recommendations/${cleanSymbol}`, {
    params: { exchange: cleanExchange },
  });
  const raw = asRecord(res.data);

  if (raw.success === false) {
    const errMsg =
      pickString(raw, ['message', 'error']) ??
      'Failed to load recommendation.';
    throw new Error(errMsg);
  }

  const data = unwrapEnvelope(res.data);

  // Only treat nested ruleBased or recommendation as a sub-object when it is actually a plain object (not a string like "BUY")
  const nestedRuleBased = asRecord(data.ruleBased);
  const nestedRecommendation =
    data.recommendation &&
    typeof data.recommendation === 'object' &&
    !Array.isArray(data.recommendation)
      ? asRecord(data.recommendation)
      : {};

  const ruleSection =
    Object.keys(nestedRuleBased).length > 0
      ? nestedRuleBased
      : Object.keys(nestedRecommendation).length > 0
        ? nestedRecommendation
        : data;

  const signalRaw =
    pickString(ruleSection, [
      'recommendation',
      'signal',
      'action',
      'verdict',
      'rating',
    ]) ??
    pickString(data, [
      'recommendation',
      'signal',
      'action',
      'verdict',
      'rating',
    ]);
  const signal = signalRaw ? signalRaw.toUpperCase() : null;

  const score =
    pickNumber(ruleSection, ['score', 'totalScore', 'ruleScore', 'points']) ??
    pickNumber(data, ['score', 'totalScore', 'ruleScore', 'points']);
  const maxScore =
    pickNumber(ruleSection, ['maxScore', 'outOf', 'scale']) ??
    pickNumber(data, ['maxScore', 'outOf', 'scale']);

  const currentPrice =
    pickNumber(data, ['currentPrice', 'close', 'eodPrice', 'price']) ??
    pickNumber(ruleSection, ['currentPrice', 'close', 'eodPrice', 'price']);

  const rawLevels =
    ruleSection.tradeLevels ??
    ruleSection.levels ??
    data.tradeLevels ??
    data.levels;

  const levelsCandidate = asRecord(rawLevels);

  // Capture flat level keys only if tradeLevels was not explicitly returned as null
  const flatLevels: Record<string, unknown> = {};
  if (rawLevels !== null) {
    const levelKeyCandidates = [
      'entry',
      'entryPrice',
      'stopLoss',
      'stop_loss',
      'target',
      'targetPrice',
      'takeProfit',
      'take_profit',
      'support',
      'resistance',
      'riskReward',
      'riskRewardRatio',
      'risk_reward',
    ];
    for (const key of levelKeyCandidates) {
      if (ruleSection[key] !== undefined && ruleSection[key] !== null) {
        flatLevels[key] = ruleSection[key];
      }
    }
  }

  const tradeLevels =
    Object.keys(levelsCandidate).length > 0
      ? levelsCandidate
      : Object.keys(flatLevels).length > 0
        ? flatLevels
        : null;

  const rawPositionSize =
    ruleSection.positionSize ??
    ruleSection.position_size ??
    data.positionSize ??
    data.position_size ??
    levelsCandidate.positionSize ??
    levelsCandidate.position_size;

  const positionSize =
    typeof rawPositionSize === 'number' || typeof rawPositionSize === 'string'
      ? rawPositionSize
      : rawPositionSize &&
          typeof rawPositionSize === 'object' &&
          !Array.isArray(rawPositionSize)
        ? (rawPositionSize as Record<string, unknown>)
        : null;

  const rawIndicators = ruleSection.indicators ?? data.indicators;
  const indicatorsObj = asRecord(rawIndicators);
  const indicators = Object.keys(indicatorsObj).length > 0 ? indicatorsObj : null;

  const reasonsSource =
    ruleSection.signals ??
    ruleSection.reasons ??
    ruleSection.breakdown ??
    ruleSection.explanation ??
    data.signals ??
    data.reasons;

  const reasons: string[] = [];
  if (Array.isArray(reasonsSource)) {
    for (const entry of reasonsSource) {
      if (typeof entry === 'string' && entry.trim() !== '') {
        reasons.push(entry.trim());
      } else if (entry && typeof entry === 'object') {
        const rec = asRecord(entry);
        const text =
          pickString(rec, ['reason', 'description', 'message', 'rule', 'label']) ??
          JSON.stringify(rec);
        reasons.push(text);
      }
    }
  } else if (typeof reasonsSource === 'string' && reasonsSource.trim() !== '') {
    reasons.push(reasonsSource.trim());
  }

  return {
    symbol: pickString(data, ['symbol', 'ticker']) ?? symbol.trim().toUpperCase(),
    companyName: pickString(data, ['companyName', 'name']),
    exchange: pickString(data, ['exchange']) ?? cleanExchange,
    currentPrice,
    signal,
    score,
    maxScore,
    ruleBased: true,
    tradeLevels,
    positionSize,
    indicators,
    reasons,
    asOf: pickString(data, ['date', 'asOf', 'priceDate', 'updatedAt']),
    raw,
  };
}

export interface OhlcvCandle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  rawDate?: string;
}

export interface MarketHistoryParams {
  exchange?: string;
  from?: string;
  to?: string;
}

export interface MarketHistoryResult {
  symbol: string;
  exchange: string;
  count: number;
  candles: OhlcvCandle[];
  raw: Record<string, unknown>;
}

function normalizeCandleDate(rawDate: string | undefined): string | null {
  if (!rawDate) return null;
  const isoDateMatch = rawDate.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoDateMatch) {
    return isoDateMatch[1];
  }
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  const yyyy = parsed.getUTCFullYear();
  const mm = String(parsed.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(parsed.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export async function getMarketHistory(
  symbol: string,
  params: MarketHistoryParams = {}
): Promise<MarketHistoryResult> {
  const cleanSymbol = symbol.trim().toUpperCase();
  const exchange = (params.exchange || 'NSE').trim().toUpperCase();
  const queryParams: Record<string, string> = { exchange };
  if (params.from) queryParams.from = params.from;
  if (params.to) queryParams.to = params.to;

  const res = await apiClient.get(
    `/api/market/history/${encodeURIComponent(cleanSymbol)}`,
    { params: queryParams }
  );

  const raw = asRecord(res.data);
  if (raw.success === false) {
    const errMsg =
      pickString(raw, ['message', 'error']) ??
      'Failed to load historical market data.';
    throw new Error(errMsg);
  }

  const items = unwrapArray(res.data, ['data', 'candles', 'history', 'prices']);
  const byTime = new Map<string, OhlcvCandle>();

  for (const item of items) {
    const rawDate = pickString(item, ['date', 'timestamp', 'time']);
    const time = normalizeCandleDate(rawDate);
    if (!time) continue;

    const open = pickNumber(item, ['open', 'o']);
    const high = pickNumber(item, ['high', 'h']);
    const low = pickNumber(item, ['low', 'l']);
    const close = pickNumber(item, ['close', 'c']);
    const volume = pickNumber(item, ['volume', 'vol', 'v']) ?? 0;

    if (open === null || high === null || low === null || close === null) {
      continue;
    }

    byTime.set(time, {
      time,
      open,
      high,
      low,
      close,
      volume,
      rawDate,
    });
  }

  const candles = Array.from(byTime.values()).sort((a, b) =>
    a.time.localeCompare(b.time)
  );

  return {
    symbol: cleanSymbol,
    exchange,
    count: candles.length,
    candles,
    raw,
  };
}
