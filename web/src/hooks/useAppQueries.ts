import { useQuery } from '@tanstack/react-query';
import apiClient from '@/services/apiService';
import { Portfolio, PortfolioRead } from '@/types/api';

/**
 * Fetches the user's first portfolio and its detailed holdings.
 * If no portfolio exists, it creates one.
 */
export const usePortfolio = (options: { enabled: boolean }) => {
  return useQuery<Portfolio, Error>({
    queryKey: ['portfolio'],
    queryFn: async () => {
      const { data: portfolios } = await apiClient.get<PortfolioRead[]>('/portfolios');
      
      let portfolioId: number;

      if (!portfolios || portfolios.length === 0) {
        // If no portfolio, create one
        const { data: newPortfolio } = await apiClient.post<PortfolioRead>('/portfolios', {
          name: 'My First Portfolio',
          description: 'My main investment portfolio'
        });
        portfolioId = newPortfolio.id;
      } else {
        portfolioId = portfolios[0].id;
      }
      
      const { data: detailedPortfolio } = await apiClient.get<Portfolio>(`/portfolios/${portfolioId}`);
      return detailedPortfolio;
    },
    enabled: options.enabled,
    staleTime: 5 * 60 * 1000, // Data is fresh for 5 minutes
    refetchOnWindowFocus: false, // Prevents refetching on window focus for a more stable UI
  });
};