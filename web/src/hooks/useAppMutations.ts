import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/sonner';
import { TransactionCreate, PortfolioRead } from '@/types/api';
import { addTransaction, deleteTransaction } from '@/services/portfolioService';
import apiClient from '@/services/apiService';

/**
 * Mutation hook for adding a new transaction to a portfolio.
 * It will invalidate the main portfolio query on success to refetch data.
 */
export const useAddTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ portfolioId, transaction }: { portfolioId: number, transaction: TransactionCreate }) => 
      addTransaction(portfolioId, transaction),
    onSuccess: () => {
      toast.success("Transaction added successfully!");
      // Invalidate and refetch the portfolio data to show the updated state
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to add transaction: ${error.message}`);
    },
  });
};

/**
 * Mutation hook for adding a transaction with automatic portfolio creation.
 * If no portfolioId is provided, it will create a portfolio first, then add the transaction.
 */
export const useAddTransactionWithPortfolioCreation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ portfolioId, transaction }: { portfolioId?: number, transaction: TransactionCreate }) => {
      let finalPortfolioId = portfolioId;

      // If no portfolio ID provided, create a portfolio first
      if (!finalPortfolioId) {
        const { data: newPortfolio } = await apiClient.post<PortfolioRead>('/portfolios', {
          name: 'My Portfolio',
          description: 'My investment portfolio'
        });
        finalPortfolioId = newPortfolio.id;
      }

      // Add the transaction to the portfolio
      return addTransaction(finalPortfolioId, transaction);
    },
    onSuccess: () => {
      toast.success("Transaction added successfully!");
      // Invalidate and refetch the portfolio data to show the updated state
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to add transaction: ${error.message}`);
    },
  });
};

/**
 * Mutation hook for deleting a transaction from a portfolio.
 */
export const useDeleteTransaction = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ portfolioId, transactionId }: { portfolioId: number; transactionId: number }) =>
            deleteTransaction(portfolioId, transactionId),
        onSuccess: () => {
            toast.success("Transaction deleted successfully!");
            queryClient.invalidateQueries({ queryKey: ['portfolio'] });
        },
        onError: (error: Error) => {
            toast.error(`Failed to delete transaction: ${error.message}`);
        },
    });
};