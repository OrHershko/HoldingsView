import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePortfolio } from '@/hooks/useAppQueries';
import { useDeleteTransaction } from '@/hooks/useAppMutations';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import PortfolioHeader from '@/components/dashboard/PortfolioHeader';
import HoldingsList from '@/components/dashboard/HoldingsList';
import StockDetailsView from '@/components/dashboard/StockDetailsView';
import AddTransactionDialog from '@/components/AddTransactionDialog';
import DeleteHoldingDialog from '@/components/DeleteHoldingDialog';
import EditHoldingDialog from '@/components/EditHoldingDialog';
import { toast } from '@/components/ui/sonner';
import { EnrichedHolding, TransactionRead } from '@/types/api';

const FullPageLoader: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-900">
    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
  </div>
);

interface IndexProps {
  headerSelectedSymbol?: string | null;
  onClearHeaderSelection?: () => void;
}

const Index: React.FC<IndexProps> = ({ headerSelectedSymbol, onClearHeaderSelection }) => {
  const [isAddTransactionOpen, setAddTransactionOpen] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'holdings' | 'details'>('holdings');
  const [chartContainerWidth, setChartContainerWidth] = useState(0);

  // Dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedHolding, setSelectedHolding] = useState<EnrichedHolding | null>(null);

  const observerRef = useRef<ResizeObserver | null>(null);

  // Handle symbol selection from header search
  useEffect(() => {
    if (headerSelectedSymbol) {
      setSelectedSymbol(headerSelectedSymbol);
      if (window.innerWidth < 768) {
        setMobileView('details');
      }
      // Clear the header selection after we've processed it
      onClearHeaderSelection?.();
    }
  }, [headerSelectedSymbol, onClearHeaderSelection]);

  const measuredRef = useCallback((node: HTMLDivElement | null) => {
    // Disconnect any existing observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
    
    // If we get a new node, set up a new observer
    if (node !== null) {
      const observer = new ResizeObserver(() => {
        if (node.clientWidth > 0) {
          setChartContainerWidth(node.clientWidth - 50);
        }
      });
      observer.observe(node);
      observerRef.current = observer;
      
      // Set initial width immediately
      if (node.clientWidth > 0) {
        setChartContainerWidth(node.clientWidth - 50);
      }
    }
  }, []);

  const { currentUser, loading: authLoading } = useAuth();
  const isGuest = !currentUser && !authLoading;
  
  const { 
    data: portfolioData, 
    isLoading: portfolioLoading, 
    error: portfolioError 
  } = usePortfolio({ enabled: !isGuest });

  const deleteTransactionMutation = useDeleteTransaction();

  const holdings = useMemo(() => {
    return portfolioData?.holdings?.sort((a, b) => a.symbol.localeCompare(b.symbol)) || [];
  }, [portfolioData]);

  const transactionsForSelectedStock = useMemo(() => {
    if (!selectedSymbol || !portfolioData?.transactions) return [];
    return portfolioData.transactions.filter(t => t.symbol === selectedSymbol);
  }, [portfolioData?.transactions, selectedSymbol]);

  const handleSelectStock = useCallback((symbol: string) => {
    setSelectedSymbol(symbol);
    if (window.innerWidth < 768) {
      setMobileView('details');
    }
  }, []);

  const handleEditHolding = useCallback((holding: EnrichedHolding) => {
    setSelectedHolding(holding);
    setEditDialogOpen(true);
  }, []);

  const handleDeleteHolding = useCallback((holding: EnrichedHolding) => {
    setSelectedHolding(holding);
    setDeleteDialogOpen(true);
  }, []);

  const handleConfirmDeleteHolding = useCallback(async (transactionIds: number[]) => {
    if (!portfolioData?.id) return;

    try {
      // Delete all transactions for this holding
      for (const transactionId of transactionIds) {
        await deleteTransactionMutation.mutateAsync({
          portfolioId: portfolioData.id,
          transactionId,
        });
      }
      
      toast.success(`Successfully deleted ${selectedHolding?.is_option ? 'option' : 'stock'} holding`);
      setDeleteDialogOpen(false);
      setSelectedHolding(null);
    } catch (error) {
      toast.error(`Failed to delete holding: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [portfolioData?.id, deleteTransactionMutation, selectedHolding]);

  const handleOpenAddTransaction = () => setAddTransactionOpen(true);

  if (authLoading || (!isGuest && portfolioLoading && !portfolioData)) {
    return <FullPageLoader />;
  }

  if (portfolioError && !isGuest) {
      toast.error(`Failed to load portfolio: ${portfolioError.message || 'Unknown error'}`);
  }

  return (
    <div className="h-full">
      <div className="hidden md:block h-full p-4 lg:p-6">
        <ResizablePanelGroup direction="horizontal" className="h-full w-full">
          <ResizablePanel defaultSize={35} minSize={0}>
            <div className="flex flex-col h-full pr-4 space-y-4 overflow-y-auto overflow-x-hidden">
              <PortfolioHeader 
                portfolio={portfolioData}
                onAddStock={handleOpenAddTransaction}
              />
              <HoldingsList
                holdings={holdings}
                onSelectStock={handleSelectStock}
                onEditHolding={handleEditHolding}
                onDeleteHolding={handleDeleteHolding}
              />
            </div>
          </ResizablePanel>
          
          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={65} minSize={0} className="min-w-0 overflow-hidden">
            <div ref={measuredRef} className="h-full overflow-y-auto p-2">
              <StockDetailsView 
                symbol={selectedSymbol} 
                transactions={transactionsForSelectedStock} 
                portfolioId={portfolioData?.id}
                containerWidth={chartContainerWidth}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <div className="md:hidden h-full flex flex-col overflow-y-auto">
        {mobileView === 'holdings' ? (
          <div className="flex-1">
            <div className="h-full flex flex-col space-y-4 p-2">
              <PortfolioHeader 
                portfolio={portfolioData}
                onAddStock={handleOpenAddTransaction}
              />
              <HoldingsList
                holdings={holdings}
                onSelectStock={handleSelectStock}
                onEditHolding={handleEditHolding}
                onDeleteHolding={handleDeleteHolding}
              />
            </div>
          </div>
        ) : (
          <div ref={measuredRef} className="flex-1 overflow-y-auto p-4">
            <StockDetailsView 
              symbol={selectedSymbol} 
              transactions={transactionsForSelectedStock} 
              portfolioId={portfolioData?.id}
              containerWidth={chartContainerWidth}
            />
          </div>
        )}
      </div>

      {/* Dialogs */}
      <AddTransactionDialog
        isOpen={isAddTransactionOpen}
        onClose={() => setAddTransactionOpen(false)}
        portfolioId={portfolioData?.id}
        holdings={holdings || []}
      />

      <DeleteHoldingDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setSelectedHolding(null);
        }}
        holding={selectedHolding}
        transactions={portfolioData?.transactions || []}
        onConfirmDelete={handleConfirmDeleteHolding}
      />

      <EditHoldingDialog
        isOpen={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setSelectedHolding(null);
        }}
        holding={selectedHolding}
        allTransactions={portfolioData?.transactions || []}
        portfolioId={portfolioData?.id || 0}
      />
    </div>
  );
};

export default Index;