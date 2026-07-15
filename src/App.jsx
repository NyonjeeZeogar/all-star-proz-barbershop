import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import {
  HashRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";

import PageNotFound from "./lib/PageNotFound";
import { AuthProvider } from "@/lib/AuthContext";
import ScrollToTop from "./components/ScrollToTop";

import SiteLayout from "@/components/site/SiteLayout";
import Home from "@/pages/Home";
import Teams from "@/pages/Teams";
import Locations from "@/pages/Locations";
import LocationDetail from "@/pages/LocationDetail";
import Services from "@/pages/Services";
import Contact from "@/pages/Contact";
import TeamMember from "@/pages/TeamMember";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";
import MyBookings from "@/pages/MyBookings";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import ProtectedRoute from "@/components/ProtectedRoute";

const AuthenticatedApp = () => {
  return (
    <Routes>
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

      <Route element={<SiteLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/teams" element={<Teams />} />
        <Route path="/teams/:slug" element={<TeamMember />} />
        <Route path="/locations" element={<Locations />} />
        <Route
          path="/locations/new-hope"
          element={<LocationDetail />}
        />
        <Route path="/services" element={<Services />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />

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
        </Route>
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>

        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
