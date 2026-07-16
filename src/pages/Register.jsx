import React, { useState } from "react";
import {
  Link,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

export default function Register() {
  const {
    signUp,
    signInWithGoogle,
    isAuthenticated,
  } = useAuth();

  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] =
    useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  if (isAuthenticated) {
    return <Navigate to="/bookings" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (password.length < 8) {
      setError(
        "Your password must be at least 8 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const data = await signUp({
        email,
        password,
        fullName,
      });

      if (data?.session) {
        navigate("/bookings", { replace: true });
        return;
      }

      setMessage(
        "Account created. Check your email to confirm your account."
      );
    } catch (err) {
      console.error("Registration failed:", err);

      setError(
        err?.message ||
          "Unable to create your account."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    setError("");
    setMessage("");

    try {
      await signInWithGoogle();
    } catch (err) {
      console.error("Google sign up failed:", err);

      setError(
        err?.message ||
          "Unable to continue with Google."
      );

      setGoogleLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-muted/30 px-5 py-12">
      <section className="w-full max-w-md rounded-3xl border border-ink/10 bg-white p-7 shadow-sm sm:p-9">
        <h1 className="font-heading text-3xl font-extrabold text-ink">
          Create an account
        </h1>

        <p className="mt-2 text-sm text-ink/60">
          Create an account to book and manage appointments.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-5"
        >
          <div>
            <label
              htmlFor="register-name"
              className="mb-2 block text-sm font-bold text-ink"
            >
              Full name
            </label>

            <input
              id="register-name"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(event) =>
                setFullName(event.target.value)
              }
              required
              className="w-full rounded-xl border border-ink/15 px-4 py-3 outline-none focus:border-ink"
            />
          </div>

          <div>
            <label
              htmlFor="register-email"
              className="mb-2 block text-sm font-bold text-ink"
            >
              Email
            </label>

            <input
              id="register-email"
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
              htmlFor="register-password"
              className="mb-2 block text-sm font-bold text-ink"
            >
              Password
            </label>

            <input
              id="register-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              required
              className="w-full rounded-xl border border-ink/15 px-4 py-3 outline-none focus:border-ink"
            />
          </div>

          <div>
            <label
              htmlFor="register-confirm-password"
              className="mb-2 block text-sm font-bold text-ink"
            >
              Confirm password
            </label>

            <input
              id="register-confirm-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
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

          {message && (
            <p className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-cta px-6 py-4 font-heading text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading && (
              <Loader2
                size={17}
                className="animate-spin"
              />
            )}

            {loading
              ? "Creating account..."
              : "Sign up"}
          </button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-ink/10" />
            <span className="text-xs font-semibold uppercase tracking-wide text-ink/40">
              or
            </span>
            <div className="h-px flex-1 bg-ink/10" />
          </div>

          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={googleLoading || loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-ink/15 bg-white px-6 py-4 font-heading text-sm font-bold text-ink transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50"
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

        <p className="mt-6 text-center text-sm text-ink/70">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-bold text-ink underline"
          >
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
