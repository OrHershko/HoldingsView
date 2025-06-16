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
  historical_prices: { date: string; open: number; high: number; low: number; close: number; volume: number }[];
  technicals: unknown; // Define further if needed
  fundamentals: unknown; // Define further if needed
  trading_info: unknown; // Define further if needed
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