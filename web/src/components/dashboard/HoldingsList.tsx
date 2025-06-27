import React from "react";
import StockCard from "@/components/StockCard";
import { EnrichedHolding } from "@/types/api";

interface HoldingsListProps {
  holdings: EnrichedHolding[];
  onSelectStock: (symbol: string) => void;
  onEditHolding?: (holding: EnrichedHolding) => void;
  onDeleteHolding?: (holding: EnrichedHolding) => void;
}

const HoldingsList: React.FC<HoldingsListProps> = ({
  holdings,
  onSelectStock,
  onEditHolding,
  onDeleteHolding,
}) => {
  // Separate stocks and options
  const stockHoldings = holdings.filter(h => !h.is_option);
  const optionHoldings = holdings.filter(h => h.is_option);

  const handleStockSelect = (holding: EnrichedHolding) => {
    // For options, use the underlying symbol for market data display
    const symbol = holding.is_option && holding.underlying_symbol ? holding.underlying_symbol : holding.symbol;
    onSelectStock(symbol);
  };

  return (
    <div className="h-full flex flex-col min-w-[300px]">
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-white mb-1">Your Holdings</h2>
        <p className="text-sm text-gray-400">
          {holdings.length} {holdings.length === 1 ? 'holding' : 'holdings'} in portfolio
          {stockHoldings.length > 0 && optionHoldings.length > 0 && (
            <span className="ml-1">
              ({stockHoldings.length} stock{stockHoldings.length !== 1 ? 's' : ''}, {optionHoldings.length} option{optionHoldings.length !== 1 ? 's' : ''})
            </span>
          )}
        </p>
      </div>
      
      <div className="flex-1">
        <div className="space-y-2 md:space-y-3 pb-4">
          {holdings.length > 0 ? (
            <>
              {/* Stock Holdings */}
              {stockHoldings.length > 0 && (
                <div>
                  {optionHoldings.length > 0 && (
                    <h3 className="text-sm font-medium text-gray-300 mb-2 px-1">
                      Stocks ({stockHoldings.length})
                    </h3>
                  )}
                  <div className="space-y-2">
                    {stockHoldings.map((holding) => (
                      <StockCard
                        key={holding.symbol}
                        id={holding.symbol}
                        holding={holding}
                        onSelectStock={() => handleStockSelect(holding)}
                        onEditHolding={onEditHolding}
                        onDeleteHolding={onDeleteHolding}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Options Holdings */}
              {optionHoldings.length > 0 && (
                <div className={stockHoldings.length > 0 ? "mt-4" : ""}>
                  {stockHoldings.length > 0 && (
                    <h3 className="text-sm font-medium text-gray-300 mb-2 px-1">
                      Options ({optionHoldings.length})
                    </h3>
                  )}
                  <div className="space-y-2">
                    {optionHoldings.map((holding) => (
                      <StockCard
                        key={`${holding.symbol}-${holding.option_type}-${holding.strike_price}-${holding.expiration_date}`}
                        id={`${holding.symbol}-${holding.option_type}-${holding.strike_price}-${holding.expiration_date}`}
                        holding={holding}
                        onSelectStock={() => handleStockSelect(holding)}
                        onEditHolding={onEditHolding}
                        onDeleteHolding={onDeleteHolding}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-gray-500 py-12 md:py-16 px-4">
              <div className="max-w-sm mx-auto">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-700/50 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-white mb-2">Your portfolio is empty</h3>
                <p className="text-sm leading-relaxed">
                  Add your first transaction to start tracking your investments and see detailed analytics.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HoldingsList;