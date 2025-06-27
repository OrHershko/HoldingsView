import { useQuery } from '@tanstack/react-query';
import apiClient from '@/services/apiService';
import { EnrichedMarketData, TaskStatus, OptionChain } from '@/types/api';
import { useState, useEffect } from 'react';
import { searchStocks } from '@/services/apiService';

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
  period: string | null = null,
  interval: string | null = null,
) => {
  return useQuery<EnrichedMarketData, Error>({
    queryKey: ['marketData', symbol, interval],
    queryFn: async () => {
      if (!symbol) throw new Error("Symbol is required.");

      // 1. Trigger the task
      const { data: task } = await apiClient.post<TaskStatus>(
        `/market-data/${symbol}`,
        null, // no body payload
        {
          params: {
            interval: interval ?? undefined,
            period: period === 'max' || period === '10y' ? period : '5y',
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

export const useStockSearch = (query: string) => {
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(handler);
  }, [query]);

  useEffect(() => {
    if (!debouncedQuery) {
      setResults([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    searchStocks(debouncedQuery)
      .then((data) => {
        setResults(data.results || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Error searching stocks');
        setLoading(false);
      });
  }, [debouncedQuery]);

  return { results, loading, error };
};

const fetchOptionExpirations = async (symbol: string): Promise<string[]> => {
    const { data } = await apiClient.get(`/market-data/${symbol}/option-expirations`);
    return data;
};

const fetchOptionChain = async (symbol: string, expiration: string): Promise<OptionChain> => {
    const { data } = await apiClient.get(`/market-data/${symbol}/option-chain?expiration_date=${expiration}`);
    return data;
};

export const useOptionExpirations = (symbol: string | null) => {
    return useQuery({
        queryKey: ['optionExpirations', symbol],
        queryFn: () => {
            if (!symbol) return Promise.resolve([]);
            return fetchOptionExpirations(symbol);
        },
        enabled: !!symbol,
        staleTime: 1000 * 60 * 60, // 1 hour
    });
};

export const useOptionChain = (symbol: string | null, expiration: string | null) => {
    return useQuery({
        queryKey: ['optionChain', symbol, expiration],
        queryFn: () => {
            if (!symbol || !expiration) return Promise.resolve(null);
            return fetchOptionChain(symbol, expiration);
        },
        enabled: !!symbol && !!expiration,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};

const fetchCurrentPrices = async (symbols: string[]): Promise<Record<string, { price: number; change: number; change_percent: number }>> => {
    const { data } = await apiClient.get(`/market-data/prices?symbols=${symbols.join(',')}`);
    return data;
};

export const useCurrentPrices = (symbols: string[]) => {
    return useQuery({
        queryKey: ['currentPrices', ...symbols.sort()],
        queryFn: () => {
            if (!symbols.length) return Promise.resolve({});
            return fetchCurrentPrices(symbols);
        },
        enabled: symbols.length > 0,
        staleTime: 1000 * 60 * 1, // 1 minute
        refetchInterval: 1000 * 60 * 1, // Refetch every minute
    });
};

export const useCurrentPrice = (symbol: string | null) => {
    const { data, isLoading, error } = useCurrentPrices(symbol ? [symbol] : []);
    
    return {
        price: symbol && data?.[symbol]?.price || null,
        change: symbol && data?.[symbol]?.change || null,
        change_percent: symbol && data?.[symbol]?.change_percent || null,
        isLoading,
        error
    };
};