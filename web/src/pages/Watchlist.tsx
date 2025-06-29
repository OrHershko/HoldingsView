import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getWatchlist, addToWatchlist, removeFromWatchlist } from '@/services/watchlistService';
import { useCurrentPrices, useStockSearch } from '@/hooks/useMarketData';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Link, X } from 'lucide-react';
import { WatchlistItem as WatchlistItemType, SymbolSearchResult } from '@/types/api';
import { toast } from 'sonner';

const Watchlist: React.FC = () => {
  const queryClient = useQueryClient();
  const [newSymbol, setNewSymbol] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const { data: watchlist = [], isLoading: isLoadingWatchlist } = useQuery<WatchlistItemType[]>({
    queryKey: ['watchlist'],
    queryFn: getWatchlist,
  });

  const { results: searchResults, loading: isSearching } = useStockSearch(newSymbol);

  const addMutation = useMutation({
    mutationFn: ({ symbol, name }: { symbol: string; name?: string }) => addToWatchlist(symbol, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      setNewSymbol('');
    },
  });

  const removeMutation = useMutation({
    mutationFn: removeFromWatchlist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    },
  });

  const symbols = watchlist.map(item => item.symbol);
  const { data: prices, isLoading: isLoadingPrices, error: pricesError } = useCurrentPrices(symbols);

  const handleAddSymbol = (symbol: string, name?: string) => {
    if (symbol && !watchlist.some(item => item.symbol.toUpperCase() === symbol.toUpperCase())) {
      addMutation.mutate({ symbol: symbol.toUpperCase(), name });
    } else if (symbol && watchlist.some(item => item.symbol.toUpperCase() === symbol.toUpperCase())) {
      toast.error(`${symbol.toUpperCase()} already in your watchlist`);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newSymbol.trim()) {
      // If there's an exact match in search results, use that
      const exactMatch = searchResults.find(result => 
        result.symbol.toUpperCase() === newSymbol.toUpperCase()
      );
      if (exactMatch) {
        handleAddSymbol(exactMatch.symbol, exactMatch.shortname);
      } else {
        // Otherwise add the symbol as-is
        handleAddSymbol(newSymbol.trim());
      }
    }
  };

  const handleRemoveSymbol = (symbolToRemove: string) => {
    removeMutation.mutate(symbolToRemove);
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const formatChange = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '-';
    const sign = value > 0 ? '+' : '';
    return `${sign}$${value.toFixed(2)}`;
  };

  const formatChangePercent = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '-';
    return `${value.toFixed(2)}%`;
  };

  return (
    <div className="container mx-auto overflow-y-auto h-full p-4">
      <div className="flex justify-between items-center mb-4 bg-black/50 rounded-lg p-4">
        <h1 className="text-2xl font-bold">My Watchlist</h1>
        <div className="relative">
          <Input
            type="text"
            value={newSymbol}
            onChange={(e) => setNewSymbol(e.target.value)}
            onKeyDown={handleKeyPress}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            placeholder="Add symbol (e.g., AAPL)"
            className="w-48"
            disabled={addMutation.isPending}
          />
          {isSearchFocused && newSymbol && (
            <div className="absolute z-10 w-full bg-white rounded-md shadow-lg mt-1 text-black">
              {isSearching ? (
                <div className="p-2">Searching...</div>
              ) : (
                searchResults.map((result: SymbolSearchResult) => (
                  <div
                    key={result.symbol}
                    className="p-2 hover:bg-gray-100 cursor-pointer"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleAddSymbol(result.symbol, result.shortname);
                    }}
                  >
                    <div className="font-bold">{result.symbol}</div>
                    <div className="text-sm text-gray-500">{result.shortname}</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {pricesError && <div className="text-red-500 mb-4">Error fetching prices: {pricesError.message}</div>}
      
      <div className="bg-black/50 shadow-md rounded-lg p-4">
        <table className="min-w-full">
          <thead className="bg-black/50">
            <tr>
              <th className="text-left py-3 px-4 font-semibold text-md">Symbol</th>
              <th className="text-left py-3 px-4 font-semibold text-md">Name</th>
              <th className="text-right py-3 px-4 font-semibold text-md">Last Price</th>
              <th className="text-right py-3 px-4 font-semibold text-md">Change</th>
              <th className="text-right py-3 px-4 font-semibold text-md">% Change</th>
              <th className="text-right py-3 px-4 font-semibold text-md"></th>
            </tr>
          </thead>
          <tbody>
            {isLoadingWatchlist ? (
              <tr>
                <td colSpan={6} className="text-center py-4">Loading watchlist...</td>
              </tr>
            ) : (
              watchlist.map((item: WatchlistItemType) => {
                const priceData = prices?.[item.symbol];
                const change = priceData?.change ?? null;
                const changePercent = priceData?.change_percent ?? null;
                const isPositive = change !== null && change > 0;
                const isNegative = change !== null && change < 0;

                return (
                  <tr key={item.symbol} className="border-t hover:bg-gray-700">
                    <td className="py-3 px-4 font-medium">{item.symbol}</td>
                    <td className="py-3 px-4 font-medium">{item.name}</td>
                    <td className="text-right py-3 px-4">
                      {isLoadingPrices ? <Skeleton className="h-4 w-20 float-right" /> : formatCurrency(priceData?.price)}
                    </td>
                    <td className="text-right py-3 px-4">
                      {isLoadingPrices ? <Skeleton className="h-4 w-16 float-right" /> : (
                        <Badge variant={isPositive ? 'default' : isNegative ? 'destructive' : 'outline'} className={isPositive ? 'bg-green-500' : isNegative ? 'bg-red-500' : 'bg-gray-500'}>
                          {formatChange(change)}
                        </Badge>
                      )}
                    </td>
                    <td className="text-right py-3 px-4">
                      {isLoadingPrices ? <Skeleton className="h-4 w-16 float-right" /> : (
                         <Badge variant={isPositive ? 'default' : isNegative ? 'destructive' : 'outline'} className={isPositive ? 'bg-green-500' : isNegative ? 'bg-red-500' : 'bg-gray-500'}>
                          {formatChangePercent(changePercent)}
                        </Badge>
                      )}
                    </td>
                    <td className="text-right py-3 px-4">
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveSymbol(item.symbol)} disabled={removeMutation.isPending}>
                        <X className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Watchlist;
