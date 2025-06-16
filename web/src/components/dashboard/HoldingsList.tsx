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
    <div className="h-full flex flex-col min-w-52">
      <div className="flex-1 overflow-y-auto pr-2">
        <div className="space-y-3">
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
            <div className="text-center text-gray-500 py-16 px-4">
              <p className="font-semibold">Your portfolio is empty.</p>
              <p className="text-sm mt-1">
                Click "Add Transaction" to add your first stock.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HoldingsList;