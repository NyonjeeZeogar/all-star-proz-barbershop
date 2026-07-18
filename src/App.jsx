import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";

import {
  HashRouter as Router,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import PageNotFound from "@/lib/PageNotFound";
import { AuthProvider } from "@/lib/AuthContext";

import ScrollToTop from "@/components/ScrollToTop";
import SiteLayout from "@/components/site/SiteLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import BarberRoute from "@/components/BarberRoute";

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

import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";

function AuthenticatedApp() {
  return (
    <Routes>
      {/* Public authentication routes */}
      <Route path="/login" element={<Login />} />

      <Route
        path="/register"
        element={<Register />}
      />

      <Route
        path="/forgot-password"
        element={<ForgotPassword />}
      />

      <Route
        path="/reset-password"
        element={<ResetPassword />}
      />

      {/* Main website layout */}
      <Route element={<SiteLayout />}>
        {/* Public website pages */}
        <Route path="/" element={<Home />} />

        <Route
          path="/teams"
          element={<Teams />}
        />

        <Route
          path="/teams/:slug"
          element={<TeamMember />}
        />

        <Route
          path="/locations"
          element={<Locations />}
        />

        <Route
          path="/locations/new-hope"
          element={<LocationDetail />}
        />

        <Route
          path="/services"
          element={<Services />}
        />

        <Route
          path="/contact"
          element={<Contact />}
        />

        <Route
          path="/terms"
          element={<Terms />}
        />

        <Route
          path="/privacy"
          element={<Privacy />}
        />

        {/* Customer-only authenticated routes */}
        <Route element={<ProtectedRoute />}>
          <Route
            path="/bookings"
            element={<MyBookings />}
          />
        </Route>

        {/* Barber/admin-only routes */}
        <Route element={<BarberRoute />}>
          <Route
            path="/barber-portal"
            element={<BarberPortal />}
          />
        </Route>
      </Route>

      {/* Unknown routes */}
      <Route
        path="*"
        element={<PageNotFound />}
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider
        client={queryClientInstance}
      >
        <Router
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <ScrollToTop />

          <AuthenticatedApp />
        </Router>

        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
