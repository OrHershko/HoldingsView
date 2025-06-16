import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePortfolio } from '@/hooks/useAppQueries';
import { EnrichedHolding, TransactionRead } from '@/types/api';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import PortfolioHeader from '@/components/dashboard/PortfolioHeader';
import HoldingsList from '@/components/dashboard/HoldingsList';
import StockDetailsView from '@/components/dashboard/StockDetailsView';
import AddTransactionDialog from '@/components/AddTransactionDialog';
import { toast } from '@/components/ui/sonner';

const FullPageLoader: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-900">
    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
  </div>
);

const Index: React.FC = () => {
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeNavItem, setActiveNavItem] = useState('home');
  const [isAddTransactionOpen, setAddTransactionOpen] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  
  const { currentUser, loading: authLoading } = useAuth();
  const isGuest = !currentUser && !authLoading;
  
  const { 
    data: portfolioData, 
    isLoading: portfolioLoading, 
    error: portfolioError 
  } = usePortfolio({ enabled: !isGuest });

  const holdings = useMemo(() => {
    return portfolioData?.holdings?.sort((a, b) => a.symbol.localeCompare(b.symbol)) || [];
  }, [portfolioData]);

  const transactionsForSelectedStock = useMemo(() => {
    if (!selectedSymbol || !portfolioData?.transactions) return [];
    return portfolioData.transactions.filter(t => t.symbol === selectedSymbol);
  }, [portfolioData?.transactions, selectedSymbol]);

  useEffect(() => {
    if (holdings && holdings.length > 0 && !selectedSymbol) {
      setSelectedSymbol(holdings[0].symbol);
    } else if (holdings && holdings.length === 0) {
      setSelectedSymbol(null);
    }
  }, [holdings, selectedSymbol]);
  
  const handleToggleMobileSidebar = useCallback(() => setMobileSidebarOpen(prev => !prev), []);
  const handleSelectStock = useCallback((symbol: string) => setSelectedSymbol(symbol), []);
  const handleOpenAddTransaction = () => setAddTransactionOpen(true);

  if (authLoading || (!isGuest && portfolioLoading && !portfolioData)) {
    return <FullPageLoader />;
  }

  if (portfolioError && !isGuest) {
      toast.error(`Failed to load portfolio: ${portfolioError.message || 'Unknown error'}`);
  }

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      <div className="hidden md:block md:w-64">
        <Sidebar activeItem={activeNavItem} setActiveItem={setActiveNavItem} />
      </div>

      <div className="flex flex-col flex-1 overflow-hidden">
        <Header toggleMobileSidebar={handleToggleMobileSidebar} isGuest={isGuest} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <ResizablePanelGroup direction="horizontal" className="h-full w-full">
            <ResizablePanel defaultSize={40} minSize={30}>
              <div className="flex flex-col h-full pr-4 space-y-4">
                <PortfolioHeader 
                  portfolio={portfolioData}
                  onAddStock={handleOpenAddTransaction}
                />
                <HoldingsList
                  holdings={holdings}
                  onSelectStock={handleSelectStock}
                  selectedSymbol={selectedSymbol}
                />
              </div>
            </ResizablePanel>
            
            <ResizableHandle withHandle />

            <ResizablePanel defaultSize={60} minSize={40}>
              <div className="h-full overflow-y-auto pl-4">
                <StockDetailsView 
                  symbol={selectedSymbol} 
                  transactions={transactionsForSelectedStock} 
                  portfolioId={portfolioData?.id} 
                />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </main>
      </div>

      <AddTransactionDialog
        isOpen={isAddTransactionOpen}
        onClose={() => setAddTransactionOpen(false)}
        portfolioId={portfolioData?.id}
        holdings={holdings || []}
      />
    </div>
  );
};

export default Index;