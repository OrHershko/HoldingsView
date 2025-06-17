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
  const currentPrice = holding.current_price || 0;
  const marketValue = holding.market_value || 0;
  const gainLoss = holding.unrealized_gain_loss || 0;
  const gainLossPercent = holding.unrealized_gain_loss_percent || 0;

  return (
    <Card
      onClick={onClick}
      className={cn(
        "bg-gray-800 hover:bg-gray-700/50 active:bg-gray-700 transition-colors duration-200 cursor-pointer touch-manipulation",
        "border-2 hover:border-gray-600 active:scale-[0.98]",
        isSelected ? "border-blue-500 bg-blue-950/20" : "border-gray-700"
      )}
    >
      <div className="p-4 md:p-5">
        {/* Main content layout */}
        <div className="flex justify-between items-start gap-3">
          {/* Left side - Symbol and quantity */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg md:text-xl text-white truncate">
              {holding.symbol}
            </h3>
            <p className="text-xs md:text-sm text-gray-400 mt-0.5">
              {holding.quantity.toLocaleString()} shares @ ${currentPrice.toFixed(2)}
            </p>
          </div>

          {/* Right side - Values */}
          <div className="text-right flex-shrink-0">
            <p className="font-bold text-lg md:text-xl text-white">
              ${marketValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <div className={cn(
              "text-sm md:text-base flex items-center justify-end gap-1 mt-0.5",
              isPositiveGain ? 'text-green-400' : 'text-red-400'
            )}>
              {isPositiveGain ? (
                <TrendingUp className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
              ) : (
                <TrendingDown className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
              )}
              <span className="font-medium">
                {isPositiveGain ? '+' : ''}${Math.abs(gainLoss).toFixed(2)}
              </span>
              <span className="text-xs md:text-sm opacity-80">
                ({isPositiveGain ? '+' : ''}{gainLossPercent.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default StockCard;