import React, { useState } from 'react';
import { useEnrichedMarketData } from '@/hooks/useMarketData';
import { Skeleton } from '@/components/ui/skeleton';
import StockChart from '@/components/StockChart';
import AIStockAnalysis from '@/components/AIStockAnalysis';
import { AlertTriangle, ServerCrash } from 'lucide-react';
import { EnrichedMarketData, TransactionRead } from '@/types/api';
import TransactionHistory from '@/components/TransactionHistory';
import AITradingStrategy from '@/components/AITradingStrategy';

interface StockDetailsViewProps {
  symbol: string | null;
  transactions: TransactionRead[];
  portfolioId: number | undefined;
}

const StockDetailsView: React.FC<StockDetailsViewProps> = ({ symbol, transactions, portfolioId }) => {
  const [period, setPeriod] = useState<string>('1y');
  const [interval, setInterval] = useState<string>('1d');
  const { data: stockData, isLoading, error } = useEnrichedMarketData(symbol, period, interval);

  if (!symbol) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 p-4">
        <ServerCrash className="h-12 w-12 mb-4" />
        <h3 className="text-lg font-semibold text-white">Select a Holding</h3>
        <p className="max-w-xs">Choose a stock from your holdings list to see its chart and detailed analysis.</p>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center text-red-500 p-4">
        <AlertTriangle className="h-12 w-12 mb-4" />
        <h3 className="text-lg font-semibold">Error Loading Data</h3>
        <p className="max-w-sm">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StockChart
        stockData={stockData as EnrichedMarketData}
        period={period}
        interval={interval}
        onPeriodChange={setPeriod}
        onIntervalChange={setInterval}
      />
      <AIStockAnalysis stockData={stockData as EnrichedMarketData} />
      <AITradingStrategy stockData={stockData as EnrichedMarketData} />
      <TransactionHistory transactions={transactions} portfolioId={portfolioId} />
    </div>
  );
};

const LoadingSkeleton: React.FC = () => (
  <div className="space-y-6 p-1">
    {/* Chart Skeleton */}
    <div className="space-y-3">
      <Skeleton className="h-8 w-3/4 bg-gray-700" />
      <Skeleton className="h-[450px] w-full bg-gray-700" />
    </div>
    {/* Analysis Skeleton */}
    <div className="space-y-3">
      <Skeleton className="h-8 w-1/2 bg-gray-700" />
      <Skeleton className="h-4 w-full bg-gray-700" />
      <Skeleton className="h-4 w-full bg-gray-700" />
      <Skeleton className="h-4 w-5/6 bg-gray-700" />
    </div>
  </div>
);

export default StockDetailsView;