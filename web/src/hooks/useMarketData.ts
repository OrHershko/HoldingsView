import { useQuery } from '@tanstack/react-query';
import apiClient from '@/services/apiService';
import { EnrichedMarketData, TaskStatus } from '@/types/api';

const pollTask = async (
  taskId: string,
  retries = 20,
  interval = 3000,
): Promise<unknown> => {
  for (let i = 0; i < retries; i++) {
    await new Promise(resolve => setTimeout(resolve, interval));
    const { data: taskStatus } = await apiClient.get<TaskStatus>(`/tasks/${taskId}`);

    if (taskStatus.status === 'SUCCESS') {
      return taskStatus.result;
    }
    if (taskStatus.status === 'FAILURE') {
      const errorMessage = typeof taskStatus.result === 'string' ? taskStatus.result : 'Task failed to execute.';
      // Try to parse if it's a JSON string error
      try {
        const errorObj = JSON.parse(errorMessage);
        if (errorObj && errorObj.detail) {
            throw new Error(errorObj.detail);
        }
      } catch (e) {
        // Not a JSON string, throw original error
      }
      throw new Error(errorMessage);
    }
  }
  throw new Error('Task timed out waiting for market data.');
};

/**
 * Fetches enriched market data for a given stock symbol by triggering and polling a background task.
 */
export const useEnrichedMarketData = (
  symbol: string | null,
  period?: string | null,
  interval?: string | null,
) => {
  return useQuery<EnrichedMarketData, Error>({
    queryKey: ['marketData', symbol, period, interval],
    queryFn: async () => {
      if (!symbol) throw new Error("Symbol is required.");

      // 1. Trigger the task
      const { data: task } = await apiClient.post<TaskStatus>(
        `/market-data/${symbol}`,
        null, // no body payload
        {
          params: {
            period: period ?? undefined,
            interval: interval ?? undefined,
          },
        },
      );
      
      // 2. Poll for the result
      const result = await pollTask(task.task_id);

      return result as EnrichedMarketData;
    },
    enabled: !!symbol, // Only run the query if a symbol is provided
    staleTime: 5 * 60 * 1000, // Data is fresh for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus to avoid re-triggering tasks
  });
};