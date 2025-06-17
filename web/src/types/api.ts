// Matches api/schemas/transaction.py -> TransactionRead
export interface TransactionRead {
  id: number;
  portfolio_id: number;
  created_at: string;
  symbol: string;
  transaction_type: "BUY" | "SELL";
  quantity: number;
  price: number;
  transaction_date: string; // YYYY-MM-DD
}

// Matches api/schemas/portfolio.py -> CalculatedHolding
export interface EnrichedHolding {
  symbol: string;
  quantity: number;
  average_cost_basis: number;
  total_cost_basis: number;
  current_price: number | null;
  market_value: number | null;
  unrealized_gain_loss: number | null;
  unrealized_gain_loss_percent: number | null;
  todays_change: number | null;
  todays_change_percent: number | null;
}

// Matches api/schemas/portfolio.py -> PortfolioReadWithHoldings
export interface Portfolio {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  holdings: EnrichedHolding[];
  transactions: TransactionRead[];
  total_market_value: number | null;
  total_cost_basis: number | null;
  total_unrealized_gain_loss: number | null;
  total_unrealized_gain_loss_percent: number | null;
}

// Matches api/schemas/portfolio.py -> PortfolioRead
export interface PortfolioRead {
  id: number;
  name: string;
  description: string | null;
}

// Matches api/schemas/transaction.py -> TransactionCreate
export interface TransactionCreate {
  symbol: string;
  transaction_type: "BUY" | "SELL";
  quantity: number;
  price: number;
  transaction_date: string; // YYYY-MM-DD
}

// Matches api/schemas/task.py -> TaskStatus
export interface TaskStatus {
    task_id: string;
    status: "PENDING" | "SUCCESS" | "FAILURE";
    result?: unknown;
}

// Matches api/schemas/market_data.py -> EnrichedMarketData
export interface EnrichedMarketData {
  symbol: string;
  short_name?: string;
  long_name?: string;
  current_price: number;
  historical_prices: OHLCV[];
  technicals: TechnicalIndicators;
  fundamentals: Fundamentals;
  trading_info: TradingInfo;
  news: { title: string; publisher: string; link: string; provider_publish_time: string }[];
}

// Matches api/schemas/ai.py -> AnalysisResult and TradingStrategy
export interface AnalysisResult {
    content: string;
}
export interface TradingStrategy {
    strategy_type: "bullish" | "bearish" | "neutral-range";
    confidence: "high" | "medium" | "low";
    entry_price_suggestion?: number;
    stop_loss_suggestion?: number;
    take_profit_suggestion?: number;
    rationale: string;
}

// Matches api/schemas/market_data.py -> TechnicalIndicators
export interface TechnicalIndicators {
    sma_20: number | null;
    sma_50: number | null;
    sma_100: number | null;
    sma_150: number | null;
    sma_200: number | null;
    rsi_14: number | null;
}

// Matches api/schemas/market_data.py -> Fundamentals
export interface Fundamentals {
    market_cap: number | null;
    sector: string | null;
    industry: string | null;
    description: string | null;
}

// Matches api/schemas/market_data.py -> TradingInfo
export interface TradingInfo {
    market_state: string | null;
    regular_market_change_percent: number | null;
    pre_market_price: number | null;
    pre_market_change_percent: number | null;
    post_market_price: number | null;
    post_market_change_percent: number | null;
}

// Matches api/schemas/market_data.py -> OHLCV
export interface OHLCV {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  sma_20?: number | null;
  sma_50?: number | null;
  sma_100?: number | null;
  sma_150?: number | null;
  sma_200?: number | null;
  rsi_14?: number | null;
}