import React from "react";
import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "@/lib/AuthContext";

export default function RoleRoute({ roles = [] }) {
  const {
    user,
    profile,
    isLoadingAuth,
    authChecked,
  } = useAuth();

  if (isLoadingAuth || !authChecked) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-ink/10 border-t-cta" />

          <p className="mt-3 text-sm text-ink/60">
            Checking permissions...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!profile) {
    return <Navigate to="/" replace />;
  }

  if (!roles.includes(profile.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
