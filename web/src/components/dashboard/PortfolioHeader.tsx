import React from "react";
import { Button } from "@/components/ui/button";
import { Portfolio } from "@/types/api";
import { TrendingUp, TrendingDown, Wallet, Briefcase, Plus } from 'lucide-react';

interface PortfolioHeaderProps {
  portfolio: Portfolio | undefined;
  onAddStock: () => void;
}

const PortfolioHeader: React.FC<PortfolioHeaderProps> = ({ portfolio, onAddStock }) => {
  const summary = {
    totalValue: portfolio?.total_market_value || 0,
    totalGain: portfolio?.total_unrealized_gain_loss || 0,
    totalGainPercent: portfolio?.total_unrealized_gain_loss_percent || 0,
  };
  const isPositiveGain = summary.totalGain >= 0;

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">{portfolio?.name || 'Portfolio'}</h1>
        <Button onClick={onAddStock} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" /> Add Transaction
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-white">
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="flex items-center text-gray-400 text-sm mb-1 ">
            <Briefcase className="h-4 w-4 mr-2" />
            <span>Total Value</span>
          </div>
          <p className="text-2xl font-bold">${summary.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg min-w-60">
          <div className="flex items-center text-gray-400 text-sm mb-1">
            {isPositiveGain ? <TrendingUp className="h-4 w-4 mr-2 text-green-500" /> : <TrendingDown className="h-4 w-4 mr-2 text-red-500" />}
            <span>Total Gain / Loss</span>
          </div>
          <p className={`text-2xl font-bold ${isPositiveGain ? 'text-green-500' : 'text-red-500'}`}>
            {summary.totalGain.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
            <span className="text-lg ml-2">({summary.totalGainPercent.toFixed(2)}%)</span>
          </p>
        </div>
      </div>
    </>
  );
};

export default PortfolioHeader;