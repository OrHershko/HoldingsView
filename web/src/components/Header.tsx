import React from 'react';
import { Menu, LogOut, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import logo from '@/assets/Logo.png';

interface HeaderProps {
  toggleSidebar: () => void;
  isGuest?: boolean;
  selectedSymbol?: string | null;
  mobileView?: 'holdings' | 'details';
  onBackToHoldings?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  toggleSidebar, 
  isGuest,
  selectedSymbol,
  mobileView,
  onBackToHoldings
}) => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const showBackButton = mobileView === 'details' && selectedSymbol;

  return (
    <header className="flex justify-between items-center p-3 md:p-4 lg:p-5 mb-2 border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
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

      <div className="absolute left-1/2 -translate-x-1/2 pb-1 pt-1 justify-center items-center">
        <img
          src={logo}
          alt="Logo"
          className="w-30 h-14 flex-shrink-0 min-w-fit" 
        />
      </div>

      
      <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
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