import React, { useState, useRef } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAddTransactionWithPortfolioCreation } from '@/hooks/useAppMutations';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { TransactionCreate, EnrichedHolding } from '@/types/api';
import { useStockSearch } from '@/hooks/useMarketData';
import type { SymbolSearchResult } from '@/types/api';

const getTransactionSchema = (holdings: EnrichedHolding[]) => z.object({
  symbol: z.string().min(1, "Symbol is required.").max(10).trim().toUpperCase(),
  transaction_type: z.enum(["BUY", "SELL"]),
  quantity: z.coerce.number().min(0.000001, "Quantity must be greater than 0."),
  price: z.coerce.number().min(0.01, "Price must be greater than 0."),
  transaction_date: z.date({ required_error: "Transaction date is required." }),
}).superRefine((data, ctx) => {
  if (data.transaction_type === "SELL" && holdings && holdings.length > 0) {
    const holding = holdings.find(h => h.symbol === data.symbol);
    const currentQuantity = holding?.quantity || 0;
    if (data.quantity > currentQuantity) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Cannot sell more than you own. You have ${currentQuantity} shares.`,
        path: ["quantity"],
      });
    }
  }
});

type TransactionFormData = z.infer<ReturnType<typeof getTransactionSchema>>;

interface AddTransactionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  portfolioId?: number;
  holdings: EnrichedHolding[];
}

const SymbolAutocomplete: React.FC<{ value: string; onChange: (v: string) => void; disabled?: boolean }> = ({ value, onChange, disabled }) => {
  const [query, setQuery] = useState(value);
  const { results, loading } = useStockSearch(query);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  React.useEffect(() => {
    setQuery(value);
  }, [value]);

  return (
    <div className="relative w-full">
      <Input
        ref={inputRef}
        type="search"
        value={query}
        onChange={e => {
          setQuery(e.target.value);
          onChange(e.target.value);
          setShowSuggestions(true);
        }}
        onFocus={() => setShowSuggestions(true)}
        placeholder="e.g., AAPL"
        className="pl-9 rounded-full"
        autoComplete="off"
        disabled={disabled}
      />
      {query && !disabled && showSuggestions && (
        <div className="absolute z-10 mt-1 w-full bg-white rounded shadow-lg max-h-60 overflow-y-auto">
          {loading ? (
            <div className="p-3 text-center text-gray-500">Searching...</div>
          ) : results.length === 0 ? (
            <div className="p-3 text-center text-gray-500">No results</div>
          ) : (
            (results as SymbolSearchResult[]).map((item) => (
              <div
                key={item.symbol}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => {
                  onChange(item.symbol);
                  setQuery(item.symbol);
                  setShowSuggestions(false);
                  inputRef.current?.blur();
                }}
              >
                <span className="font-semibold text-black">{item.symbol}</span>
                {item.shortname && <span className="ml-2 text-gray-600">{item.shortname}</span>}
                {item.exchDisp && <span className="ml-2 text-xs text-gray-400">({item.exchDisp})</span>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

const AddTransactionDialog: React.FC<AddTransactionDialogProps> = ({ isOpen, onClose, portfolioId, holdings }) => {
  const addTransactionMutation = useAddTransactionWithPortfolioCreation();

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(getTransactionSchema(holdings || [])),
    defaultValues: {
      symbol: "",
      transaction_type: "BUY",
      quantity: 1,
      price: 1,
      transaction_date: new Date(),
    },
  });

  // Update form resolver when holdings change
  React.useEffect(() => {
    form.clearErrors();
    // The resolver will be updated automatically on next validation
  }, [holdings, form]);

  const onSubmit = (data: TransactionFormData) => {
    const formattedData: TransactionCreate = {
      symbol: data.symbol.toUpperCase(),
      transaction_type: data.transaction_type,
      quantity: data.quantity,
      price: data.price,
      transaction_date: format(data.transaction_date, 'yyyy-MM-dd'),
    };

    addTransactionMutation.mutate({ portfolioId, transaction: formattedData }, {
      onSuccess: () => {
        form.reset();
        onClose();
      },
    });
  };
  
  // Reset form when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        symbol: "",
        transaction_type: "BUY",
        quantity: 1,
        price: 1,
        transaction_date: new Date(),
      });
    }
  }, [isOpen, form]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
          <DialogDescription>
            Record a new buy or sell transaction for your portfolio.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="symbol"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stock Symbol</FormLabel>
                  <FormControl>
                    <SymbolAutocomplete value={field.value} onChange={field.onChange} disabled={form.formState.isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="transaction_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                   <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-background text-white">
                        <SelectValue placeholder="Select transaction type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="BUY">Buy</SelectItem>
                      <SelectItem value="SELL">Sell</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0.00" step="any" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price per Share</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0.00" step="any" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="transaction_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Transaction Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={addTransactionMutation.isPending}>
                {addTransactionMutation.isPending ? 'Adding...' : 'Add Transaction'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddTransactionDialog;