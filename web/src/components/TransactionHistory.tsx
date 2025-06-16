import React from 'react';
import { TransactionRead } from '@/types/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { useDeleteTransaction } from '@/hooks/useAppMutations';
import { toast } from 'sonner';

interface TransactionHistoryProps {
  transactions: TransactionRead[];
  portfolioId: number | undefined;
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ transactions, portfolioId }) => {
  const deleteMutation = useDeleteTransaction();

  const handleDelete = (transactionId: number) => {
    if (!portfolioId) {
        toast.error("Cannot delete transaction: Portfolio not found.");
        return;
    }
    deleteMutation.mutate({ portfolioId, transactionId });
  };

  if (!transactions || transactions.length === 0) {
    return (
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <h2 className="text-xl font-semibold mb-2">Transaction History</h2>
            <p className="text-gray-400">No transactions found for this holding.</p>
        </div>
    );
  }

  return (
    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
      <h2 className="text-xl font-semibold mb-4">Transaction History</h2>
      <div className="max-h-96 overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.sort((a,b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()).map((tx) => (
              <TableRow key={tx.id}>
                <TableCell>{format(new Date(tx.transaction_date), 'MMM dd, yyyy')}</TableCell>
                <TableCell>
                  <Badge variant={tx.transaction_type === 'BUY' ? 'default' : 'destructive'} className={tx.transaction_type === 'BUY' ? 'bg-green-600/80' : 'bg-red-600/80'}>
                    {tx.transaction_type}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{tx.quantity.toLocaleString()}</TableCell>
                <TableCell className="text-right">${tx.price.toFixed(2)}</TableCell>
                <TableCell className="text-right">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                       <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-500">
                            <Trash2 className="h-4 w-4" />
                       </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the transaction. This action cannot be undone and will affect your portfolio calculation.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(tx.id)} className="bg-destructive hover:bg-destructive/90">
                            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                    </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default TransactionHistory;