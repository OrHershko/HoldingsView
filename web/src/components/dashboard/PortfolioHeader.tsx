import React from 'react';
import { Plus, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Portfolio } from '@/types/api';

interface PortfolioHeaderProps {
  portfolio?: Portfolio;
  onAddStock: () => void;
}

const PortfolioHeader: React.FC<PortfolioHeaderProps> = ({ portfolio, onAddStock }) => {
  const totalValue = portfolio?.total_market_value || 0;
  const totalGainLoss = portfolio?.total_unrealized_gain_loss || 0;
  const totalGainLossPercent = portfolio?.total_unrealized_gain_loss_percent || 0;

  const totalGainLossToday = (portfolio?.holdings ?? [])
  .reduce((acc, holding) => acc + (holding.todays_change ?? 0), 0);

  const totalMarketValueYesterday = (portfolio?.holdings ?? [])
  .reduce((acc, holding) => {
    const yesterdayPrice = (holding.current_price ?? 0) - (holding.todays_change ?? 0);
    return acc + (yesterdayPrice * holding.quantity);
  }, 0);

  const totalGainLossTodayPercent = totalMarketValueYesterday !== 0
  ? ((totalValue - totalMarketValueYesterday) / totalMarketValueYesterday) * 100
  : 0;

  const isTodayPositive = totalGainLossToday >= 0;
  const isTotalPositive = totalGainLoss >= 0;

  return (
    <Card className="bg-gray-800 border-gray-700 min-w-[380px]">
      <CardContent className="p-4 md:p-6">
        {/* Header with title and add button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white">Portfolio</h1>
          </div>
          <Button 
            onClick={onAddStock}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Transaction
          </Button>
        </div>

        {/* Portfolio metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
          {/* Total Value */}
          <div className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg">
            <div className="p-2 bg-blue-600/20 rounded-lg">
              <DollarSign className="h-5 w-5 text-blue-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Total Value</p>
              <p className="text-lg md:text-xl font-bold text-white truncate">
                ${totalValue.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Total Gain/Loss */}
          <div className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg min-w-fit">
            <div className={`p-2 rounded-lg ${isTotalPositive ? 'bg-green-600/20' : 'bg-red-600/20'}`}>
              {isTotalPositive ? (
                <TrendingUp className="h-5 w-5 text-green-400" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-400" />
              )}
            </div>
            <div className="min-w-0 flex-1 ">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Total P&L</p>
              <div className="flex flex-wrap items-center gap-2">
                <p className={`pt-1 text-lg md:text-xl font-bold ${isTotalPositive ? 'text-green-400' : 'text-red-400'}`}>
                  {isTotalPositive ? '+' : ''}${totalGainLoss?.toFixed(2)}
                </p>
                <Badge 
                  variant="secondary" 
                  className={`text-xs px-2 py-0.5 ${
                    isTotalPositive 
                      ? 'bg-green-600/20 text-green-400 border-green-600/30' 
                      : 'bg-red-600/20 text-red-400 border-red-600/30'
                  }`}
                >
                  {isTotalPositive ? '+' : ''}{totalGainLossPercent?.toFixed(2)}%
                </Badge>
              </div>
            </div>
          </div>
          {/* Today's Gain/Loss */}
          <div className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg min-w-fit">
            <div className={`p-2 rounded-lg ${isTodayPositive ? 'bg-green-600/20' : 'bg-red-600/20'}`}>
              {isTodayPositive ? (
                <TrendingUp className="h-5 w-5 text-green-400" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-400" />
              )}
            </div>
            <div className="min-w-0 flex-1 ">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Today's P&L</p>
              <div className="flex flex-wrap items-center gap-2">
                <p className={`pt-1 text-lg md:text-xl font-bold ${isTodayPositive ? 'text-green-400' : 'text-red-400'}`}>
                  {isTodayPositive ? '+' : '-'}${Math.abs(totalGainLossToday)?.toFixed(2)}
                </p>
                <Badge 
                  variant="secondary" 
                  className={`text-xs px-2 py-0.5 ${
                    isTodayPositive 
                      ? 'bg-green-600/20 text-green-400 border-green-600/30' 
                      : 'bg-red-600/20 text-red-400 border-red-600/30'
                  }`}
                >
                  {isTodayPositive ? '+' : ''}{totalGainLossTodayPercent?.toFixed(2)}%
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PortfolioHeader;