import {
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";

import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

export default function BarberRoute() {
  const {
    user,
    profile,
    isLoadingAuth,
  } = useAuth();

  const location = useLocation();

  if (isLoadingAuth) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2
          className="animate-spin text-ink/40"
          size={30}
        />
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
        }}
      />
    );
  }

  const role =
    profile?.role
      ?.trim()
      .toLowerCase();

  if (
    role !== "barber" &&
    role !== "admin"
  ) {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  return <Outlet />;
}
