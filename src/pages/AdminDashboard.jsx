import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  Webhook,
} from "lucide-react";

import { supabase } from "@/lib/supabaseClient";
import { TEAM } from "@/lib/assets";
import SquareConnectionCard from "@/components/admin/SquareConnectionCard";
import SectionHeading from "@/components/site/SectionHeading";

export default function AdminDashboard() {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadConnections = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data, error: queryError } =
        await supabase
          .from("square_connections")
          .select(
            `
              id,
              barber_slug,
              barber_name,
              status,
              merchant_id,
              location_id,
              token_expires_at,
              connected_at,
              disconnected_at,
              last_error,
              created_at,
              updated_at
            `
          )
          .order("barber_name", {
            ascending: true,
          });

      if (queryError) {
        throw queryError;
      }

      setConnections(data ?? []);
    } catch (queryError) {
      console.error(
        "Unable to load Square connections:",
        queryError
      );

      setConnections([]);

      setError(
        queryError?.message ||
          "Unable to load Square connections. Confirm that the table and admin RLS policies exist."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  const connectionsByBarberSlug = useMemo(() => {
    return connections.reduce(
      (map, connection) => {
        if (connection.barber_slug) {
          map[connection.barber_slug] =
            connection;
        }

        return map;
      },
      {}
    );
  }, [connections]);

  const connectedCount = useMemo(() => {
    return connections.filter(
      (connection) =>
        connection.status === "connected"
    ).length;
  }, [connections]);

  return (
    <main className="py-16 sm:py-24">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <SectionHeading
          label="ADMIN"
          title="Square Connections"
          className="mb-3"
        />

        <p className="mb-6 max-w-2xl text-sm text-ink/60">
          Connect each barber to their own Square merchant
          account so payments can be routed according to
          the barber selected during booking. Square
          credentials are handled by secure Supabase Edge
          Functions and are never exposed in the browser.
        </p>

        <div className="mb-10 flex flex-wrap gap-3">
          <div className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-ink shadow-sm ring-1 ring-ink/10">
            Team members: {TEAM.length}
          </div>

          <div className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-ink shadow-sm ring-1 ring-ink/10">
            Connected: {connectedCount}
          </div>

          <button
            type="button"
            onClick={loadConnections}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-white px-4 py-2 font-heading text-xs font-bold text-ink transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={14}
              className={
                loading ? "animate-spin" : ""
              }
            />

            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle
              size={18}
              className="mt-0.5 shrink-0"
            />

            <div>
              <p className="font-semibold">
                Square connections could not be loaded.
              </p>

              <p className="mt-1 text-xs">
                {error}
              </p>

              <button
                type="button"
                onClick={loadConnections}
                className="mt-3 inline-flex items-center gap-2 font-heading text-xs font-bold underline"
              >
                <RefreshCw size={14} />
                Try again
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {TEAM.map((barber) => (
              <div
                key={barber.slug}
                className="h-56 animate-pulse rounded-2xl border border-ink/10 bg-white"
              />
            ))}
          </div>
        ) : TEAM.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {TEAM.map((barber) => (
              <SquareConnectionCard
                key={barber.slug}
                barber={barber}
                connection={
                  connectionsByBarberSlug[
                    barber.slug
                  ]
                }
                onConnectionChanged={
                  loadConnections
                }
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-ink/10 bg-white p-6 text-sm text-ink/60">
            No team members are currently configured.
          </div>
        )}

        <section className="mt-12 rounded-3xl border border-ink/10 bg-white p-6 sm:p-8">
          <h2 className="mb-4 font-heading text-sm font-extrabold tracking-[0.2em] text-ink/50">
            SETUP CHECKLIST
          </h2>

          <ul className="space-y-3 text-sm text-ink/70">
            <li className="flex items-start gap-3">
              <KeyRound
                size={16}
                className="mt-0.5 shrink-0 text-cta"
              />

              <span>
                Save the Square sandbox Application ID,
                Application Secret, and OAuth Redirect URI
                as Supabase Edge Function secrets.
              </span>
            </li>

            <li className="flex items-start gap-3">
              <ShieldCheck
                size={16}
                className="mt-0.5 shrink-0 text-cta"
              />

              <span>
                Deploy{" "}
                <code className="font-mono text-xs">
                  square-oauth-start
                </code>
                ,{" "}
                <code className="font-mono text-xs">
                  square-oauth-callback
                </code>
                ,{" "}
                <code className="font-mono text-xs">
                  square-disconnect
                </code>
                ,{" "}
                <code className="font-mono text-xs">
                  square-create-checkout
                </code>
                , and{" "}
                <code className="font-mono text-xs">
                  square-webhook
                </code>
                .
              </span>
            </li>

            <li className="flex items-start gap-3">
              <RefreshCw
                size={16}
                className="mt-0.5 shrink-0 text-cta"
              />

              <span>
                Refresh expired Square OAuth tokens and
                keep credentials outside browser-readable
                public tables.
              </span>
            </li>

            <li className="flex items-start gap-3">
              <Webhook
                size={16}
                className="mt-0.5 shrink-0 text-cta"
              />

              <span>
                Verify Square webhook signatures and use
                idempotency keys for checkout and payment
                requests.
              </span>
            </li>
          </ul>

          <p className="mt-5 text-xs text-ink/50">
            Server secrets must not use a{" "}
            <code className="font-mono text-xs">
              VITE_
            </code>{" "}
            prefix.
          </p>
        </section>
      </div>
    </main>
  );
}
