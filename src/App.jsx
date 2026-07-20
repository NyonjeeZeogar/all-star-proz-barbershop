import { Navigate, Route, Routes } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";

import { Toaster } from "@/components/ui/toaster";
import { queryClientInstance } from "@/lib/query-client";
import { AuthProvider, useAuth } from "@/lib/AuthContext";

import PageNotFound from "@/lib/PageNotFound";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";
import ScrollToTop from "@/components/ScrollToTop";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleRoute from "@/components/RoleRoute";
import SiteLayout from "@/components/site/SiteLayout";

import Home from "@/pages/Home";
import Teams from "@/pages/Teams";
import TeamMember from "@/pages/TeamMember";
import Locations from "@/pages/Locations";
import LocationDetail from "@/pages/LocationDetail";
import Services from "@/pages/Services";
import Contact from "@/pages/Contact";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";
import MyBookings from "@/pages/MyBookings";
import BarberPortal from "@/pages/BarberPortal";
import AdminDashboard from "@/pages/AdminDashboard";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";

function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
    </div>
  );
}

function AuthenticatedApp() {
  const {
    isLoadingAuth,
    isLoadingPublicSettings,
    authError,
  } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return <LoadingScreen />;
  }

  if (authError?.type === "user_not_registered") {
    return <UserNotRegisteredError />;
  }

  return (
    <>
      <ScrollToTop />

      <Routes>
        {/* Authentication pages */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />
        <Route
          path="/reset-password"
          element={<ResetPassword />}
        />

        {/* Main site */}
        <Route element={<SiteLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/teams" element={<Teams />} />
          <Route
            path="/teams/:slug"
            element={<TeamMember />}
          />
          <Route path="/locations" element={<Locations />} />
          <Route
            path="/locations/new-hope"
            element={<LocationDetail />}
          />
          <Route path="/services" element={<Services />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />

          {/* Any authenticated customer */}
          <Route
            element={
              <ProtectedRoute
                unauthenticatedElement={
                  <Navigate to="/login" replace />
                }
              />
            }
          >
            <Route
              path="/bookings"
              element={<MyBookings />}
            />

            {/* Barber accounts only */}
            <Route
              element={<RoleRoute roles={["barber"]} />}
            >
              <Route
                path="/portal"
                element={<BarberPortal />}
              />
            </Route>

            {/* Admin accounts only */}
            <Route
              element={<RoleRoute roles={["admin"]} />}
            >
              <Route
                path="/admin"
                element={<AdminDashboard />}
              />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <AuthProvider>
        <AuthenticatedApp />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
