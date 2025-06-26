import React, { useState, useRef, useEffect } from 'react';
import { Menu, LogOut, ArrowLeft, Search as SearchIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import logo from '@/assets/Logo.png';
import SearchBar from './SearchBar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';

interface HeaderProps {
  toggleSidebar: () => void;
  isGuest?: boolean;
  selectedSymbol?: string | null;
  mobileView?: 'holdings' | 'details';
  onBackToHoldings?: () => void;
  onSelectStock?: (symbol: string) => void;
}

const Header: React.FC<HeaderProps> = ({ 
  toggleSidebar, 
  isGuest,
  selectedSymbol,
  mobileView,
  onBackToHoldings,
  onSelectStock
}) => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const showBackButton = mobileView === 'details' && selectedSymbol;

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  return (
    <header className="flex justify-between items-center p-3 md:p-4 lg:p-5 mb-2 border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm min-w-[300px]">
      <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
        <div className="flex items-center gap-2 md:hidden">
          {showBackButton ? (
            <button 
              onClick={onBackToHoldings}
              className="text-white hover:text-gray-300 transition-colors p-1"
            >
              <ArrowLeft size={20} />
            </button>
          ) : (
            <button 
              onClick={toggleSidebar}
              className="text-white hover:text-gray-300 transition-colors p-1"
            >
              <Menu size={20} />
            </button>
          )}
        </div>

        <button 
          onClick={toggleSidebar}
          className="hidden md:block text-white hover:text-gray-300 transition-colors"
        >
          <Menu size={24} />
        </button>
      </div>

      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3 pb-1 pt-1">
        <img
          src={logo}
          alt="Logo"
          className="w-30 h-14 mb-1 min-w-[130px]" 
        />
      </div>

      <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
       {!isGuest && onSelectStock && (
          <Popover open={searchOpen} onOpenChange={setSearchOpen}>
            <PopoverTrigger asChild>
              <button
                className="text-white hover:text-gray-300 transition-colors p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Search stocks"
              >
                <SearchIcon size={22}/>
              </button>
            </PopoverTrigger>
            <PopoverContent align="center" className="p-2 bg-gray-900/50 backdrop-blur-sm">
              <SearchBar onSelect={(symbol) => {
                setSearchOpen(false);
                onSelectStock(symbol);
              }} inputRef={searchInputRef} />
            </PopoverContent>
          </Popover>
        )}
        {!isGuest && (
          <>
            <button 
              onClick={handleLogout}
              className="text-gray-400 hover:text-white transition-colors flex items-center gap-1 p-1"
              title="Log out"
            >
              <LogOut size={18} className="md:w-5 md:h-5" />
            </button>
          </>
        )}
        {isGuest && (
          <div className="flex items-center gap-2">
             <Button 
               variant="outline" 
               size="sm" 
               onClick={() => navigate('/login')} 
               className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white text-xs md:text-sm px-2 md:px-3"
             >
               Login
             </Button>
             <Button 
               size="sm" 
               onClick={() => navigate('/register')} 
               className="bg-blue-600 hover:bg-blue-700 text-white text-xs md:text-sm px-2 md:px-3"
             >
               Sign Up
             </Button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;