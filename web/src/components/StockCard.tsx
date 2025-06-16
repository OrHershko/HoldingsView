import React from 'react';
import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { EnrichedHolding } from '@/types/api';
import { cn } from '@/lib/utils';

interface StockCardProps {
  holding: EnrichedHolding;
  onClick: () => void;
  id: string;
  isSelected: boolean;
}

const StockCard: React.FC<StockCardProps> = ({
  holding,
  onClick,
  isSelected,
}) => {
  const isPositiveGain = (holding.unrealized_gain_loss || 0) >= 0;

  return (
    <div className="min-w-[320px]">
      <Card
        onClick={onClick}
        className={cn(
          "bg-gray-800 hover:bg-gray-700/50 transition-colors duration-200 flex items-stretch border cursor-pointer",
          isSelected ? "border-blue-500" : "border-gray-700"
        )}
      >
        <div className="flex-grow text-left p-3">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-lg">{holding.symbol}</h3>
              <p className="text-xs text-gray-400">{holding.quantity.toLocaleString()} shares</p>
            </div>
            <div className="text-right">
                <p className="font-semibold text-lg">
                    ${(holding.market_value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <div className={`text-sm flex items-center justify-end ${isPositiveGain ? 'text-green-500' : 'text-red-500'}`}>
                  {isPositiveGain ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                  <span>
                    {(holding.unrealized_gain_loss || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                  </span>
                </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default StockCard;