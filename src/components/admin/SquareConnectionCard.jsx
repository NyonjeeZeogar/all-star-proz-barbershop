import React, { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  Link2,
  Loader2,
  Store,
  Unlink,
} from "lucide-react";

import { supabase } from "@/lib/supabaseClient";

async function getFunctionErrorMessage(
  functionError,
  fallbackMessage
) {
  if (!functionError) {
    return fallbackMessage;
  }

  try {
    const response = functionError.context;

    if (response && typeof response.json === "function") {
      const responseBody = await response.json();

      return (
        responseBody?.error ||
        responseBody?.message ||
        functionError.message ||
        fallbackMessage
      );
    }
  } catch {
    // Ignore response parsing errors and use the default message.
  }

  return functionError.message || fallbackMessage;
}

export default function SquareConnectionCard({
  barber,
  connection,
  onConnectionChanged,
}) {
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loadingAction, setLoadingAction] =
    useState("");

  const connected =
    connection?.status === "connected";

  const hasConnectionError =
    connection?.status === "error";

  const clearMessages = () => {
    setNotice("");
    setError("");
  };

  const getAuthenticatedSession = async () => {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      throw sessionError;
    }

    if (!session?.access_token) {
      throw new Error(
        "Your admin session is missing or expired. Sign out and sign in again."
      );
    }

    return session;
  };

  const handleConnect = async () => {
    clearMessages();
    setLoadingAction("connect");

    try {
      const session =
        await getAuthenticatedSession();

      const {
        data,
        error: functionError,
      } = await supabase.functions.invoke(
        "square-oauth-start",
        {
          body: {
            barberSlug: barber.slug,
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (functionError) {
        const message =
          await getFunctionErrorMessage(
            functionError,
            "Unable to start Square OAuth."
          );

        throw new Error(message);
      }

      const authorizationUrl =
        data?.authorizationUrl || data?.url;

      if (!authorizationUrl) {
        throw new Error(
          "The Square OAuth function did not return an authorization URL."
        );
      }

      window.location.assign(authorizationUrl);
    } catch (connectError) {
      console.error(
        "Unable to start Square OAuth:",
        connectError
      );

      setError(
        connectError instanceof Error
          ? connectError.message
          : "Unable to connect this Square account."
      );
    } finally {
      setLoadingAction("");
    }
  };

  const handleDisconnect = async () => {
    const confirmed = window.confirm(
      `Disconnect Square for ${barber.name}? Payments cannot be processed for this barber until the account is reconnected.`
    );

    if (!confirmed) {
      return;
    }

    clearMessages();
    setLoadingAction("disconnect");

    try {
      const session =
        await getAuthenticatedSession();

      const {
        data,
        error: functionError,
      } = await supabase.functions.invoke(
        "square-disconnect",
        {
          body: {
            barberSlug: barber.slug,
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (functionError) {
        const message =
          await getFunctionErrorMessage(
            functionError,
            "Unable to disconnect this Square account."
          );

        throw new Error(message);
      }

      setNotice(
        data?.message ||
          `${barber.name}'s Square account was disconnected.`
      );

      if (onConnectionChanged) {
        await onConnectionChanged();
      }
    } catch (disconnectError) {
      console.error(
        "Unable to disconnect Square:",
        disconnectError
      );

      setError(
        disconnectError instanceof Error
          ? disconnectError.message
          : "Unable to disconnect this Square account."
      );
    } finally {
      setLoadingAction("");
    }
  };

  const statusLabel = connected
    ? "Connected"
    : hasConnectionError
      ? "Connection error"
      : "Not connected";

  const statusClasses = connected
    ? "bg-emerald-100 text-emerald-700"
    : hasConnectionError
      ? "bg-red-100 text-red-700"
      : "bg-amber-100 text-amber-700";

  return (
    <article className="rounded-2xl border border-ink/10 bg-white p-5">
      <div className="flex items-center gap-3">
        <img
          src={barber.photo}
          alt={barber.name}
          className="h-12 w-12 rounded-full object-cover"
        />

        <div className="min-w-0 flex-1">
          <h3 className="truncate font-heading text-sm font-bold text-ink">
            {barber.name}
          </h3>

          <p className="truncate text-xs text-ink/60">
            {barber.role} · {barber.shop}
          </p>
        </div>

        <span
          className={`shrink-0 rounded-full px-3 py-1 font-heading text-[11px] font-bold ${statusClasses}`}
        >
          {statusLabel}
        </span>
      </div>

      {connected && (
        <div className="mt-4 space-y-1.5 rounded-xl bg-muted/40 p-3 text-xs text-ink/60">
          <p className="flex items-center gap-1.5">
            <Store size={13} />
            Merchant:{" "}
            {connection.merchant_id || "—"}
          </p>

          <p>
            Location:{" "}
            {connection.location_id || "—"}
          </p>

          {connection.connected_at && (
            <p>
              Connected:{" "}
              {new Date(
                connection.connected_at
              ).toLocaleString()}
            </p>
          )}

          {connection.token_expires_at && (
            <p>
              Token expires:{" "}
              {new Date(
                connection.token_expires_at
              ).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {hasConnectionError &&
        connection?.last_error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700">
            <AlertCircle
              size={14}
              className="mt-0.5 shrink-0"
            />

            <span>{connection.last_error}</span>
          </div>
        )}

      <div className="mt-4">
        {connected ? (
          <button
            type="button"
            onClick={handleDisconnect}
            disabled={Boolean(loadingAction)}
            className="inline-flex items-center gap-2 rounded-full border border-ink/15 px-4 py-2 font-heading text-xs font-bold text-ink transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingAction === "disconnect" ? (
              <Loader2
                size={14}
                className="animate-spin"
              />
            ) : (
              <Unlink size={14} />
            )}

            Disconnect
          </button>
        ) : (
          <button
            type="button"
            onClick={handleConnect}
            disabled={Boolean(loadingAction)}
            className="inline-flex items-center gap-2 rounded-full bg-cta px-4 py-2 font-heading text-xs font-bold text-white transition-colors hover:bg-cta/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingAction === "connect" ? (
              <Loader2
                size={14}
                className="animate-spin"
              />
            ) : (
              <Link2 size={14} />
            )}

            Connect Square
          </button>
        )}
      </div>

      {notice && (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700">
          <CheckCircle2
            size={14}
            className="mt-0.5 shrink-0"
          />

          <span>{notice}</span>
        </div>
      )}

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700">
          <AlertCircle
            size={14}
            className="mt-0.5 shrink-0"
          />

          <span>{error}</span>
        </div>
      )}

      {!connected && !error && !notice && (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-muted/50 p-3 text-xs text-ink/60">
          <Info
            size={14}
            className="mt-0.5 shrink-0 text-cta"
          />

          <span>
            Connect this barber to their own Square
            merchant account.
          </span>
        </div>
      )}
    </article>
  );
}
