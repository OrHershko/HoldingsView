import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LightbulbIcon, RefreshCwIcon, AlertCircleIcon, TrendingUp, TrendingDown, Minus, ShieldCheck, ShieldAlert, Shield } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import apiClient from '@/services/apiService';
import { EnrichedMarketData, TaskStatus, TradingStrategy } from '@/types/api';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { LanguageOptionsProps } from './dashboard/StockDetailsView';

interface AITradingStrategyProps {
  stockData: EnrichedMarketData;
  LanguageOptions: React.FC<LanguageOptionsProps>;
}

const pollTask = async (taskId: string, retries = 20, interval = 3000): Promise<any> => {
  for (let i = 0; i < retries; i++) {
    await new Promise(resolve => setTimeout(resolve, interval));
    const { data: taskStatus } = await apiClient.get<TaskStatus>(`/tasks/${taskId}`);
    if (taskStatus.status === 'SUCCESS') {
      if(typeof taskStatus.result === 'object' && 'error' in taskStatus.result && taskStatus.result.error) throw new Error(taskStatus.result.error as string);
      return taskStatus.result;
    }
    if (taskStatus.status === 'FAILURE') throw new Error(typeof taskStatus.result === 'string' ? taskStatus.result : 'Task failed.');
  }
  throw new Error('Task timed out.');
};

const ConfidenceIcon = ({ confidence }: { confidence: 'high' | 'medium' | 'low' }) => {
    if (confidence === 'high') return <ShieldCheck className="h-5 w-5 text-green-400" />;
    if (confidence === 'medium') return <ShieldAlert className="h-5 w-5 text-yellow-400" />;
    return <Shield className="h-5 w-5 text-red-400" />;
};

const StrategyIcon = ({ type }: { type: 'bullish' | 'bearish' | 'neutral-range'}) => {
    if (type === 'bullish') return <TrendingUp className="h-5 w-5 text-green-400" />;
    if (type === 'bearish') return <TrendingDown className="h-5 w-5 text-red-400" />;
    return <Minus className="h-5 w-5 text-gray-400" />;
};

const AITradingStrategy: React.FC<AITradingStrategyProps> = ({ stockData, LanguageOptions }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [strategy, setStrategy] = useState<TradingStrategy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [language, setLanguage] = useState<string>('English');
  
  const fetchStrategy = async () => {
    setIsLoading(true);
    setError(null);
    setStrategy(null);

    try {
      const { data: task } = await apiClient.post<TaskStatus>(`/market-data/${stockData.symbol}/strategize`, { language: language });
      const result = await pollTask(task.task_id);
      setStrategy(result);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Failed to fetch AI strategy.');
      toast({
        title: 'Error',
        description: error.message || 'Could not generate strategy.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold flex items-center"><LightbulbIcon className="mr-2 h-6 w-6" />AI Trading Strategy</h2>
        <LanguageOptions language={language} setLanguage={setLanguage} />
        <Button onClick={fetchStrategy} disabled={isLoading} size="sm" className="min-w-[125px]">
          {isLoading ? <RefreshCwIcon className="h-4 w-4 animate-spin" /> : 'Generate Strategy'}
        </Button>
      </div>
      
      {isLoading && (
        <div className="space-y-3 mt-4">
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      )}
      
      {error && !isLoading && (
        <div className="text-red-400 flex items-center">
          <AlertCircleIcon className="h-5 w-5 mr-2" />
          <p>{error}</p>
        </div>
      )}

      {strategy && !isLoading && (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
                <Badge className={cn('capitalize', strategy.strategy_type === 'bullish' ? 'bg-green-600/20 text-green-300 border-green-500/50' : strategy.strategy_type === 'bearish' ? 'bg-red-600/20 text-red-300 border-red-500/50' : 'bg-gray-600/20 text-gray-300 border-gray-500/50')}>
                    <StrategyIcon type={strategy.strategy_type} />
                    <span className="ml-2">{strategy.strategy_type}</span>
                </Badge>
                <Badge variant="outline" className="capitalize">
                    <ConfidenceIcon confidence={strategy.confidence} />
                    <span className="ml-2">{strategy.confidence} Confidence</span>
                </Badge>
            </div>
          
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="bg-gray-700/50 p-3 rounded-lg">
                    <p className="text-sm text-gray-400">Entry</p>
                    <p className="text-lg font-mono">{strategy.entry_price_suggestion ? `$${strategy.entry_price_suggestion.toFixed(2)}` : 'N/A'}</p>
                </div>
                <div className="bg-gray-700/50 p-3 rounded-lg">
                    <p className="text-sm text-gray-400">Take Profit</p>
                    <p className="text-lg font-mono">{strategy.take_profit_suggestion ? `$${strategy.take_profit_suggestion.toFixed(2)}` : 'N/A'}</p>
                </div>
                <div className="bg-gray-700/50 p-3 rounded-lg">
                    <p className="text-sm text-gray-400">Stop Loss</p>
                    <p className="text-lg font-mono">{strategy.stop_loss_suggestion ? `$${strategy.stop_loss_suggestion.toFixed(2)}` : 'N/A'}</p>
                </div>
            </div>

            <div>
                <h4 className="font-semibold text-md mb-1">Rationale</h4>
                <div dir="rtl" className="text-right">
                    <p className={`text-sm text-gray-300 leading-relaxed ${language === 'Hebrew' ? 'rtl' : ''}`}>{strategy.rationale}</p>
                </div>
            </div>

        </div>
      )}
    </div>
  );
};

export default AITradingStrategy;