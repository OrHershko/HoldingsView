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
import { CalendarIcon, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { TransactionCreate, EnrichedHolding } from '@/types/api';
import { useStockSearch } from '@/hooks/useMarketData';
import type { SymbolSearchResult } from '@/types/api';
import { useOptionExpirations, useOptionChain, useCurrentPrice } from '@/hooks/useMarketData';

const getTransactionSchema = (holdings: EnrichedHolding[]) => z.object({
  symbol: z.string().min(1, "Symbol is required.").max(21).trim().toUpperCase(),
  transaction_type: z.enum(["BUY", "SELL"]),
  quantity: z.coerce.number().min(0.000001, "Quantity must be greater than 0."),
  price: z.coerce.number().min(0.01, "Price must be greater than 0."),
  transaction_date: z.date({ required_error: "Transaction date is required." }),
  is_option: z.boolean().default(false),
  option_type: z.enum(["CALL", "PUT"]).optional(),
  strike_price: z.coerce.number().min(0.01, "Strike price must be greater than 0.").optional(),
  expiration_date: z.date().optional(),
  underlying_symbol: z.string().max(21).optional(),
}).superRefine((data, ctx) => {
  if (data.transaction_type === "SELL" && holdings && holdings.length > 0 && !data.is_option) {
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
  if (data.is_option) {
    if (!data.option_type) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Option type is required.", path: ["option_type"] });
    }
    if (!data.strike_price) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Strike price is required.", path: ["strike_price"] });
    }
    if (!data.expiration_date) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Expiration date is required.", path: ["expiration_date"] });
    }
    if (!data.underlying_symbol) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Underlying symbol is required.", path: ["underlying_symbol"] });
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

// Custom sliding toggle component
const TradeTypeToggle: React.FC<{ isOption: boolean; onChange: (isOption: boolean) => void }> = ({ isOption, onChange }) => {
  return (
    <div className="flex items-center justify-center">
      <div className="relative flex bg-background border border-gray-200 rounded-full p-1 w-fit h-12">
        {/* Sliding background */}
        <div
          className={cn(
            "absolute top-1 h-9 bg-gray-200 rounded-full shadow-sm transition-all duration-300 ease-in-out",
            isOption ? "left-1/2 ml-1 right-1" : "left-1 right-1/2 mr-1"
          )}
        />
        
        {/* Stock option */}
        <button
          id="stock-trade-option"
          name="trade-type"
          type="button"
          onClick={() => onChange(false)}
          className={cn(
            "relative z-10 flex items-center justify-center space-x-2 px-4 py-2 rounded-full flex-1 transition-colors duration-300",
            !isOption ? "text-gray-800" : "text-gray-500"
          )}
        >
          <span className="font-medium">Stock Trade</span>
        </button>
        
        {/* Options option */}
        <button
          id="options-trade-option"
          name="trade-type"
          type="button"
          onClick={() => onChange(true)}
          className={cn(
            "relative z-10 w-[200px] flex items-center justify-center space-x-2 px-4 py-2 rounded-full flex-1 transition-colors duration-300",
            isOption ? "text-gray-800" : "text-gray-500"
          )}
        >
          <span className="font-medium">Options Trade</span>
        </button>
      </div>
    </div>
  );
};

const SymbolAutocomplete = React.forwardRef<
  HTMLInputElement,
  { 
    value: string; 
    onChange: (v: string) => void; 
    disabled?: boolean; 
    placeholder?: string;
  } & React.ComponentProps<typeof Input>
>(({ 
  value, 
  onChange, 
  disabled, 
  placeholder = "e.g., AAPL",
  ...props
}, ref) => {
  const [query, setQuery] = useState(value);
  const { results, loading } = useStockSearch(query);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setQuery(value);
  }, [value]);

  // Combine refs
  React.useImperativeHandle(ref, () => inputRef.current!);

  return (
    <div className="relative w-full">
      <Input
        {...props}
        ref={inputRef}
        type="search"
        value={query}
        onChange={e => {
          setQuery(e.target.value);
          onChange(e.target.value);
          setShowSuggestions(true);
        }}
        onFocus={() => setShowSuggestions(true)}
        placeholder={placeholder}
        className="w-full"
        autoComplete="off"
        disabled={disabled}
      />
      {query && !disabled && showSuggestions && (
        <div className="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg max-h-60 overflow-y-auto border">
          {loading ? (
            <div className="p-3 text-center text-gray-500">Searching...</div>
          ) : results.length === 0 ? (
            <div className="p-3 text-center text-gray-500">No results</div>
          ) : (
            (results as SymbolSearchResult[]).map((item) => (
              <div
                key={item.symbol}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
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
});

const AddTransactionDialog: React.FC<AddTransactionDialogProps> = ({ isOpen, onClose, portfolioId, holdings }) => {
  const addTransactionMutation = useAddTransactionWithPortfolioCreation();

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(getTransactionSchema(holdings || [])),
    defaultValues: {
      symbol: "",
      transaction_type: "BUY",
      quantity: 1,
      price: 0,
      transaction_date: new Date(),
      is_option: false,
      option_type: undefined,
      strike_price: undefined,
      expiration_date: undefined,
      underlying_symbol: undefined,
    },
  });

  // Update form resolver when holdings change
  React.useEffect(() => {
    form.clearErrors();
  }, [holdings, form]);

  const isOption = form.watch('is_option');
  const underlyingSymbol = form.watch('underlying_symbol');
  const expirationDate = form.watch('expiration_date');
  const optionType = form.watch('option_type');
  const stockSymbol = form.watch('symbol');
  const strikePrice = form.watch('strike_price');
  const transactionType = form.watch('transaction_type');

  // Get current symbol for price fetching (either stock symbol or underlying symbol for options)
  const symbolForPrice = isOption ? underlyingSymbol : stockSymbol;
  
  const { data: expirations, isLoading: expirationsLoading } = useOptionExpirations(underlyingSymbol || null);
  const { data: optionChain, isLoading: chainLoading } = useOptionChain(
    underlyingSymbol || null, 
    expirationDate ? format(expirationDate, 'yyyy-MM-dd') : null
  );
  
  // Fetch current price for the symbol
  const { price: currentPrice, isLoading: priceLoading } = useCurrentPrice(symbolForPrice || null);

  // Get the current option contract data for the selected strike
  const currentOptionContract = React.useMemo(() => {
    if (!isOption || !optionChain || !optionType || strikePrice === undefined) return null;
    
    const contracts = optionType === 'CALL' ? optionChain.calls : optionChain.puts;
    return contracts.find(c => c.strike === strikePrice) || null;
  }, [isOption, optionChain, optionType, strikePrice]);

  // Get the appropriate price for refresh button
  const getRefreshPrice = () => {
    if (isOption && currentOptionContract) {
      // For options, use bid for SELL transactions and ask for BUY transactions
      return transactionType === 'SELL' ? currentOptionContract.bid : currentOptionContract.ask;
    }
    return currentPrice;
  };

  const refreshPrice = getRefreshPrice();
  const canRefresh = isOption ? (currentOptionContract && refreshPrice !== null && refreshPrice !== undefined) : (currentPrice && !priceLoading);

  // Auto-update price when symbol changes and current price is available
  React.useEffect(() => {
    if (refreshPrice && symbolForPrice && canRefresh) {
      // Only update if the current price field value is still the default (0) or empty
      const currentPriceValue = form.getValues('price');
      if (currentPriceValue === 0 || !currentPriceValue) {
        form.setValue('price', refreshPrice.toFixed(2), { shouldValidate: true });
      }
    }
  }, [refreshPrice, symbolForPrice, canRefresh, form]);

  const onSubmit = (data: TransactionFormData) => {
    const baseData: TransactionCreate = {
      symbol: data.is_option ? data.underlying_symbol!.toUpperCase() : data.symbol.toUpperCase(),
      transaction_type: data.transaction_type,
      quantity: data.quantity,
      price: data.price,
      transaction_date: format(data.transaction_date, 'yyyy-MM-dd'),
      portfolio_id: portfolioId!,
      is_option: data.is_option,
      option_type: data.is_option ? data.option_type : undefined,
      strike_price: data.is_option ? data.strike_price : undefined,
      expiration_date: data.is_option && data.expiration_date ? format(data.expiration_date, 'yyyy-MM-dd') : undefined,
      underlying_symbol: data.is_option ? data.underlying_symbol?.toUpperCase() : undefined,
    };

    addTransactionMutation.mutate({ portfolioId, transaction: baseData }, {
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
        price: 0,
        transaction_date: new Date(),
        is_option: false,
        option_type: undefined,
        strike_price: undefined,
        expiration_date: undefined,
        underlying_symbol: undefined,
      });
    }
  }, [isOpen, form]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
          <DialogDescription>
            Record a new {isOption ? 'options' : 'stock'} trade for your portfolio.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            
            {/* Trade Type Toggle */}
            <FormField
              control={form.control}
              name="is_option"
              render={({ field }) => (
                <FormItem>
                  <TradeTypeToggle 
                    isOption={field.value} 
                    onChange={(value) => {
                      field.onChange(value);
                      // Reset option-specific fields when switching to stocks
                      if (!value) {
                        form.setValue('option_type', undefined);
                        form.setValue('strike_price', undefined);
                        form.setValue('expiration_date', undefined);
                        form.setValue('underlying_symbol', undefined);
                      }
                    }} 
                  />
                </FormItem>
              )}
            />

            {/* Options Fields - Animated container */}
            <div className={cn(
              "space-y-4 overflow-hidden transition-all duration-500 ease-in-out",
              isOption ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
            )}>
              <div className="border-l-4 border-blue-500 pl-4 bg-black rounded-r-lg py-3 p-4">
                <h4 className="font-semibold text-blue-800 mb-3">Options Details</h4>
                
                <FormField
                  control={form.control}
                  name="underlying_symbol"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Underlying Symbol</FormLabel>
                      <FormControl>
                        <SymbolAutocomplete 
                          value={field.value || ""} 
                          onChange={field.onChange}
                          placeholder="e.g., AAPL"
                          disabled={!isOption}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <FormField
                    control={form.control}
                    name="expiration_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expiration Date</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(new Date(value))} 
                          disabled={!underlyingSymbol || expirationsLoading}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-background text-white">
                              <SelectValue placeholder={expirationsLoading ? "Loading..." : "Select date"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {expirations?.map(exp => (
                              <SelectItem key={exp} value={exp} className="bg-background text-white">{exp}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="option_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Option Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!expirationDate}>
                          <FormControl>
                            <SelectTrigger className="bg-background text-white">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="CALL" className="bg-background text-white">Call</SelectItem>
                            <SelectItem value="PUT" className="bg-background text-white">Put</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="strike_price"
                  render={({ field }) => (
                    <FormItem className="mt-4">
                      <FormLabel>Strike Price</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseFloat(value))} 
                        disabled={!optionType || chainLoading}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-background text-white">
                            <SelectValue placeholder={chainLoading ? "Loading..." : "Select strike"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {optionChain && (optionType === 'CALL' ? optionChain.calls : optionChain.puts).map(c => (
                            <SelectItem key={c.contractSymbol} value={String(c.strike)} className="bg-background text-white">
                              ${c.strike} (Bid: ${c.bid}, Ask: ${c.ask})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Stock Fields - Animated container */}
            <div className={cn(
              "space-y-4 transition-all duration-500 ease-in-out",
              !isOption ? "max-h-20 opacity-100" : "max-h-0 opacity-0"
            )}>
              <FormField
                control={form.control}
                name="symbol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock Symbol</FormLabel>
                    <FormControl>
                      <SymbolAutocomplete 
                        value={field.value || ""} 
                        onChange={field.onChange}
                        placeholder="e.g., AAPL"
                        disabled={isOption}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Common Fields */}
            <div className="space-y-4">
             <FormField
              control={form.control}
              name="transaction_type"
              render={({ field }) => (
                <FormItem>
                    <FormLabel>Transaction Type</FormLabel>
                   <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                        <SelectTrigger className="bg-background text-white">
                          <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="BUY" className="bg-background text-white">Buy</SelectItem>
                      <SelectItem value="SELL" className="bg-background text-white">Sell</SelectItem>
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
                      <FormLabel>{isOption ? 'Contracts' : 'Shares'}</FormLabel>
                    <FormControl>
                        <Input type="number" placeholder="1" step="any" {...field} />
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
                      <FormLabel>
                        Price per {isOption ? 'Contract' : 'Share'}
                      </FormLabel>
                    <FormControl>
                        <div className="flex space-x-2">
                          <Input 
                            type="number" 
                            placeholder={refreshPrice ? refreshPrice.toFixed(2) : "0.00"} 
                            step="0.01" 
                            {...field} 
                            className="flex-1"
                          />
                          {symbolForPrice && refreshPrice && (
                            <Button
                              id="refresh-price-button"
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (refreshPrice) {
                                  form.setValue('price', refreshPrice.toFixed(2), { shouldValidate: true });
                                }
                              }}
                              disabled={!canRefresh}
                              className="px-3"
                              aria-label={isOption 
                                ? `Refresh with ${transactionType === 'SELL' ? 'bid' : 'ask'} price` 
                                : "Refresh current price"
                              }
                              title={isOption 
                                ? `Use ${transactionType === 'SELL' ? 'bid' : 'ask'} price: $${refreshPrice?.toFixed(2) || '0.00'}` 
                                : `Current price: $${refreshPrice?.toFixed(2) || '0.00'}`
                              }
                            >
                              <RefreshCw className={cn("w-4 h-4", !canRefresh && "animate-spin")} />
                            </Button>
                          )}
                        </div>
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
            </div>

            <DialogFooter className="pt-6 gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={addTransactionMutation.isPending}>
                {addTransactionMutation.isPending ? 'Adding...' : `Add ${isOption ? 'Options' : 'Stock'} Trade`}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddTransactionDialog;