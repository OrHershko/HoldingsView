import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePortfolio } from '@/hooks/useAppQueries';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import PortfolioHeader from '@/components/dashboard/PortfolioHeader';
import HoldingsList from '@/components/dashboard/HoldingsList';
import StockDetailsView from '@/components/dashboard/StockDetailsView';
import AddTransactionDialog from '@/components/AddTransactionDialog';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';

const FullPageLoader: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-900">
    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
  </div>
);

const Index: React.FC = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [activeNavItem, setActiveNavItem] = useState('home');
  const [isAddTransactionOpen, setAddTransactionOpen] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'holdings' | 'details'>('holdings');
  
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
  
  const toggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), []);
  
  const handleSelectStock = useCallback((symbol: string) => {
    setSelectedSymbol(symbol);
    if (window.innerWidth < 768) {
      setMobileView('details');
    }
  }, []);
  
  const handleOpenAddTransaction = () => setAddTransactionOpen(true);

  const handleBackToHoldings = () => setMobileView('holdings');

  if (authLoading || (!isGuest && portfolioLoading && !portfolioData)) {
    return <FullPageLoader />;
  }

  if (portfolioError && !isGuest) {
      toast.error(`Failed to load portfolio: ${portfolioError.message || 'Unknown error'}`);
  }

  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden">
      <div className="lg:hidden">
        <Sheet open={isSidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-64 p-0 bg-gray-800 border-gray-700">
            <Sidebar activeItem={activeNavItem} setActiveItem={setActiveNavItem} />
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex flex-col flex-1 min-w-0">
        <Header 
          toggleSidebar={toggleSidebar} 
          isGuest={isGuest} 
          selectedSymbol={selectedSymbol}
          mobileView={mobileView}
          onBackToHoldings={handleBackToHoldings}
        />
        
        <main className="flex-1 overflow-hidden">
          <div className="hidden md:block h-full p-4 lg:p-6">
            <ResizablePanelGroup direction="horizontal" className="h-full w-full">
              <ResizablePanel defaultSize={35} minSize={0}>
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

              <ResizablePanel defaultSize={65} minSize={20} className="min-w-0 overflow-hidden">
                <div className="h-full overflow-y-auto pl-4">
                  <StockDetailsView 
                    symbol={selectedSymbol} 
                    transactions={transactionsForSelectedStock} 
                    portfolioId={portfolioData?.id} 
                  />
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>

          <div className="md:hidden h-full flex flex-col">
            {mobileView === 'holdings' ? (
              <div className="flex-1 overflow-hidden p-4">
                <div className="h-full flex flex-col space-y-4">
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
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto overflow-x-hidden p-4">
                <StockDetailsView 
                  symbol={selectedSymbol} 
                  transactions={transactionsForSelectedStock} 
                  portfolioId={portfolioData?.id} 
                />
              </div>
            )}
          </div>
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