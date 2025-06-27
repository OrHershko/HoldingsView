import React from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateTransaction } from '@/hooks/useAppMutations';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, RefreshCw } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { TransactionCreate, TransactionRead } from '@/types/api';
import { useCurrentPrice } from '@/hooks/useMarketData';

const getEditTransactionSchema = () => z.object({
  transaction_type: z.enum(["BUY", "SELL"]),
  quantity: z.coerce.number().min(0.000001, "Quantity must be greater than 0."),
  price: z.coerce.number().min(0.01, "Price must be greater than 0."),
  transaction_date: z.date({ required_error: "Transaction date is required." }),
});

type EditTransactionFormData = z.infer<ReturnType<typeof getEditTransactionSchema>>;

interface EditTransactionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: TransactionRead | null;
  portfolioId: number;
}

const EditTransactionDialog: React.FC<EditTransactionDialogProps> = ({ isOpen, onClose, transaction, portfolioId }) => {
  const updateTransactionMutation = useUpdateTransaction();

  const form = useForm<EditTransactionFormData>({
    resolver: zodResolver(getEditTransactionSchema()),
    defaultValues: {
      transaction_type: "BUY",
      quantity: 1,
      price: 0.01,
      transaction_date: new Date(),
    },
  });

  const transactionType = form.watch('transaction_type');

  // Get current price for the symbol (either stock symbol or underlying symbol for options)
  const symbolForPrice = transaction?.is_option ? transaction.underlying_symbol : transaction?.symbol;
  const { price: currentPrice, isLoading: priceLoading } = useCurrentPrice(symbolForPrice || null);

  const canRefresh = currentPrice && !priceLoading;

  const onSubmit = (data: EditTransactionFormData) => {
    if (!transaction || !portfolioId) {
      console.error('No transaction or portfolio ID provided');
      return;
    }

    // Keep all the original transaction properties, only update the editable fields
    const baseData: TransactionCreate = {
      symbol: transaction.symbol,
      transaction_type: data.transaction_type,
      quantity: data.quantity,
      price: data.price,
      transaction_date: format(data.transaction_date, 'yyyy-MM-dd'),
      portfolio_id: portfolioId,
      is_option: transaction.is_option,
      option_type: transaction.option_type,
      strike_price: transaction.strike_price,
      expiration_date: transaction.expiration_date,
      underlying_symbol: transaction.underlying_symbol,
    };

    updateTransactionMutation.mutate(
      { portfolioId, transactionId: transaction.id, transaction: baseData },
      {
        onSuccess: () => {
          onClose();
        },
        onError: (error) => {
          console.error('Transaction update failed:', error);
        },
      }
    );
  };
  
  // Populate form when transaction data changes
  React.useEffect(() => {
    if (isOpen && transaction) {
      form.reset({
        transaction_type: transaction.transaction_type,
        quantity: transaction.quantity,
        price: transaction.price,
        transaction_date: parseISO(transaction.transaction_date),
      });
    }
  }, [isOpen, transaction, form]);

  if (!transaction) return null;

  const displaySymbol = transaction.is_option 
    ? `${transaction.underlying_symbol} ${transaction.option_type} $${transaction.strike_price} ${transaction.expiration_date ? format(parseISO(transaction.expiration_date), 'MM/dd/yy') : ''}`
    : transaction.symbol;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
          <DialogDescription>
            Modify this transaction for {displaySymbol}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            
            {/* Transaction Details */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="transaction_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transaction Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger id="transaction-type" name="transaction_type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="BUY">BUY</SelectItem>
                        <SelectItem value="SELL">SELL</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input
                        id="quantity"
                        name="quantity"
                        type="number"
                        step={transaction.is_option ? "1" : "0.001"}
                        min="0.001"
                        placeholder="1"
                        {...field}
                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center justify-between">
                      <span>Price per {transaction.is_option ? 'Contract' : 'Share'}</span>
                      {canRefresh && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (currentPrice) {
                              form.setValue('price', parseFloat(currentPrice.toFixed(2)), { shouldValidate: true });
                            }
                          }}
                          className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700"
                          title={`Current market price: $${currentPrice?.toFixed(2) || 'N/A'}`}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          ${currentPrice?.toFixed(2) || 'N/A'}
                        </Button>
                      )}
                    </FormLabel>
                    <FormControl>
                      <Input
                        id="price"
                        name="price"
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="100.00"
                        {...field}
                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="transaction_date"
                render={({ field }) => (
                  <FormItem className="min-w-fit">
                    <FormLabel>Transaction Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            id="transaction-date"
                            name="transaction_date"
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateTransactionMutation.isPending}
              >
                {updateTransactionMutation.isPending ? "Updating..." : "Update Transaction"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditTransactionDialog; 