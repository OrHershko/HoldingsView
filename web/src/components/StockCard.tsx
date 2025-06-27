import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { ChevronDown, Calendar, Edit, Trash2 } from 'lucide-react';
import { EnrichedHolding } from '@/types/api';
import { cn } from '@/lib/utils';
import { useEnrichedMarketData } from '@/hooks/useMarketData';

interface StockCardProps {
  holding: EnrichedHolding;
  onSelectStock: () => void;
  onEditHolding?: (holding: EnrichedHolding) => void;
  onDeleteHolding?: (holding: EnrichedHolding) => void;
  id: string;
}

const StockCard: React.FC<StockCardProps> = ({
  holding,
  onSelectStock,
  onEditHolding,
  onDeleteHolding,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isPositiveGain = (holding.unrealized_gain_loss || 0) >= 0;
  const marketValue = holding.market_value || 0;
  const unrealizedGainLoss = holding.unrealized_gain_loss || 0;

  const todaysChange = holding.todays_change || 0;
  const todaysChangePercent = holding.todays_change_percent || 0;
  const isPositiveDailyChange = todaysChange >= 0;

  // Get the symbol to fetch extended market data for
  const symbolForExtendedData = holding.is_option && holding.underlying_symbol ? holding.underlying_symbol : holding.symbol;
  
  // Only fetch extended market data when expanded
  const { data: extendedMarketData } = useEnrichedMarketData(
    isExpanded ? symbolForExtendedData : null, 
    '1d', 
    '1d'
  );

  const handleExpandClick = (e: React.MouseEvent<SVGSVGElement>) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  }

  const handleEditClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (onEditHolding) {
      onEditHolding(holding);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (onDeleteHolding) {
      onDeleteHolding(holding);
    }
  };

  // Format expiration date for display
  const formatExpirationDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
  };

  // Check if option is expiring soon (within 30 days)
  const isExpiringSoon = () => {
    if (!holding.is_option || !holding.expiration_date) return false;
    const expirationDate = new Date(holding.expiration_date);
    const today = new Date();
    const daysUntilExpiration = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiration <= 30 && daysUntilExpiration > 0;
  };

  return (
    <Card
      onClick={onSelectStock}
      className={cn(
        "bg-gray-800 hover:bg-gray-700/50 active:bg-gray-700 transition-all duration-200 cursor-pointer touch-manipulation",
        "border-2 hover:border-gray-600 active:scale-[0.98]",
        isExpanded ? "border-blue-500 bg-blue-950/20" : "border-gray-700",
        holding.is_option && isExpiringSoon() && "border-orange-500/50 bg-orange-950/10"
      )}
    >
      <div className="p-4 flex items-center justify-between gap-4">
        {/* Left Side: Symbol & details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-lg text-white truncate">
              {holding.symbol}
            </h3>
            {holding.is_option && (
              <span className={cn(
                "px-2 py-0.5 text-xs font-medium rounded-full",
                holding.option_type === 'CALL' ? "bg-green-900/50 text-green-300" : "bg-red-900/50 text-red-300"
              )}>
                {holding.option_type}
              </span>
            )}
            {holding.is_option && isExpiringSoon() && (
              <Calendar className="h-4 w-4 text-orange-400" />
            )}
          </div>
          
          <div className="space-y-0.5">
            <p className="text-sm text-gray-400">
              {holding.quantity.toLocaleString()} {holding.is_option ? 'contract' : 'share'}{holding.quantity !== 1 ? 's' : ''}
            </p>
            {holding.is_option && holding.strike_price && (
              <p className="text-xs text-gray-500">
                ${holding.strike_price} Strike • Exp: {formatExpirationDate(holding.expiration_date)}
              </p>
            )}
          </div>
        </div>

        {/* Right Side: Total Value & Arrow */}
        <div className="flex items-center gap-3">
          <div className="text-right flex-shrink-0">
            <p className="font-bold text-lg text-white">
              ${marketValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            {/* Today's Change */}
            <div className="text-right flex-shrink-0 flex flex-row gap-1 mt-1">
              <p className={cn(
                  "font-semibold text-base",
                  isPositiveDailyChange ? 'text-green-400' : 'text-red-400'
                )}>
                {isPositiveDailyChange ? '+' : '-'}${Math.abs(todaysChange).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className={cn(
                  "text-sm mt-0.5",
                  isPositiveDailyChange ? 'text-green-400' : 'text-red-400'
                )}>
                ({isPositiveDailyChange ? '+' : ''}{todaysChangePercent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%)
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
          
          {/* Extended Hours Data - Only show if we have market data and it's not regular hours */}
          {extendedMarketData?.trading_info?.market_state && 
           extendedMarketData.trading_info.market_state !== 'REGULAR' && 
           (extendedMarketData.trading_info.pre_market_price || extendedMarketData.trading_info.post_market_price) && (
            <div className="mb-4 p-3 bg-gray-900/50 rounded-lg border border-gray-600">
              <div className="text-xs text-gray-400 mb-2">Extended Hours</div>
              
              {/* Pre-market */}
              {extendedMarketData.trading_info.pre_market_price && (
                <div className="flex justify-between items-center mb-1">
                  <span className="text-gray-300">Pre-Market:</span>
                  <div className="text-right">
                    <span className="text-white font-mono">
                      ${extendedMarketData.trading_info.pre_market_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    {extendedMarketData.trading_info.pre_market_change_percent && (
                      <span className={cn(
                        "ml-2 text-xs",
                        extendedMarketData.trading_info.pre_market_change_percent >= 0 ? 'text-green-400' : 'text-red-400'
                      )}>
                        ({extendedMarketData.trading_info.pre_market_change_percent >= 0 ? '+' : ''}
                        {extendedMarketData.trading_info.pre_market_change_percent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%)
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              {/* Post-market */}
              {extendedMarketData.trading_info.post_market_price && (
                <div className="flex justify-between items-center mb-1">
                  <span className="text-gray-300">After Hours:</span>
                  <div className="text-right">
                    <span className="text-white font-mono">
                      ${extendedMarketData.trading_info.post_market_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    {extendedMarketData.trading_info.post_market_change_percent && (
                      <span className={cn(
                        "ml-2 text-xs",
                        extendedMarketData.trading_info.post_market_change_percent >= 0 ? 'text-green-400' : 'text-red-400'
                      )}>
                        ({extendedMarketData.trading_info.post_market_change_percent >= 0 ? '+' : ''}
                        {extendedMarketData.trading_info.post_market_change_percent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%)
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              {/* Market State */}
              <div className="text-[10px] text-gray-500 mt-1">
                {extendedMarketData.trading_info.market_state === 'PRE' && 'Pre-Market Trading'}
                {extendedMarketData.trading_info.market_state === 'POST' && 'After Hours Trading'}
                {extendedMarketData.trading_info.market_state === 'CLOSED' && 'Market Closed'}
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-gray-300 mb-4">
            {holding.is_option ? (
              <>
                <span>Underlying</span>
                <span className="text-right font-mono text-white">
                  {holding.underlying_symbol}
                </span>

                <span>Contract Type</span>
                <span className="text-right font-mono text-white">
                  {holding.option_type} ${holding.strike_price}
                </span>

                <span>Expiration</span>
                <span className="text-right font-mono text-white">
                  {formatExpirationDate(holding.expiration_date)}
                </span>

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
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex justify-center gap-2 pt-2">
            {onEditHolding && (
              <button
                onClick={handleEditClick}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                title="Edit holding"
              >
                <Edit className="h-3 w-3" />
                Edit
              </button>
            )}
            {onDeleteHolding && (
              <button
                onClick={handleDeleteClick}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                title="Delete holding"
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};

export default StockCard;