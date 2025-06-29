import apiClient from './apiService';
import { WatchlistItem } from '@/types/api';

export const getWatchlist = async (): Promise<WatchlistItem[]> => {
    const { data } = await apiClient.get('/watchlist');
    return data;
};

export const addToWatchlist = async (symbol: string, name?: string): Promise<WatchlistItem> => {
    const { data } = await apiClient.post('/watchlist', { 
        symbol, 
        name: name || symbol // Use provided name or fallback to symbol
    });
    return data;
};

export const removeFromWatchlist = async (symbol: string): Promise<void> => {
    await apiClient.delete(`/watchlist/${symbol}`);
};
