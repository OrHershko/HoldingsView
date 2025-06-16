import apiClient from './apiService';
import { TransactionCreate, Portfolio, TransactionRead } from '@/types/api';

/**
 * Adds a new transaction to a specific portfolio.
 * @param portfolioId The ID of the portfolio.
 * @param transaction The transaction data to add.
 * @returns The created transaction.
 */
export const addTransaction = async (portfolioId: number, transaction: TransactionCreate): Promise<TransactionRead> => {
  const { data } = await apiClient.post(`/portfolios/${portfolioId}/transactions`, transaction);
  return data;
};

/**
 * Deletes a transaction from a portfolio.
 * @param portfolioId The ID of the portfolio.
 * @param transactionId The ID of the transaction to delete.
 */
export const deleteTransaction = async (portfolioId: number, transactionId: number): Promise<TransactionRead> => {
  const { data } = await apiClient.delete(`/portfolios/${portfolioId}/transactions/${transactionId}`);
  return data;
};

/**
 * Updates an existing portfolio's name or description.
 * @param portfolioId The ID of the portfolio to update.
 * @param portfolioData The data to update.
 */
export const updatePortfolioDetails = async (portfolioId: number, portfolioData: { name?: string; description?: string }): Promise<Portfolio> => {
    const { data } = await apiClient.put<Portfolio>(`/portfolios/${portfolioId}`, portfolioData);
    return data;
}