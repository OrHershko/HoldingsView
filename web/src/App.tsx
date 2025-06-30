import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Login from "./components/auth/Login";
import Register from "./components/auth/Register";
import ForgotPassword from "./components/auth/ForgotPassword";
import Index from "./pages/Index";
import PublicRoute from "./components/auth/PublicRoute";
import NotFound from "./pages/NotFound";
import Watchlist from "./pages/Watchlist";
import Layout from "./components/Layout";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
      
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <Layout>
              <Index />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/stock/:symbol" 
        element={
          <ProtectedRoute>
            <Layout>
              <Index />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/watchlist" 
        element={
          <ProtectedRoute>
            <Layout>
              <Watchlist />
            </Layout>
          </ProtectedRoute>
        } 
      />

      <Route path="*" element={<NotFound />} /> 
    </Routes>
  );
};


const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;