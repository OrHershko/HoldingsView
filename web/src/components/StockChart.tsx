import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import LightweightStockChart from './charts/LightweightStockChart';
import { EnrichedMarketData } from '@/types/api';

interface StockChartProps {
  stockData: EnrichedMarketData;
}

const StockChart: React.FC<StockChartProps> = ({ stockData }) => {
  const isPositive = (stockData.trading_info.regular_market_change_percent || 0) >= 0;

  const chartData = useMemo(() => {
    return stockData.historical_prices.map(item => ({
      ...item,
      time: new Date(item.date).getTime() / 1000,
    }));
  }, [stockData.historical_prices]);

  return (
    <Card className="bg-gray-800 border-gray-700 text-white">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl">{stockData.short_name || stockData.symbol}</CardTitle>
          <div className="text-right">
            <p className="text-2xl font-bold">${stockData.current_price.toFixed(2)}</p>
            <p className={`text-sm ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
              {(stockData.trading_info.regular_market_change_percent * 100).toFixed(2)}%
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <LightweightStockChart data={chartData} />
      </CardContent>
    </Card>
  );
};

export default StockChart;