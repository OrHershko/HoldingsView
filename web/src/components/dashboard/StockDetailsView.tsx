import React, { useEffect, useState } from 'react';
import { useEnrichedMarketData } from '@/hooks/useMarketData';
import { Skeleton } from '@/components/ui/skeleton';
import StockChart from '@/components/StockChart';
import AdvancedStockData from '@/components/AdvancedStockData';
import AIStockAnalysis from '@/components/AIStockAnalysis';
import { AlertTriangle, ServerCrash } from 'lucide-react';
import { EnrichedMarketData, TransactionRead } from '@/types/api';
import TransactionHistory from '@/components/TransactionHistory';
import AITradingStrategy from '@/components/AITradingStrategy';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


interface StockDetailsViewProps {
  symbol: string | null;
  transactions: TransactionRead[];
  portfolioId: number | undefined;
  containerWidth: number;
}

export interface LanguageOptionsProps {
  language: string;
  setLanguage: (language: string) => void;
}

const StockDetailsView: React.FC<StockDetailsViewProps> = ({ symbol, transactions, portfolioId, containerWidth }) => {
  const [period, setPeriod] = useState<string>('1y');
  const [interval, setInterval] = useState<string>('1d');
  const { data: stockData, isLoading, error } = useEnrichedMarketData(symbol, period, interval);

  useEffect(() => {
    if (symbol) {
      setPeriod('1y');
      setInterval('1d');
    }
  }, [symbol]);

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

  const LanguageOptions: React.FC<LanguageOptionsProps> = ({language, setLanguage}) => {
    
    return (
      <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger id="language-select" name="language" className="w-24 h-10 ml-auto mr-2">
            <SelectValue placeholder="Select Language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="English">English</SelectItem>
            <SelectItem value="Hebrew">Hebrew</SelectItem>
          </SelectContent>
      </Select>
    );
  };


  return (
    <div className="space-y-6 flex-1 min-w-0 overflow-x-hidden">
      <StockChart
        stockData={stockData as EnrichedMarketData}
        symbol={symbol}
        period={period}
        interval={interval}
        onPeriodChange={setPeriod}
        onIntervalChange={setInterval}
        containerWidth = {containerWidth}
      />
      {stockData.fundamentals?.quote_type !== 'FUTURE' && (
        <>
          <AdvancedStockData stockData={stockData as EnrichedMarketData} />
          <AIStockAnalysis stockData={stockData as EnrichedMarketData} LanguageOptions={LanguageOptions} />
          <AITradingStrategy stockData={stockData as EnrichedMarketData} LanguageOptions={LanguageOptions} />
          <TransactionHistory transactions={transactions} portfolioId={portfolioId} />
        </>
      )}
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
    {/* Advanced Data Skeleton */}
    <div className="space-y-3">
      <Skeleton className="h-8 w-1/2 bg-gray-700" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-32 w-full bg-gray-700" />
        <Skeleton className="h-32 w-full bg-gray-700" />
        <Skeleton className="h-32 w-full bg-gray-700" />
        <Skeleton className="h-32 w-full bg-gray-700" />
      </div>
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