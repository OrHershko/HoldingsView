import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import LightweightStockChart from './charts/LightweightStockChart';
import { EnrichedMarketData } from '@/types/api';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuRadioGroup, DropdownMenuRadioItem } from './ui/dropdown-menu';
import { SlidersHorizontal, CalendarRange, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { UTCTimestamp } from 'lightweight-charts';
import type { ChartDataPoint } from '@/components/charts/LightweightStockChart';

interface StockChartProps {
  stockData: EnrichedMarketData;
  symbol: string;
  period: string;
  interval: string;
  onPeriodChange: (newPeriod: string) => void;
  onIntervalChange: (newInterval: string) => void;
  containerWidth: number;
}

const periods = [
  { value: '1d', label: '1D' },
  { value: '5d', label: '5D' },
  { value: '1mo', label: '1M' },
  { value: '3mo', label: '3M' },
  { value: '6mo', label: '6M' },
  { value: 'ytd', label: 'YTD' },
  { value: '1y', label: '1Y' },
  { value: '2y', label: '2Y' },
  { value: '5y', label: '5Y' },
  { value: '10y', label: '10Y' },
  { value: 'max', label: 'Max' },
];

const intervals = [
  { value: '1m', label: '1m' },
  { value: '2m', label: '2m' },
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '30m', label: '30m' },
  { value: '60m', label: '60m' },
  { value: '90m', label: '90m' },
  { value: '1h', label: '1h' },
  { value: '1d', label: '1D' },
  { value: '5d', label: '5D' },
  { value: '1wk', label: '1W' },
  { value: '1mo', label: '1M' },
  { value: '3mo', label: '3M' },
];

const indicators = [
  { key: 'sma_20', label: 'SMA 20' },
  { key: 'sma_50', label: 'SMA 50' },
  { key: 'sma_100', label: 'SMA 100' },
  { key: 'sma_150', label: 'SMA 150' },
  { key: 'sma_200', label: 'SMA 200' },
  { key: 'rsi_14', label: 'RSI' },
];

