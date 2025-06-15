from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime

class OHLCV(BaseModel):
    date: datetime
    open: float
    high: float
    low: float
    close: float
    volume: int

class TechnicalIndicators(BaseModel):
    sma_20: Optional[float] = Field(None, description="20-Day Simple Moving Average")
    sma_50: Optional[float] = Field(None, description="50-Day Simple Moving Average")
    sma_200: Optional[float] = Field(None, description="200-Day Simple Moving Average")
    rsi_14: Optional[float] = Field(None, description="14-Day Relative Strength Index")
    macd: Optional[Dict[str, float]] = Field(None, description="MACD line, signal line, and histogram")
    bollinger_bands: Optional[Dict[str, float]] = Field(None, description="Upper, middle, and lower bands")

class Fundamentals(BaseModel):
    market_cap: Optional[int] = None
    pe_ratio: Optional[float] = None
    eps: Optional[float] = None
    dividend_yield: Optional[float] = None
    beta: Optional[float] = None
    sector: Optional[str] = None
    industry: Optional[str] = None
    week_52_high: Optional[float] = None
    week_52_low: Optional[float] = None

class NewsArticle(BaseModel):
    title: str
    url: str
    published_date: datetime

class EnrichedMarketData(BaseModel):
    """
    A comprehensive, aggregated view of market data for a single stock symbol.
    """
    symbol: str
    last_updated: datetime
    current_price: float
    
    historical_prices: List[OHLCV] = []
    technicals: TechnicalIndicators
    fundamentals: Fundamentals
    news: List[NewsArticle] = []

    class Config:
        from_attributes = True