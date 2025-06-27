import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { EnrichedHolding, TransactionRead } from '@/types/api';

interface DeleteHoldingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  holding: EnrichedHolding | null;
  transactions: TransactionRead[];
  onConfirmDelete: (transactionIds: number[]) => void;
}

const DeleteHoldingDialog: React.FC<DeleteHoldingDialogProps> = ({
  isOpen,
  onClose,
  holding,
  transactions,
  onConfirmDelete,
}) => {
  if (!holding) return null;

  // Find all transactions that belong to this holding
  const getRelatedTransactions = () => {
    if (holding.is_option) {
      // For options, match on underlying symbol, option type, strike price, and expiration
      return transactions.filter(t => 
        t.is_option &&
        t.underlying_symbol === holding.underlying_symbol &&
        t.option_type === holding.option_type &&
        t.strike_price === holding.strike_price &&
        t.expiration_date === holding.expiration_date
      );
    } else {
      // For stocks, match on symbol
      return transactions.filter(t => 
        !t.is_option && 
        t.symbol === holding.symbol
      );
    }
  };

  const relatedTransactions = getRelatedTransactions();
  const transactionIds = relatedTransactions.map(t => t.id);

  const handleConfirm = () => {
    onConfirmDelete(transactionIds);
    onClose();
  };

  const formatExpirationDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="bg-gray-800 border-gray-700">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">
            Delete {holding.is_option ? 'Option' : 'Stock'} Holding
          </AlertDialogTitle>
          <AlertDialogDescription className="text-gray-300">
            Are you sure you want to delete this holding? This action will remove all related transactions and cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="my-4 p-4 bg-gray-900 rounded-lg">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Symbol:</span>
              <span className="text-white font-medium">{holding.symbol}</span>
            </div>
            
            {holding.is_option && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Underlying:</span>
                  <span className="text-white">{holding.underlying_symbol}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Type:</span>
                  <span className="text-white">{holding.option_type}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Strike:</span>
                  <span className="text-white">${holding.strike_price}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Expiration:</span>
                  <span className="text-white">{formatExpirationDate(holding.expiration_date)}</span>
                </div>
              </>
            )}

            <div className="flex justify-between items-center">
              <span className="text-gray-400">Quantity:</span>
              <span className="text-white">{holding.quantity} {holding.is_option ? 'contract' : 'share'}{holding.quantity !== 1 ? 's' : ''}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Market Value:</span>
              <span className="text-white">${(holding.market_value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            <div className="pt-2 border-t border-gray-700">
              <span className="text-gray-400">Transactions to be deleted:</span>
              <span className="text-red-400 font-medium ml-2">{relatedTransactions.length}</span>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel className="bg-gray-700 text-white hover:bg-gray-600 border-gray-600">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Delete Holding
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteHoldingDialog; 