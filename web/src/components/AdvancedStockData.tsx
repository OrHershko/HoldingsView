import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  Target, 
  BarChart3,
  PieChart,
  Activity,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { EnrichedMarketData } from '@/types/api';
import { cn } from '@/lib/utils';

interface AdvancedStockDataProps {
  stockData: EnrichedMarketData;
}

const AdvancedStockData: React.FC<AdvancedStockDataProps> = ({ stockData }) => {
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    valuation: false,
    financial: false,
    technical: false,
    trading: false,
    analyst: false
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const formatNumber = (value: number | null, prefix = '', suffix = '') => {
    if (value === null || value === undefined) return 'N/A';
    return `${prefix}${value.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}${suffix}`;
  };

  const formatLargeNumber = (value: number | null, prefix = '$') => {
    if (value === null || value === undefined) return 'N/A';
    
    if (Math.abs(value) >= 1e12) {
      return `${prefix}${(value / 1e12).toFixed(2)}T`;
    } else if (Math.abs(value) >= 1e9) {
      return `${prefix}${(value / 1e9).toFixed(2)}B`;
    } else if (Math.abs(value) >= 1e6) {
      return `${prefix}${(value / 1e6).toFixed(2)}M`;
    } else if (Math.abs(value) >= 1e3) {
      return `${prefix}${(value / 1e3).toFixed(2)}K`;
    }
    return formatNumber(value, prefix);
  };

  const formatPercentage = (value: number | null) => {
    if (value === null || value === undefined) return 'N/A';
    return `${value.toFixed(2)}%`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    } catch {
      return 'N/A';
    }
  };

  const getRecommendationColor = (recommendation: string | null) => {
    if (!recommendation) return 'bg-gray-500';
    const rec = recommendation.toLowerCase();
    if (rec.includes('buy') || rec.includes('strong buy')) return 'bg-green-600';
    if (rec.includes('sell') || rec.includes('strong sell')) return 'bg-red-600';
    if (rec.includes('hold')) return 'bg-yellow-600';
    return 'bg-gray-500';
  };

  const DataRow = ({ label, value, icon: Icon }: { 
    label: string; 
    value: string; 
    icon?: React.ComponentType<{ className?: string }> 
  }) => (
    <div className="flex justify-between items-center py-1.5">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-gray-400" />}
        <span className="text-gray-300 text-sm">{label}</span>
      </div>
      <span className="text-white font-mono text-sm">{value}</span>
    </div>
  );

  const SectionCard = ({ 
    title, 
    icon: Icon, 
    sectionKey, 
    children 
  }: { 
    title: string; 
    icon: React.ComponentType<{ className?: string }>; 
    sectionKey: string; 
    children: React.ReactNode;
  }) => (
    <Card className="bg-gray-800 border-gray-700 max-h-fit">
      <CardHeader className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-blue-400" />
            <CardTitle className="text-white text-lg">{title}</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleSection(sectionKey)}
            className="text-gray-400 hover:text-white"
          >
            {expandedSections[sectionKey] ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      {expandedSections[sectionKey] && (
        <CardContent className="pt-0">
          {children}
        </CardContent>
      )}
    </Card>
  );

  return (
    <div className="space-y-4">
      {/* Company Overview */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-400" />
            Company Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
            <DataRow label="Company Name" value={stockData.long_name || stockData.short_name || 'N/A'} />
            <DataRow label="Sector" value={stockData.fundamentals.sector || 'N/A'} />
            <DataRow label="Industry" value={stockData.fundamentals.industry || 'N/A'} />
            <DataRow label="Market Cap" value={formatLargeNumber(stockData.fundamentals.market_cap)} />
          </div>
          {stockData.fundamentals.description && (
            <div className="mt-4 p-3 bg-gray-900/50 rounded-lg max-h-[240px] overflow-y-auto">
              <p className="text-gray-300 text-md leading-relaxed">
                {stockData.fundamentals.description}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Valuation Metrics */}
        <SectionCard title="Valuation Metrics" icon={DollarSign} sectionKey="valuation">
          <div className="space-y-2">
            <DataRow label="P/E Ratio (TTM)" value={formatNumber(stockData.fundamentals.pe_ratio)} />
            <DataRow label="Forward P/E" value={formatNumber(stockData.fundamentals.forward_pe_ratio)} />
            <DataRow label="Price/Book" value={formatNumber(stockData.fundamentals.price_to_book_ratio)} />
            <DataRow label="Price/Sales" value={formatNumber(stockData.fundamentals.price_to_sales_ratio)} />
            <DataRow label="EPS (TTM)" value={formatNumber(stockData.fundamentals.eps, '$')} />
            <DataRow label="Beta" value={formatNumber(stockData.fundamentals.beta)} />
          </div>
        </SectionCard>

        {/* Financial Health */}
        <SectionCard title="Financial Health" icon={PieChart} sectionKey="financial">
          <div className="space-y-2">
            <DataRow label="Profit Margins" value={formatPercentage(stockData.fundamentals.profit_margins)} />
            <DataRow label="Return on Equity" value={formatPercentage(stockData.fundamentals.return_on_equity)} />
            <DataRow label="Total Cash" value={formatLargeNumber(stockData.fundamentals.total_cash)} />
            <DataRow label="Total Debt" value={formatLargeNumber(stockData.fundamentals.total_debt)} />
            <DataRow label="Free Cash Flow" value={formatLargeNumber(stockData.fundamentals.free_cashflow)} />
            <DataRow label="Dividend Yield" value={formatPercentage(stockData.fundamentals.dividend_yield)} />
            <DataRow label="Payout Ratio" value={formatPercentage(stockData.fundamentals.payout_ratio)} />
          </div>
        </SectionCard>

        {/* Technical Indicators */}
        <SectionCard title="Technical Indicators" icon={TrendingUp} sectionKey="technical">
          <div className="space-y-2">
            <DataRow label="RSI (14)" value={formatNumber(stockData.technicals.rsi_14)} />
            <DataRow label="SMA 20" value={formatNumber(stockData.technicals.sma_20, '$')} />
            <DataRow label="SMA 50" value={formatNumber(stockData.technicals.sma_50, '$')} />
            <DataRow label="SMA 200" value={formatNumber(stockData.technicals.sma_200, '$')} />
            <DataRow label="MACD Line" value={formatNumber(stockData.technicals.macd_line)} />
            <DataRow label="MACD Signal" value={formatNumber(stockData.technicals.macd_signal)} />
            <DataRow label="Bollinger Upper" value={formatNumber(stockData.technicals.bollinger_upper, '$')} />
            <DataRow label="Bollinger Lower" value={formatNumber(stockData.technicals.bollinger_lower, '$')} />
          </div>
        </SectionCard>

        {/* Trading Information */}
        <SectionCard title="Trading Information" icon={BarChart3} sectionKey="trading">
          <div className="space-y-2">
            <DataRow label="52 Week High" value={formatNumber(stockData.fundamentals.week_52_high, '$')} />
            <DataRow label="52 Week Low" value={formatNumber(stockData.fundamentals.week_52_low, '$')} />
            {stockData.fundamentals.earnings_date && (
              <DataRow 
                label="Next Earnings" 
                value={formatDate(stockData.fundamentals.earnings_date)} 
                icon={Calendar}
              />
            )}
          </div>
        </SectionCard>
      </div>

      {/* Analyst Information */}
      {(stockData.fundamentals.analyst_recommendation || 
        stockData.fundamentals.analyst_target_price || 
        stockData.fundamentals.number_of_analyst_opinions) && (
        <SectionCard title="Analyst Information" icon={Target} sectionKey="analyst">
          <div className="space-y-2">
            {stockData.fundamentals.analyst_recommendation && (
              <div className="flex justify-between items-center pb-1">
                <span className="text-gray-300 text-sm">Recommendation</span>
                <Badge className={cn("text-white", getRecommendationColor(stockData.fundamentals.analyst_recommendation))}>
                  {stockData.fundamentals.analyst_recommendation.toUpperCase()}
                </Badge>
              </div>
            )}
            <DataRow 
              label="Average Target Price" 
              value={formatNumber(stockData.fundamentals.analyst_target_price, '$')} 
            />
            <DataRow 
              label="Analyst Opinions" 
              value={stockData.fundamentals.number_of_analyst_opinions?.toString() || 'N/A'} 
            />
          </div>
        </SectionCard>
      )}
    </div>
  );
};

export default AdvancedStockData; 