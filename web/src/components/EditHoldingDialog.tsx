import React, { useState } from 'react';
import { format } from 'date-fns';
import { Edit, Trash2, Calendar, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { EnrichedHolding, TransactionRead } from '@/types/api';
import { useDeleteTransaction } from '@/hooks/useAppMutations';
import EditTransactionDialog from './EditTransactionDialog';

interface EditHoldingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  holding: EnrichedHolding | null;
  allTransactions: TransactionRead[];
  portfolioId: number;
}

const EditHoldingDialog: React.FC<EditHoldingDialogProps> = ({
  isOpen,
  onClose,
  holding,
  allTransactions,
  portfolioId,
}) => {
  const [editTransactionId, setEditTransactionId] = useState<number | null>(null);
  const deleteTransactionMutation = useDeleteTransaction();

  if (!holding) return null;

  // Filter transactions for this holding
  const holdingTransactions = allTransactions.filter(transaction => {
    if (holding.is_option) {
      // For options, match by underlying symbol, option type, strike price, and expiration date
      return (
        transaction.underlying_symbol === holding.underlying_symbol &&
        transaction.option_type === holding.option_type &&
        transaction.strike_price === holding.strike_price &&
        transaction.expiration_date === holding.expiration_date
      );
    } else {
      // For stocks, match by symbol
      return transaction.symbol === holding.symbol;
    }
  });

  const handleDeleteTransaction = (transactionId: number) => {
    deleteTransactionMutation.mutate(
      { portfolioId, transactionId },
      {
        onSuccess: () => {
          // Check if this was the last transaction for this holding
          if (holdingTransactions.length === 1) {
            onClose(); // Close the dialog if no more transactions
          }
        }
      }
    );
  };

  const handleEditTransaction = (transactionId: number) => {
    setEditTransactionId(transactionId);
  };

  const transactionToEdit = editTransactionId 
    ? holdingTransactions.find(t => t.id === editTransactionId) 
    : null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit {holding.is_option ? 'Options' : 'Stock'} Holding</DialogTitle>
            <DialogDescription>
              Manage transactions for {holding.symbol}
            </DialogDescription>
          </DialogHeader>

          {/* Holding Summary */}
          <Card className="bg-black/50 border border-gray-700">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{holding.quantity}</div>
                  <div className="text-sm text-gray-600">
                    {holding.is_option ? 'Total Contracts' : 'Total Shares'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">${holding.total_cost_basis.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <div className="text-sm text-gray-600">Cost Basis</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">${holding.average_cost_basis.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <div className="text-sm text-gray-600">Avg Cost</div>
                </div>
              </div>

              {holding.is_option && (
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  <Badge variant={holding.option_type === 'CALL' ? 'default' : 'destructive'}>
                    {holding.option_type}
                  </Badge>
                  <Badge variant="outline">${holding.strike_price}</Badge>
                  <Badge variant="outline">
                    Exp: {holding.expiration_date ? format(new Date(holding.expiration_date), 'MM/dd/yyyy') : 'N/A'}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Transactions ({holdingTransactions.length})</h3>
            
            {holdingTransactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No transactions found for this holding.
              </div>
            ) : (
              <div className="space-y-3 overflow-x-auto">
                {holdingTransactions.map((transaction) => (
                  <Card key={transaction.id} className="border border-gray-200 hover:shadow-md transition-shadow min-w-fit">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            {transaction.transaction_type === 'BUY' ? (
                              <TrendingUp className="h-4 w-4 text-green-600" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-red-600" />
                            )}
                            <Badge 
                              variant={transaction.transaction_type === 'BUY' ? 'default' : 'destructive'}
                              className="text-xs"
                            >
                              {transaction.transaction_type}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm">
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3 text-gray-400" />
                              <span>{format(new Date(transaction.transaction_date), 'MM/dd/yyyy')}</span>
                            </div>
                            
                            <div className="flex items-center space-x-1">
                              <span className="font-medium">{transaction.quantity}</span>
                              <span className="text-gray-600">
                                {holding.is_option ? 'contracts' : 'shares'}
                              </span>
                            </div>
                            
                            <div className="flex items-center space-x-1">
                              <DollarSign className="h-3 w-3 text-gray-400" />
                              <span className="font-medium">${transaction.price}</span>
                            </div>
                            
                            <div className="text-gray-600">
                              Total: ${(transaction.quantity * transaction.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditTransaction(transaction.id)}
                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTransaction(transaction.id)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            disabled={deleteTransactionMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Transaction Dialog */}
      <EditTransactionDialog
        isOpen={editTransactionId !== null}
        onClose={() => setEditTransactionId(null)}
        transaction={transactionToEdit}
        portfolioId={portfolioId}
      />
    </>
  );
};

export default EditHoldingDialog; 