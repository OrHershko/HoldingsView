import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [activeNavItem, setActiveNavItem] = useState('home');
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'holdings' | 'details'>('holdings');

  const { currentUser, loading: authLoading } = useAuth();
  const location = useLocation();
  const isGuest = !currentUser && !authLoading;

  const toggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), []);

  const handleSelectStock = useCallback((symbol: string) => {
    setSelectedSymbol(symbol);
    if (window.innerWidth < 768) {
      setMobileView('details');
    }
  }, []);

  const resetState = () => {
    setSelectedSymbol(null);
    setMobileView('holdings');
    setSidebarOpen(false);
    setActiveNavItem('home');
  };

  // Clear selected symbol when navigating to different pages
  useEffect(() => {
    setSelectedSymbol(null);
    setMobileView('holdings');
  }, [location.pathname]);

  // Clone children and pass selectedSymbol as prop if it's the Index page
  const enhancedChildren = React.isValidElement(children) && location.pathname === '/' 
    ? React.cloneElement(children as React.ReactElement<{ headerSelectedSymbol?: string | null; onClearHeaderSelection?: () => void }>, { 
        headerSelectedSymbol: selectedSymbol,
        onClearHeaderSelection: () => setSelectedSymbol(null)
      })
    : children;

  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden">
      <div className="lg:hidden">
        <Sheet open={isSidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-64 p-0 bg-gray-800 border-gray-700">
            <VisuallyHidden.Root>
              <SheetTitle>Navigation Menu</SheetTitle>
              <SheetDescription>Main navigation and portfolio options</SheetDescription>
            </VisuallyHidden.Root>
            <Sidebar 
              setIsSidebarOpen={setSidebarOpen}
              activeItem={activeNavItem} 
              setActiveItem={setActiveNavItem} 
              resetState={resetState} 
            />
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex flex-col flex-1 min-w-0">
        <Header 
          toggleSidebar={toggleSidebar} 
          isGuest={isGuest} 
          onSelectStock={handleSelectStock}
          mobileView={mobileView}
          selectedSymbol={selectedSymbol}
          onBackToHoldings={() => {
            setMobileView('holdings');
            setSelectedSymbol(null);
          }}
        />
        
        <main className="flex-1 overflow-hidden">
          {enhancedChildren}
        </main>
      </div>
    </div>
  );
};

export default Layout;
