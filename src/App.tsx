import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemedDialogsProvider } from "@/components/ui/themed-dialogs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { supabase } from "@/integrations/supabase/client";
import Index from "./pages/Index";

const NotFound = lazy(() => import("./pages/NotFound"));
const Admin = lazy(() => import("./pages/Admin"));
const Portal = lazy(() => import("./pages/Portal"));
const PortalAuth = lazy(() => import("./pages/PortalAuth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const OrderSuccess = lazy(() => import("./pages/OrderSuccess"));
const ProjectRequirements = lazy(() => import("./pages/ProjectRequirements"));
const EditRequest = lazy(() => import("./pages/EditRequest"));
const CustomerAuth = lazy(() => import("./pages/CustomerAuth"));
const CustomerPortal = lazy(() => import("./pages/CustomerPortal"));
const Legal = lazy(() => import("./pages/Legal"));
const VisionPreview = lazy(() => import("./pages/VisionPreview"));
const AuthHandoff = lazy(() => import("./pages/AuthHandoff"));
const ServicePage = lazy(() => import("./pages/ServicePage"));
const ServicesIndex = lazy(() => import("./pages/ServicesIndex"));
const CandidateApply = lazy(() => import("./pages/CandidateApply"));
const CandidatePortal = lazy(() => import("./pages/CandidatePortal"));
const VacancyRespond = lazy(() => import("./pages/VacancyRespond"));
const PackageDetail = lazy(() => import("./pages/PackageDetail"));
const Packages = lazy(() => import("./pages/Packages"));
const Portfolio = lazy(() => import("./pages/Portfolio"));
const GetStarted = lazy(() => import("./pages/GetStarted"));
const CallRoom = lazy(() => import("./pages/CallRoom"));
const ByowLanding = lazy(() => import("./pages/ByowLanding"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

const AuthRedirectHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const authParams = new URLSearchParams(window.location.hash.replace(/^#/, "") || window.location.search);
    const authType = authParams.get("type");

    if ((authType === "invite" || authType === "recovery") && window.location.pathname !== "/reset-password") {
      window.setTimeout(() => navigate("/reset-password", { replace: true }), 150);
      return;
    }

    // First-load only: send already-authenticated users straight to the customer portal
    const FLAG = "pixcellor:home-redirect-checked";
    if (sessionStorage.getItem(FLAG)) return;
    sessionStorage.setItem(FLAG, "1");

    if (window.location.pathname !== "/") return;

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        navigate("/customer-portal", { replace: true });
      }
    });
  }, [navigate]);

  return null;
};

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background text-foreground/60 text-sm">
    Loading…
  </div>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemedDialogsProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthRedirectHandler />
          <Suspense fallback={<RouteFallback />}>
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
              <Route path="/auth/handoff" element={<AuthHandoff />} />
              <Route path="/services" element={<ServicesIndex />} />
              <Route path="/services/:slug" element={<ServicePage />} />
              <Route path="/jobs/apply" element={<CandidateApply />} />
              <Route path="/me" element={<CandidatePortal />} />
              <Route path="/candidate-portal" element={<CandidatePortal />} />
              <Route path="/vacancy/respond" element={<VacancyRespond />} />
              <Route path="/packages" element={<Packages />} />
              <Route path="/packages/:slug" element={<PackageDetail />} />
              <Route path="/portfolio" element={<Portfolio />} />
              <Route path="/get-started" element={<GetStarted />} />
              <Route path="/call/:bookingId" element={<CallRoom />} />
              <Route path="/byow/login" element={<ByowLogin />} />
              <Route path="/byow" element={<ByowDashboard />} />
              <Route path="/byow/site/:siteId" element={<ByowBuilder />} />
              <Route path="/byow-admin" element={<ByowAdmin />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        </ThemedDialogsProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
