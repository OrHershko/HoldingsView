import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { ChevronDown } from 'lucide-react';
import { EnrichedHolding } from '@/types/api';
import { cn } from '@/lib/utils';

interface StockCardProps {
  holding: EnrichedHolding;
  onSelectStock: () => void;
  id: string;
}

const StockCard: React.FC<StockCardProps> = ({
  holding,
  onSelectStock,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isPositiveGain = (holding.unrealized_gain_loss || 0) >= 0;
  const marketValue = holding.market_value || 0;
  const unrealizedGainLoss = holding.unrealized_gain_loss || 0;
  const gainLossPercent = holding.unrealized_gain_loss_percent || 0;

  const todaysChange = holding.todays_change || 0;
  const todaysChangePercent = holding.todays_change_percent || 0;
  const isPositiveDailyChange = todaysChange >= 0;

  const handleExpandClick = (e: React.MouseEvent<SVGSVGElement>) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  }

  return (
    <Card
      onClick={onSelectStock}
      className={cn(
        "bg-gray-800 hover:bg-gray-700/50 active:bg-gray-700 transition-all duration-200 cursor-pointer touch-manipulation",
        "border-2 hover:border-gray-600 active:scale-[0.98]",
        isExpanded ? "border-blue-500 bg-blue-950/20" : "border-gray-700"
      )}
    >
      <div className="p-4 flex items-center justify-between gap-4">
        {/* Left Side: Symbol & shares */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg text-white truncate">
            {holding.symbol}
          </h3>
          <p className="text-sm text-gray-400 mt-0.5">
            {holding.quantity.toLocaleString()} shares
          </p>
        </div>

        
        
        {/* Right Side: Total Value & Arrow */}
        <div className="flex items-center gap-3">
          <div className="text-right flex-shrink-0">
            <p className="font-bold text-lg text-white">
              ${marketValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            {/* Middle: Today's Change */}
            <div className="text-right flex-shrink-0 flex flex-row gap-1 mt-1">
              <p className={cn(
                  "font-semibold text-base",
                  isPositiveDailyChange ? 'text-green-400' : 'text-red-400'
                )}>
                {isPositiveDailyChange ? '+' : '-'}${Math.abs(todaysChange).toFixed(2)}
              </p>
              <p className={cn(
                  "text-sm mt-0.5",
                  isPositiveDailyChange ? 'text-green-400' : 'text-red-400'
                )}>
                ({isPositiveDailyChange ? '+' : ''}{todaysChangePercent.toFixed(2)}%)
              </p>
            </div>
          </div>
          <ChevronDown onClick={(e) => handleExpandClick(e)} className={cn(
              "h-6 w-6 text-gray-500 transition-transform duration-300 flex-shrink-0",
              isExpanded && "rotate-180"
            )} />
        </div>
      </div>
      
      {/* Expanded Details Section */}
      {isExpanded && (
        <div className="px-4 pb-4 text-sm animate-in fade-in-0 slide-in-from-top-4 duration-300">
          <hr className="border-gray-700 mb-4" />
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-gray-300">
            <span>Avg. Cost</span>
            <span className="text-right font-mono text-white">
              ${holding.average_cost_basis.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>

            <span>Total Cost</span>
            <span className="text-right font-mono text-white">
              ${holding.total_cost_basis.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            
            <span>Market Value</span>
            <span className="text-right font-mono text-white">
                ${marketValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>

            <span>Unrealized P/L</span>
            <span className={cn(
              "text-right font-mono",
              isPositiveGain ? 'text-green-400' : 'text-red-400'
            )}>
                {isPositiveGain ? '+' : ''}${unrealizedGainLoss.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}
    </Card>
  );
};

export default StockCard;