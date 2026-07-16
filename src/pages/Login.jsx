import React, { useState } from "react";
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

export default function Login() {
  const {
    signIn,
    signInWithGoogle,
    isAuthenticated,
  } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] =
    useState(false);
  const [error, setError] = useState("");

  const destination =
    location.state?.from?.pathname || "/bookings";

  if (isAuthenticated) {
    return <Navigate to={destination} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await signIn(email, password);
      navigate(destination, { replace: true });
    } catch (error) {
      console.error("Sign in failed:", error);
      setError(
        error.message ||
          "Unable to sign in. Check your email and password."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError("");

    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Google sign in failed:", error);
      setError(
        error.message ||
          "Unable to continue with Google."
      );
      setGoogleLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-muted/30 px-5 py-12">
      <section className="w-full max-w-md rounded-3xl border border-ink/10 bg-white p-7 shadow-sm sm:p-9">
        <h1 className="font-heading text-3xl font-extrabold text-ink">
          Sign in
        </h1>

        <p className="mt-2 text-sm text-ink/60">
          Sign in to manage your appointments.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-5"
        >
          <div>
            <label
              htmlFor="login-email"
              className="mb-2 block text-sm font-bold text-ink"
            >
              Email
            </label>

            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              required
              className="w-full rounded-xl border border-ink/15 px-4 py-3 outline-none focus:border-ink"
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="mb-2 block text-sm font-bold text-ink"
            >
              Password
            </label>

            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              required
              className="w-full rounded-xl border border-ink/15 px-4 py-3 outline-none focus:border-ink"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-cta px-6 py-4 font-heading text-sm font-bold text-white disabled:opacity-50"
          >
            {loading && (
              <Loader2
                size={17}
                className="animate-spin"
              />
            )}

            {loading ? "Signing in..." : "Sign in"}
          </button>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-ink/15 bg-white px-6 py-4 font-heading text-sm font-bold text-ink disabled:opacity-50"
          >
            {googleLoading && (
              <Loader2
                size={17}
                className="animate-spin"
              />
            )}

            {googleLoading
              ? "Redirecting..."
              : "Continue with Google"}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between gap-4 text-sm">
          <Link
            to="/forgot-password"
            className="font-semibold text-ink underline"
          >
            Forgot password?
          </Link>

          <Link
            to="/register"
            className="font-semibold text-ink underline"
          >
            Create account
          </Link>
        </div>
      </section>
    </main>
  );
}
