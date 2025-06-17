import React from "react";
import StockCard from "@/components/StockCard";
import { EnrichedHolding } from "@/types/api";

interface HoldingsListProps {
  holdings: EnrichedHolding[];
  onSelectStock: (symbol: string) => void;
  selectedSymbol: string | null;
}

const HoldingsList: React.FC<HoldingsListProps> = ({
  holdings,
  onSelectStock,
  selectedSymbol,
}) => {
  return (
    <div className="h-full flex flex-col">
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-white mb-1">Your Holdings</h2>
        <p className="text-sm text-gray-400">
          {holdings.length} {holdings.length === 1 ? 'stock' : 'stocks'} in portfolio
        </p>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-2 md:space-y-3 pb-4">
          {holdings.length > 0 ? (
            holdings.map((holding) => (
              <StockCard
                key={holding.symbol}
                id={holding.symbol}
                holding={holding}
                onClick={() => onSelectStock(holding.symbol)}
                isSelected={selectedSymbol === holding.symbol}
              />
            ))
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