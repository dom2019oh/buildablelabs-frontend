import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Pricing from "./pages/Pricing";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Dashboard from "./pages/Dashboard";
import DashboardUsage from "./pages/DashboardUsage";
import DashboardBilling from "./pages/DashboardBilling";
import DashboardSettings from "./pages/DashboardSettings";
import DashboardProject from "./pages/DashboardProject";
import DashboardTemplates from "./pages/DashboardTemplates";
import DashboardComponents from "./pages/DashboardComponents";
import DashboardBackgrounds from "./pages/DashboardBackgrounds";
import Docs from "./pages/Docs";
import Explore from "./pages/Explore";
// Use the new backend-driven workspace (V2)
import ProjectWorkspaceV2 from "./components/workspace/ProjectWorkspaceV2";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import CookieConsent from "./components/CookieConsent";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <CookieConsent />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/log-in" element={<Login />} />
            <Route path="/sign-up" element={<SignUp />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/dashboard/usage" element={<ProtectedRoute><DashboardUsage /></ProtectedRoute>} />
            <Route path="/dashboard/billing" element={<ProtectedRoute><DashboardBilling /></ProtectedRoute>} />
            <Route path="/dashboard/settings" element={<ProtectedRoute><DashboardSettings /></ProtectedRoute>} />
            <Route path="/dashboard/project/:projectId" element={<ProtectedRoute><DashboardProject /></ProtectedRoute>} />
            {/* Library Routes - Templates public, Components/Backgrounds protected */}
            <Route path="/dashboard/templates" element={<DashboardTemplates />} />
            <Route path="/dashboard/components" element={<ProtectedRoute><DashboardComponents /></ProtectedRoute>} />
            <Route path="/dashboard/backgrounds" element={<ProtectedRoute><DashboardBackgrounds /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/docs" element={<Docs />} />
            <Route path="/explore" element={<Explore />} />
            {/* Use the new backend-driven workspace */}
            <Route path="/project/:projectId" element={<ProtectedRoute><ProjectWorkspaceV2 /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
