export type TransactionType = "BUY" | "SELL";

// Matches api/schemas/transaction.py -> TransactionRead
export interface TransactionRead {
  id: number;
  portfolio_id: number;
  created_at: string;
  updated_at: string;
  // Increased max length to 21 for OCC option symbols
  symbol: string; // up to 21 chars
  transaction_type: TransactionType;
  quantity: number;
  price: number;
  transaction_date: string; // YYYY-MM-DD
  // --- Option-specific fields ---
  is_option: boolean;
  option_type?: string;
  strike_price?: number;
  expiration_date?: string;
  // Increased max length to 21 for OCC option symbols
  underlying_symbol?: string; // up to 21 chars
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
  is_option: boolean;
  option_type?: string;
  strike_price?: number;
  expiration_date?: string;
  underlying_symbol?: string;
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
  transaction_type: TransactionType;
  quantity: number;
  price: number;
  transaction_date: string;
  portfolio_id: number;
  // Option-specific fields
  is_option: boolean;
  option_type?: string;
  strike_price?: number;
  expiration_date?: string;
  underlying_symbol?: string;
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
    macd_line: number | null;
    macd_signal: number | null;
    macd_histogram: number | null;
    bollinger_upper: number | null;
    bollinger_middle: number | null;
    bollinger_lower: number | null;
}

// Matches api/schemas/market_data.py -> Fundamentals
export interface Fundamentals {
    // Core Info
    market_cap: number | null;
    sector: string | null;
    industry: string | null;
    description: string | null;
    
    // Valuation Metrics
    pe_ratio: number | null;
    forward_pe_ratio: number | null;
    price_to_book_ratio: number | null;
    price_to_sales_ratio: number | null;
    
    // Financial Health & Profitability
    eps: number | null;
    dividend_yield: number | null;
    payout_ratio: number | null;
    beta: number | null;
    profit_margins: number | null;
    return_on_equity: number | null;
    total_debt: number | null;
    total_cash: number | null;
    free_cashflow: number | null;
    
    // Trading Info
    week_52_high: number | null;
    week_52_low: number | null;
    earnings_date: string | null;
    
    // Analyst Ratings
    analyst_recommendation: string | null;
    analyst_target_price: number | null;
    number_of_analyst_opinions: number | null;
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

// Matches api/schemas/market_data.py -> SymbolSearchResult
export interface SymbolSearchResult {
  symbol: string;
  shortname?: string;
  longname?: string;
  exchDisp?: string;
  typeDisp?: string;
  quoteType?: string;
}

export interface OptionContract {
  contractSymbol: string;
  strike: number;
  lastPrice: number;
  bid: number;
  ask: number;
  change: number;
  percentChange: number;
  volume?: number;
  openInterest?: number;
  impliedVolatility: number;
  inTheMoney: boolean;
}

export interface OptionChain {
  calls: OptionContract[];
  puts: OptionContract[];
}

export interface WatchlistItem {
  id: number;
  symbol: string;
  user_id: number;
  name: string;
}