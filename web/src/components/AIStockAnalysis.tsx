import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BrainCircuitIcon, RefreshCwIcon, AlertCircleIcon } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import apiClient from '@/services/apiService';
import { EnrichedMarketData, TaskStatus } from '@/types/api';
import { LanguageOptionsProps } from './dashboard/StockDetailsView';

interface AIStockAnalysisProps {
  stockData: EnrichedMarketData;
  LanguageOptions: React.FC<LanguageOptionsProps>;
}

const pollTask = async (taskId: string, retries = 20, interval = 3000): Promise<any> => {
  for (let i = 0; i < retries; i++) {
    await new Promise(resolve => setTimeout(resolve, interval));
    const { data: taskStatus } = await apiClient.get<TaskStatus>(`/tasks/${taskId}`);
    if (taskStatus.status === 'SUCCESS') return taskStatus.result;
    if (taskStatus.status === 'FAILURE') throw new Error(typeof taskStatus.result === 'string' ? taskStatus.result : 'Task failed.');
  }
  throw new Error('Task timed out.');
};

const AIStockAnalysis: React.FC<AIStockAnalysisProps> = ({ stockData, LanguageOptions }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [language, setLanguage] = useState<string>('English');
  
  const fetchAnalysis = async () => {
    setIsLoading(true);
    setError(null);
    setAnalysis('');

    try {
      const { data: task } = await apiClient.post<TaskStatus>(`/market-data/${stockData.symbol}/analyze`, { language: language });
      const result = await pollTask(task.task_id);
      setAnalysis(result.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch AI analysis.');
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Could not generate analysis.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formattedContent = analysis.split('\n').map((line, index) => {
    if (line.startsWith('###')) {
      return <h3 key={index} className="text-xl font-semibold mt-4 mb-2">{line.replace('###', '').trim()}</h3>;
    }
    if (line.startsWith('-')) {
      return <li key={index} className="ml-4 list-disc">{line.substring(1).trim()}</li>;
    }
    return <p key={index} className="mb-2">{line}</p>;
  });


  return (
    <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold flex items-center"><BrainCircuitIcon className="mr-2 h-6 w-6 min-w-[4px]" />AI Analysis</h2>
         <LanguageOptions language={language} setLanguage={setLanguage} />
        <Button onClick={fetchAnalysis} disabled={isLoading} size="sm" className="min-w-[125px]">
          {isLoading ? <RefreshCwIcon className="h-4 w-4 animate-spin" /> : 'Generate Analysis'}
        </Button>
      </div>
      
      {isLoading && (
        <div className="space-y-3 mt-4">
          <Skeleton className="h-4 w-3/4 bg-gray-500" />
          <Skeleton className="h-4 w-full bg-gray-500" />
          <Skeleton className="h-4 w-full bg-gray-500" />
          <Skeleton className="h-4 w-5/6 bg-gray-500" />
        </div>
      )}
      
      {error && !isLoading && (
        <div className="text-red-400 flex items-center">
          <AlertCircleIcon className="h-5 w-5 mr-2" />
          <p>{error}</p>
        </div>
      )}

      {analysis && !isLoading && (
        <div dir={language === 'Hebrew' ? 'rtl' : 'ltr'} className={`${language === 'Hebrew' ? 'text-right' : 'text-left'}`}>
          <div className={`prose prose-invert prose-sm max-w-none ${language === 'Hebrew' ? 'rtl' : ''}`}>{formattedContent}</div>
        </div>
      )}
    </div>
  );
};

export default AIStockAnalysis;