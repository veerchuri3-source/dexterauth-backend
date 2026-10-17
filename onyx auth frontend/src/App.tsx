import { lazy, Suspense, useState, useEffect } from "react";
import { Toaster } from "./components/ui/toaster";
import { Toaster as Sonner } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { DialogProvider } from "./components/providers/dialog-provider";
import ClickSpark from "./components/ClickSpark";

// Home (the crawl target) stays eager so the landing page renders fast and
// complete for crawlers + LCP. Every other route is a lazy chunk so the
// initial bundle stays small and Core Web Vitals (LCP/FCP/TBT) stay green.
// A wrapper around React.lazy that catches chunk loading errors (which happen
// when a user has a cached index.html but the server has a new build with new chunk hashes).
// It forcefully reloads the page to get the fresh index.html.
const lazyWithRetry = (componentImport: () => Promise<any>) =>
  lazy(async () => {
    try {
      return await componentImport();
    } catch (error: any) {
      if (error.message && error.message.includes("Failed to fetch dynamically imported module")) {
        console.warn("Chunk load error detected. Reloading page to fetch new version...");
        window.location.reload();
      }
      throw error;
    }
  });

import Home from "./pages/Home";
const Login = lazyWithRetry(() => import("./pages/Login"));
const Register = lazyWithRetry(() => import("./pages/Register"));
const ForgotPassword = lazyWithRetry(() => import("./pages/ForgotPassword"));
const Dashboard = lazyWithRetry(() => import("./pages/Dashboard"));
const AppDetails = lazyWithRetry(() => import("./pages/AppDetails"));
const AdminPanel = lazyWithRetry(() => import("./pages/AdminPanel"));
const Checkout = lazyWithRetry(() => import("./pages/Checkout"));
const CheckoutSuccess = lazyWithRetry(() => import("./pages/CheckoutSuccess"));
const CustomerPanel = lazyWithRetry(() => import("./pages/customer/CustomerPanel"));
const Docs = lazyWithRetry(() => import("./pages/Docs"));
const SystemHealth = lazyWithRetry(() => import("./pages/SystemHealth"));
const About = lazyWithRetry(() => import("./pages/About"));
const Roadmap = lazyWithRetry(() => import("./pages/Roadmap"));
const Changelog = lazyWithRetry(() => import("./pages/Changelog"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const Terms = lazyWithRetry(() => import("./pages/Terms"));
const Privacy = lazyWithRetry(() => import("./pages/Privacy"));
const Pricing = lazyWithRetry(() => import("./pages/Pricing"));

import { devApi } from "./lib/api";
import { useAuth } from "./contexts/AuthContext";
import { MaintenanceMode } from "./components/MaintenanceMode";
import GoogleOneTap from "./components/GoogleOneTap";

const AppContent = () => {
  const { user, loading } = useAuth();
  const [maintenance, setMaintenance] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState("");
  const [contacts, setContacts] = useState({ email: "", discord: "" });

  useEffect(() => {
    devApi.getPublicPlatformSettings()
      .then((res: any) => {
        if (res.status === 'success' && res.data) {
          setMaintenance(!!res.data.maintenanceMode);
          setMaintenanceMsg(res.data.maintenanceMessage || "");
          setContacts({
            email: res.data.contactEmail || "",
            discord: res.data.discordInvite || ""
          });
        }
      })
      .catch(() => {});
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (maintenance && user?.role !== 'master_admin') {
    return (
      <MaintenanceMode 
        message={maintenanceMsg} 
        contactEmail={contacts.email} 
        discordInvite={contacts.discord} 
      />
    );
  }

  return (
    <>
      <GoogleOneTap />
      <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Home />} />
      <Route path="/docs/*" element={<Docs />} />
      <Route path="/status" element={<SystemHealth />} />
      <Route path="/about" element={<About />} />
      <Route path="/roadmap" element={<Roadmap />} />
      <Route path="/changelog" element={<Changelog />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/terms.html" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/privacy.html" element={<Privacy />} />

      <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/app/:id" element={<AppDetails />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/checkout/:planName" element={<Checkout />} />
          <Route path="/checkout/success" element={<CheckoutSuccess />} />
      </Route>

      {/* Customer Web Panel Routes */}
      <Route path="/panel/:ownerUsername/:appName/*" element={<CustomerPanel />} />

      {/* Fallback */}
      <Route path="*" element={<NotFound />} />
    </Routes>
    </>
  );
};

const queryClient = new QueryClient();

const App = () => {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const sync = () => setIsDark(document.documentElement.classList.contains("dark"));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProvider>
            <DialogProvider>
              {/* ClickSpark is mounted ONCE at the app root so a click spark
                  burst fires anywhere in the app, on every route. It renders a
                  fixed, full-viewport overlay canvas (pointer-events-none) so it
                  never affects layout, and its spark layer sits below the actual
                  UI (z-index stacking handled inside the component). */}
              <ClickSpark
                sparkColor={isDark ? "#fff" : "#ef4444"}
                sparkSize={10}
                sparkRadius={15}
                sparkCount={8}
                duration={400}
              >
                <Toaster />
                <Sonner />
                <Suspense
                  fallback={
                    <div className="flex min-h-screen items-center justify-center bg-background">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    </div>
                  }
                >
                  <AppContent />
                </Suspense>
              </ClickSpark>
            </DialogProvider>
          </AuthProvider>
        </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
