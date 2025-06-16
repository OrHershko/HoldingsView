from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date, datetime

class OHLCV(BaseModel):
    date: date
    open: float
    high: float
    low: float
    close: float
    volume: int

class TechnicalIndicators(BaseModel):
    sma_20: Optional[float] = Field(None, description="20-Day Simple Moving Average")
    sma_50: Optional[float] = Field(None, description="50-Day Simple Moving Average")
    sma_100: Optional[float] = Field(None, description="100-Day Simple Moving Average")
    sma_150: Optional[float] = Field(None, description="150-Day Simple Moving Average")
    sma_200: Optional[float] = Field(None, description="200-Day Simple Moving Average")
    rsi_14: Optional[float] = Field(None, description="14-Day Relative Strength Index")
    macd_line: Optional[float] = Field(None, description="MACD Line value")
    macd_signal: Optional[float] = Field(None, description="MACD Signal Line value")
    macd_histogram: Optional[float] = Field(None, description="MACD Histogram value")
    bollinger_upper: Optional[float] = Field(None, description="Upper Bollinger Band")
    bollinger_middle: Optional[float] = Field(None, description="Middle Bollinger Band (SMA 20)")
    bollinger_lower: Optional[float] = Field(None, description="Lower Bollinger Band")

class Fundamentals(BaseModel):
    # Core Info
    market_cap: Optional[int] = Field(None, description="Total market capitalization")
    sector: Optional[str] = Field(None, description="Company's sector")
    industry: Optional[str] = Field(None, description="Company's industry")
    description: Optional[str] = Field(None, description="Long business summary")
    
    # Valuation Metrics
    pe_ratio: Optional[float] = Field(None, description="Price-to-Earnings ratio (TTM)")
    forward_pe_ratio: Optional[float] = Field(None, description="Forward Price-to-Earnings ratio")
    price_to_book_ratio: Optional[float] = Field(None, description="Price-to-Book ratio")
    price_to_sales_ratio: Optional[float] = Field(None, description="Price-to-Sales ratio (TTM)")
    
    # Financial Health & Profitability
    eps: Optional[float] = Field(None, description="Earnings Per Share (TTM)")
    dividend_yield: Optional[float] = Field(None, description="Dividend yield")
    payout_ratio: Optional[float] = Field(None, description="Dividend payout ratio")
    beta: Optional[float] = Field(None, description="Beta (volatility vs. market)")
    profit_margins: Optional[float] = Field(None, description="Profit Margins")
    return_on_equity: Optional[float] = Field(None, description="Return on Equity")
    total_debt: Optional[int] = Field(None, description="Total Debt")
    total_cash: Optional[int] = Field(None, description="Total Cash")
    free_cashflow: Optional[int] = Field(None, description="Free Cashflow")
    
    # Trading Info
    week_52_high: Optional[float] = Field(None, description="52-week trading high")
    week_52_low: Optional[float] = Field(None, description="52-week trading low")
    earnings_date: Optional[datetime] = Field(None, description="Next earnings report date")
    
    # Analyst Ratings
    analyst_recommendation: Optional[str] = Field(None, description="Analyst consensus recommendation (e.g., 'buy', 'hold')")
    analyst_target_price: Optional[float] = Field(None, description="Analyst mean target price")
    number_of_analyst_opinions: Optional[int] = Field(None, description="Number of analyst opinions")

class NewsArticle(BaseModel):
    title: str
    publisher: str
    link: str
    provider_publish_time: datetime

class TradingInfo(BaseModel):
    """Real-time trading information."""
    market_state: Optional[str] = Field(None, description="Market state (e.g., PRE, REGULAR, POST)")
    regular_market_change_percent: Optional[float] = Field(None, description="Regular market day change in percent")
    pre_market_price: Optional[float] = Field(None, description="Pre-market price")
    pre_market_change_percent: Optional[float] = Field(None, description="Pre-market change in percent")
    post_market_price: Optional[float] = Field(None, description="Post-market price")
    post_market_change_percent: Optional[float] = Field(None, description="Post-market change in percent")

class EnrichedMarketData(BaseModel):
    """
    A comprehensive, aggregated view of market data for a single stock symbol.
    """
    symbol: str
    short_name: Optional[str] = None
    long_name: Optional[str] = None
    last_updated: datetime = Field(default_factory=datetime.utcnow)
    current_price: float
    
    historical_prices: List[OHLCV] = []
    technicals: TechnicalIndicators
    fundamentals: Fundamentals
    trading_info: TradingInfo = Field(default_factory=TradingInfo)
    news: List[NewsArticle] = []

    class Config:
        from_attributes = True