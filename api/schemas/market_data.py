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
    market_cap: Optional[int] = Field(None, description="Total market capitalization")
    pe_ratio: Optional[float] = Field(None, description="Price-to-Earnings ratio (TTM)")
    eps: Optional[float] = Field(None, description="Earnings Per Share (TTM)")
    dividend_yield: Optional[float] = Field(None, description="Dividend yield")
    beta: Optional[float] = Field(None, description="Beta (volatility vs. market)")
    sector: Optional[str] = Field(None, description="Company's sector")
    industry: Optional[str] = Field(None, description="Company's industry")
    week_52_high: Optional[float] = Field(None, description="52-week trading high")
    week_52_low: Optional[float] = Field(None, description="52-week trading low")
    description: Optional[str] = Field(None, description="Long business summary")

class NewsArticle(BaseModel):
    title: str
    publisher: str
    link: str
    provider_publish_time: datetime

class EnrichedMarketData(BaseModel):
    """
    A comprehensive, aggregated view of market data for a single stock symbol.
    """
    symbol: str
    last_updated: datetime = Field(default_factory=datetime.utcnow)
    current_price: float
    
    historical_prices: List[OHLCV] = []
    technicals: TechnicalIndicators
    fundamentals: Fundamentals
    news: List[NewsArticle] = []

    class Config:
        from_attributes = True