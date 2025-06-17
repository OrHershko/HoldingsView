import React from 'react';
import { Bell, Menu, LogOut, UserCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

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
        {/* Mobile Navigation */}
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

        {/* Desktop/Tablet Menu Button */}
        <button 
          onClick={toggleSidebar}
          className="hidden md:block text-white hover:text-gray-300 transition-colors"
        >
          <Menu size={24} />
        </button>

        <div className="flex-1 min-w-0">
          {/* Mobile Title */}
          <div className="md:hidden">
            {showBackButton ? (
              <h1 className="text-lg font-bold text-white truncate">
                {selectedSymbol}
              </h1>
            ) : (
              <h1 className="text-lg font-bold text-white flex items-center">
                <UserCircle size={20} className="mr-2 opacity-80 flex-shrink-0" />
                <span className="truncate">
                  {isGuest ? 'Guest' : (currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Guest')}
                </span>
                {isGuest && (
                  <Badge variant="secondary" className="ml-2 text-xs py-0.5 px-1.5 bg-gray-700 text-gray-300 border-gray-600">
                    Guest
                  </Badge>
                )}
              </h1>
            )}
          </div>

          {/* Desktop Title */}
          <div className="hidden md:block">
            {isGuest ? (
              <h1 className="text-xl lg:text-2xl font-bold text-white flex items-center mb-2">
                <UserCircle size={28} className="mr-2 opacity-80" /> Guest User
                <Badge variant="secondary" className="ml-3 text-xs py-0.5 px-1.5 bg-gray-700 text-gray-300 border-gray-600">Guest Mode</Badge>
              </h1>
            ) : (
              <h1 className="text-xl lg:text-2xl font-bold text-white flex items-center mb-2">
                <UserCircle size={28} className="mr-2 opacity-80" /> 
                <span className="truncate">
                  {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Guest'}
                </span>
              </h1>
            )}
            <p className="text-sm text-gray-400 pr-4">
              {isGuest ? 'Explore the platform. Your data is local to this browser.' : "Welcome back, here's what's happening today"}
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
        {!isGuest && (
          <>
            <button className="text-gray-400 hover:text-white transition-colors p-1">
              <Bell size={18} className="md:w-5 md:h-5" />
            </button>
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