const StockChart: React.FC<StockChartProps> = ({ stockData, symbol, period, interval, onPeriodChange, onIntervalChange, containerWidth }) => {
  const isPositive = (stockData.trading_info?.regular_market_change_percent || 0) >= 0;
  
  const isIntradayInterval = (interval: string) => {
    return ['1m', '2m', '5m', '15m', '30m', '60m', '90m', '1h'].includes(interval);
  };
  
  const isLongPeriod = (period: string) => {
    return ['ytd', '1y', '2y', '5y', '10y', 'max'].includes(period);
  };
  
  const isDailyPlusInterval = (intervalValue: string) => !isIntradayInterval(intervalValue);

  const isShorterIntervalThanPeriod = (intervalValue: string, periodValue: string) => {
    const periodToDays = (period: string): number => {
      switch (period) {
        case '1d': return 1;
        case '5d': return 5;
        case '1mo': return 30;
        case '3mo': return 90;
        case '6mo': return 180;
        case 'ytd': return 365;
        case '1y': return 365;
        case '2y': return 730;
        case '5y': return 1825;
        case '10y': return 3650;
        case 'max': return 36500;
        default: return 365;
      }
    };

    const intervalToDays = (interval: string): number => {
      switch (interval) {
        case '1m': return 1/1440; // 1 minute in days
        case '2m': return 2/1440;
        case '5m': return 5/1440;
        case '15m': return 15/1440;
        case '30m': return 30/1440;
        case '60m': return 60/1440;
        case '90m': return 90/1440;
        case '1h': return 1/24; // 1 hour in days
        case '1d': return 1;
        case '5d': return 5;
        case '1wk': return 7;
        case '1mo': return 30;
        case '3mo': return 90;
        default: return 1;
      }
    };

    const periodDays = periodToDays(periodValue);
    const intervalDays = intervalToDays(intervalValue);
    
    // Interval should be significantly shorter than period
    return intervalDays >= (periodDays * 0.8); // If interval is 80% or more of period, it's too long
  };

  // Calculate percentage change for the selected period
  const calculatePeriodChange = () => {
    const rawPrices = Array.isArray(stockData.historical_prices)
      ? stockData.historical_prices
      : [];

    if (rawPrices.length < 2) return null;

    const sortedPrices = [...rawPrices].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Calculate the exact start date based on the selected period
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case '1d':
        startDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000); // 1 day ago
        break;
      case '5d':
        startDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
        break;
      case '1mo':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1); // 1 month ago
        break;
      case '3mo':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 3); // 3 months ago
        break;
      case '6mo':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 6); // 6 months ago
        break;
      case 'ytd':
        startDate = new Date(now.getFullYear(), 0, 1); // January 1st of current year
        break;
      case '1y':
        startDate = new Date(now);
        startDate.setFullYear(startDate.getFullYear() - 1); // 1 year ago
        break;
      case '2y':
        startDate = new Date(now);
        startDate.setFullYear(startDate.getFullYear() - 2); // 2 years ago
        break;
      case '5y':
        startDate = new Date(now);
        startDate.setFullYear(startDate.getFullYear() - 5); // 5 years ago
        break;
      case '10y':
        startDate = new Date(now);
        startDate.setFullYear(startDate.getFullYear() - 10); // 10 years ago
        break;
      case 'max':
        // For max, use the earliest available data
        startDate = new Date(sortedPrices[0]?.date);
        break;
      default:
        startDate = new Date(now);
        startDate.setFullYear(startDate.getFullYear() - 1); // Default to 1 year
    }

    // Find the price closest to the calculated start date
    const findClosestPrice = (targetDate: Date) => {
      let closestPrice = null;
      let minDiff = Infinity;

      for (const priceData of sortedPrices) {
        const priceDate = new Date(priceData.date);
        const diff = Math.abs(priceDate.getTime() - targetDate.getTime());
        
        if (diff < minDiff) {
          minDiff = diff;
          closestPrice = priceData;
        }
      }
      
      return closestPrice;
    };

    const startPriceData = findClosestPrice(startDate);
    const endPriceData = sortedPrices[sortedPrices.length - 1]; // Most recent price

    if (!startPriceData || !endPriceData || !startPriceData.close || !endPriceData.close) {
      return null;
    }

    const startPrice = startPriceData.close;
    const endPrice = endPriceData.close;
    const changePercent = ((endPrice - startPrice) / startPrice) * 100;

    return {
      percent: changePercent,
      isPositive: changePercent >= 0,
      formatted: `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`,
      startDate: startPriceData.date,
      endDate: endPriceData.date
    };
  };

  const periodChange = calculatePeriodChange();

  // Get valid intervals for current period
  const getValidIntervals = (currentPeriod: string) => {
    if (isLongPeriod(currentPeriod)) {
      // For long periods, only allow daily+ intervals
      return intervals.filter(i => !isIntradayInterval(i.value));
    }
    else {
      return intervals.filter(i => !isShorterIntervalThanPeriod(i.value, currentPeriod));
    }
  };

  const validIntervals = getValidIntervals(period);
  
  const handlePeriodChange = (newPeriod: string) => {
    if (isLongPeriod(newPeriod) && isIntradayInterval(interval)) {
        onIntervalChange('1d');
    } else if (!isLongPeriod(newPeriod) && isDailyPlusInterval(interval)) {
        onIntervalChange('1h');
    }
    setVisibleIndicators(prev => ({
      ...prev,
      sma_20: false,
      sma_50: false,
      sma_100: false,
      sma_150: false,
      sma_200: false,
    }));
    
    onPeriodChange(newPeriod);
  };
  
  const handleIntervalChange = (newInterval: string) => {
    if (isIntradayInterval(newInterval) && isLongPeriod(period)) {
        onPeriodChange('3mo');
    } else if (isDailyPlusInterval(newInterval) && !isLongPeriod(period)) {
        onPeriodChange('5y');
    }
    setVisibleIndicators(prev => ({
      ...prev,
      sma_20: false,
      sma_50: false,
      sma_100: false,
      sma_150: false,
      sma_200: false,
    }));
    
    onIntervalChange(newInterval);
  };
  
  const [visibleIndicators, setVisibleIndicators] = useState({
    sma_20: false,
    sma_50: false,
    sma_100: false,
    sma_150: false,
    sma_200: false,
    rsi_14: true,    // Default to true
  });

  const handleIndicatorToggle = (indicatorKey: string) => {
    setVisibleIndicators(prev => ({
      ...prev,
      [indicatorKey]: !prev[indicatorKey],
    }));
  };

  const chartData = useMemo(() => {
    const rawPrices = Array.isArray(stockData.historical_prices)
      ? stockData.historical_prices
      : ([] as typeof stockData.historical_prices);

    if (rawPrices.length === 0) {
      return [] as ChartDataPoint[];
    }

    // Sort data by date to ensure chronological order
    const sortedPrices = [...rawPrices].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    // Use backend-provided indicators if they exist; otherwise compute locally
    const hasBackendIndicators = sortedPrices.some(p => p.sma_20 !== undefined && p.sma_20 !== null);

    if (hasBackendIndicators) {
      return sortedPrices.map(item => ({
        ...item,
        time: (new Date(item.date).getTime() / 1000) as UTCTimestamp,
      })) as unknown as ChartDataPoint[];
    }

    // --- Fallback: calculate indicators on the fly ---
    const closes = sortedPrices.map(p => p.close);

    const calcSMA = (len: number) =>
      closes.map((_, idx) => {
        if (idx + 1 < len) return null;
        const slice = closes.slice(idx - len + 1, idx + 1);
        const avg = slice.reduce((a, b) => a + b, 0) / len;
        return Number(avg.toFixed(2));
      });

    const sma20 = calcSMA(20);
    const sma50 = calcSMA(50);
    const sma100 = calcSMA(100);
    const sma150 = calcSMA(150);
    const sma200 = calcSMA(200);

    // Simple RSI (14-period) implementation
    const rsi14: (number | null)[] = [];
    let gainSum = 0;
    let lossSum = 0;
    for (let i = 1; i < closes.length; i++) {
      const change = closes[i] - closes[i - 1];
      const gain = Math.max(change, 0);
      const loss = Math.max(-change, 0);

      if (i <= 14) {
        gainSum += gain;
        lossSum += loss;
        rsi14.push(null);
        continue;
      }

      if (i === 15) {
        gainSum /= 14;
        lossSum /= 14;
      } else {
        gainSum = (gainSum * 13 + gain) / 14;
        lossSum = (lossSum * 13 + loss) / 14;
      }

      const rs = lossSum === 0 ? 100 : gainSum / lossSum;
      rsi14.push(Number((100 - 100 / (1 + rs)).toFixed(2)));
    }

    while (rsi14.length < closes.length) rsi14.unshift(null);

    return sortedPrices.map((item, idx) => ({
      ...item,
      time: (new Date(item.date).getTime() / 1000) as UTCTimestamp,
      sma_20: sma20[idx],
      sma_50: sma50[idx],
      sma_100: sma100[idx],
      sma_150: sma150[idx],
      sma_200: sma200[idx],
      rsi_14: rsi14[idx],
    })) as unknown as ChartDataPoint[];
  }, [interval, symbol]); 

  return (
    <Card className="bg-gray-800 border-gray-700 text-white min-w-[300px]">
      <CardHeader>
        <div className="flex justify-between ">
          <div className="flex flex-col items-start gap-1">
            <CardTitle className="text-2xl">{stockData.symbol}</CardTitle>
            <p className="text-sm text-gray-400">{stockData.short_name || stockData.long_name}</p>
            <p className="text-sm text-gray-400">{stockData.fundamentals?.quote_type}</p>
          </div>
          
          {/* Three-column price layout*/}
          <div className={`hidden items-center md:grid gap-4 ${stockData.trading_info?.market_state && stockData.trading_info.market_state !== 'REGULAR' ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {/* Column 1: Current Price & Daily Change */}
            <div className="flex flex-col items-start gap-1">
              <p className="text-sm text-gray-400">Current Price</p>
              <p className="text-lg ">${stockData.current_price?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p className="text-sm text-gray-400">Today's Change</p>
              <p className={`text-lg ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                {isPositive ? <TrendingUp className="h-4 w-4 inline-block mr-1" /> : <TrendingDown className="h-4 w-4 inline-block mr-1" />}
                {stockData.trading_info?.regular_market_change_percent?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
              </p>
            </div>

            {/* Column 2: Pre/After Market Hours */}
            {stockData.trading_info?.market_state && stockData.trading_info.market_state !== 'REGULAR' && (
              <div className="flex flex-col items-start gap-1">
                <p className="text-sm text-gray-400">Extended Hours</p>
                {stockData.trading_info?.market_state && stockData.trading_info.market_state !== 'REGULAR' ? (
                  <>
                    {/* Pre-market */}
                    {stockData.trading_info.pre_market_price && (
                      <div className="text-lg">
                        <div className="text-white">${stockData.trading_info.pre_market_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        {stockData.trading_info.pre_market_change_percent && (
                          <div className={`${stockData.trading_info.pre_market_change_percent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            <p className="text-sm text-gray-400 mt-0.5 mb-0.5">Pre-Market Change</p>
                            {stockData.trading_info.pre_market_change_percent >= 0 ? <TrendingUp className="h-4 w-4 inline-block mr-1" /> : <TrendingDown className="h-4 w-4 inline-block mr-1" />}
                            {stockData.trading_info.pre_market_change_percent >= 0 ? '+' : ''}{stockData.trading_info.pre_market_change_percent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Post-market */}
                    {stockData.trading_info.post_market_price && (
                      <div className="text-lg flex flex-col items-start gap-1 text-left">
                        <div className="text-white">${stockData.trading_info.post_market_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        {stockData.trading_info.post_market_change_percent && (
                          <div className={`${stockData.trading_info.post_market_change_percent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            <p className="text-sm text-gray-400 mt-0.5 mb-0.5">After Hours Change</p>
                            {stockData.trading_info.post_market_change_percent >= 0 ? <TrendingUp className="h-4 w-4 inline-block mr-1" /> : <TrendingDown className="h-4 w-4 inline-block mr-1" />}
                            {stockData.trading_info.post_market_change_percent >= 0 ? '+' : ''}{stockData.trading_info.post_market_change_percent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-xs text-gray-500">Regular Hours</div>
                )}
              </div>
            )}  

            {/* Column 3: Period Change */}
            <div className="flex flex-col items-start gap-1 text-left ml-2">
              <p className="text-sm text-gray-400">Period Change ({periods.find(p => p.value === period)?.label})</p>
              {periodChange && (
                <div className={`flex items-center gap-1 px-2 py-1 rounded text-sm font-medium ${
                  periodChange.isPositive ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                }`}>
                  {periodChange.isPositive ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  <span>{periodChange.formatted}</span>
                </div>
              )}
              {/* Market State Indicator */}
              <div className=" text-lg mt-0.5">
                <p className="text-sm text-gray-400">Market State</p>
                    {stockData.trading_info.market_state === 'PRE' && 'Pre-Market'}
                    {stockData.trading_info.market_state === 'POST' && 'After Hours'}
                    {stockData.trading_info.market_state === 'CLOSED' && 'Closed'}
                    {stockData.trading_info.market_state === 'REGULAR' && 'Regular Hours'}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <LightweightStockChart
          data={chartData}
          visibleIndicators={visibleIndicators}
          timeframe={period}
          containerWidth={containerWidth}
        />
        <div className="flex flex-col gap-3 pt-4 mt-2 border-t border-gray-700 text-xs">
          {/* Mobile: Stack all controls vertically */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 sm:items-center sm:justify-between">
            {/* Period and Interval Controls */}
            <div className="flex gap-2 sm:gap-3 flex-1">
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full xs:w-auto xs:min-w-[100px] justify-start">
                      <CalendarRange className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span className="truncate">Period: {periods.find(p => p.value === period)?.label}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuRadioGroup value={period} onValueChange={handlePeriodChange}>
                      {periods.map(p => (
                        <DropdownMenuRadioItem key={p.value} value={p.value}>
                          {p.label}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full xs:w-auto xs:min-w-[100px] justify-start">
                    <Clock className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Interval: {intervals.find(i => i.value === interval)?.label}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuRadioGroup value={interval} onValueChange={handleIntervalChange}>
                    {intervals.map(i => (
                      <DropdownMenuRadioItem key={i.value} value={i.value} disabled={!validIntervals.find(vi => vi.value === i.value)}>
                        {i.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Indicators Control */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto sm:min-w-[120px] justify-start">
                  <SlidersHorizontal className="mr-2 h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Indicators</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Price Overlays</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {indicators.filter(ind => ind.key.startsWith('sma_')).map(ind => (
                  <DropdownMenuCheckboxItem
                    key={ind.key}
                    checked={visibleIndicators[ind.key as keyof typeof visibleIndicators]}
                    onCheckedChange={() => handleIndicatorToggle(ind.key)}
                  >
                    {ind.label}
                  </DropdownMenuCheckboxItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Separate Indicators</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {indicators.filter(ind => !ind.key.startsWith('sma_')).map(ind => (
                  <DropdownMenuCheckboxItem
                    key={ind.key}
                    checked={visibleIndicators[ind.key as keyof typeof visibleIndicators]}
                    onCheckedChange={() => handleIndicatorToggle(ind.key)}
                  >
                    {ind.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StockChart;