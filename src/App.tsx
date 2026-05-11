import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";
import Portal from "./pages/Portal";
import PortalAuth from "./pages/PortalAuth";
import ResetPassword from "./pages/ResetPassword";
import Unsubscribe from "./pages/Unsubscribe";
import OrderSuccess from "./pages/OrderSuccess";
import ProjectRequirements from "./pages/ProjectRequirements";
import EditRequest from "./pages/EditRequest";
import CustomerAuth from "./pages/CustomerAuth";
import CustomerPortal from "./pages/CustomerPortal";
import Legal from "./pages/Legal";
import VisionPreview from "./pages/VisionPreview";
import AuthHandoff from "./pages/AuthHandoff";

const queryClient = new QueryClient();

const AuthRedirectHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const authParams = new URLSearchParams(window.location.hash.replace(/^#/, "") || window.location.search);
    const authType = authParams.get("type");

    if ((authType === "invite" || authType === "recovery") && window.location.pathname !== "/reset-password") {
      window.setTimeout(() => navigate("/reset-password", { replace: true }), 150);
    }
  }, [navigate]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthRedirectHandler />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/portal" element={<Portal />} />
          <Route path="/portal-login" element={<PortalAuth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/unsubscribe" element={<Unsubscribe />} />
          <Route path="/order-success" element={<OrderSuccess />} />
          <Route path="/project-requirements" element={<ProjectRequirements />} />
          <Route path="/edit-request" element={<EditRequest />} />
          <Route path="/customer-login" element={<CustomerAuth />} />
          <Route path="/customer-portal" element={<CustomerPortal />} />
          <Route path="/legal" element={<Legal />} />
          <Route path="/legal/:doc" element={<Legal />} />
          <Route path="/preview/:slug" element={<VisionPreview />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
