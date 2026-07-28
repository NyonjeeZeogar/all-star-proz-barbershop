import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Mail,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  UserX,
  Webhook,
} from "lucide-react";

import { supabase } from "@/lib/supabaseClient";
import { TEAM } from "@/lib/assets";
import SquareConnectionCard from "@/components/admin/SquareConnectionCard";
import SectionHeading from "@/components/site/SectionHeading";

function formatDateTime(value) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function ApplicationDetails({ application }) {
  return (
    <dl className="mt-5 space-y-2 text-sm">
      <div>
        <dt className="font-semibold text-ink">Business</dt>
        <dd className="text-ink/60">
          {application.business_name || "Not provided"}
        </dd>
      </div>

      <div>
        <dt className="font-semibold text-ink">Phone</dt>
        <dd className="text-ink/60">
          {application.phone || "Not provided"}
        </dd>
      </div>

      <div>
        <dt className="font-semibold text-ink">Experience</dt>
        <dd className="text-ink/60">
          {application.experience_years == null
            ? "Not provided"
            : `${application.experience_years} year${
                application.experience_years === 1 ? "" : "s"
              }`}
        </dd>
      </div>

      {application.bio && (
        <div>
          <dt className="font-semibold text-ink">About</dt>
          <dd className="mt-1 whitespace-pre-wrap text-ink/60">
            {application.bio}
          </dd>
        </div>
      )}
    </dl>
  );
}

function StatusBadge({ status }) {
  const classes = {
    pending: "bg-amber-100 text-amber-900",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold ${
        classes[status] || "bg-muted text-ink"
      }`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function AdminDashboard() {
  const [connections, setConnections] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applicationsLoading, setApplicationsLoading] =
    useState(true);
  const [error, setError] = useState("");
  const [applicationsError, setApplicationsError] =
    useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [emailWarning, setEmailWarning] = useState("");
  const [processingApplicationId, setProcessingApplicationId] =
    useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const loadConnections = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data, error: queryError } = await supabase
        .from("square_connections")
        .select(
          `
            id,
            barber_id,
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

  const loadApplications = useCallback(async () => {
    setApplicationsLoading(true);
    setApplicationsError("");

    try {
      const { data, error: queryError } = await supabase
        .from("barber_applications")
        .select(
          `
            id,
            user_id,
            full_name,
            email,
            phone,
            business_name,
            experience_years,
            bio,
            status,
            rejection_reason,
            created_at,
            reviewed_at
          `
        )
        .order("created_at", {
          ascending: false,
        });

      if (queryError) {
        throw queryError;
      }

      setApplications(data ?? []);
    } catch (queryError) {
      console.error(
        "Unable to load barber applications:",
        queryError
      );

      setApplications([]);

      setApplicationsError(
        queryError?.message ||
          "Unable to load barber applications. Confirm the migration and admin RLS policy are active."
      );
    } finally {
      setApplicationsLoading(false);
    }
  }, []);

  const sendApplicationEmail = useCallback(
    async (type, applicationId) => {
      const { error: functionError } =
        await supabase.functions.invoke(
          "send-notification",
          {
            body: {
              type,
              applicationId,
            },
          }
        );

      if (functionError) {
        throw functionError;
      }
    },
    []
  );

  const handleApproveApplication = async (applicationId) => {
    setProcessingApplicationId(applicationId);
    setApplicationsError("");
    setActionMessage("");
    setEmailWarning("");

    try {
      const { error: rpcError } = await supabase.rpc(
        "approve_barber_application",
        {
          application_id: applicationId,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      try {
        await sendApplicationEmail(
          "barber_application_approved",
          applicationId
        );

        setActionMessage(
          "The barber application was approved and the approval email was sent."
        );
      } catch (notificationError) {
        console.error(
          "Approval succeeded, but the email failed:",
          notificationError
        );

        setActionMessage(
          "The barber application was approved successfully."
        );

        setEmailWarning(
          notificationError?.message ||
            "The account was approved, but the approval email could not be sent."
        );
      }

      await Promise.all([
        loadApplications(),
        loadConnections(),
      ]);
    } catch (rpcError) {
      console.error(
        "Unable to approve barber application:",
        rpcError
      );

      setApplicationsError(
        rpcError?.message ||
          "Unable to approve the barber application."
      );
    } finally {
      setProcessingApplicationId(null);
    }
  };

  const handleRejectApplication = async (applicationId) => {
    const reason = window.prompt(
      "Enter the rejection reason that will be included in the email:"
    );

    if (reason === null) {
      return;
    }

    if (!reason.trim()) {
      setApplicationsError(
        "A rejection reason is required so the applicant receives a clear explanation."
      );
      return;
    }

    setProcessingApplicationId(applicationId);
    setApplicationsError("");
    setActionMessage("");
    setEmailWarning("");

    try {
      const { error: rpcError } = await supabase.rpc(
        "reject_barber_application",
        {
          application_id: applicationId,
          reason: reason.trim(),
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      try {
        await sendApplicationEmail(
          "barber_application_rejected",
          applicationId
        );

        setActionMessage(
          "The barber application was rejected and the rejection email was sent."
        );
      } catch (notificationError) {
        console.error(
          "Rejection succeeded, but the email failed:",
          notificationError
        );

        setActionMessage(
          "The barber application was rejected."
        );

        setEmailWarning(
          notificationError?.message ||
            "The application was rejected, but the rejection email could not be sent."
        );
      }

      await loadApplications();
    } catch (rpcError) {
      console.error(
        "Unable to reject barber application:",
        rpcError
      );

      setApplicationsError(
        rpcError?.message ||
          "Unable to reject the barber application."
      );
    } finally {
      setProcessingApplicationId(null);
    }
  };

  useEffect(() => {
    loadConnections();
    loadApplications();
  }, [loadApplications, loadConnections]);

  const connectionsByBarberSlug = useMemo(() => {
    return connections.reduce((map, connection) => {
      if (connection.barber_slug) {
        map[connection.barber_slug] = connection;
      }

      return map;
    }, {});
  }, [connections]);

  const connectionsByBarberId = useMemo(() => {
    return connections.reduce((map, connection) => {
      if (connection.barber_id) {
        map[connection.barber_id] = connection;
      }

      return map;
    }, {});
  }, [connections]);

  const connectedCount = useMemo(() => {
    return connections.filter(
      (connection) => connection.status === "connected"
    ).length;
  }, [connections]);

  const filteredApplications = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) {
      return applications;
    }

    return applications.filter((application) =>
      [
        application.full_name,
        application.email,
        application.business_name,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(search)
        )
    );
  }, [applications, searchTerm]);

  const pendingApplications = useMemo(
    () =>
      filteredApplications.filter(
        (application) => application.status === "pending"
      ),
    [filteredApplications]
  );

  const approvedApplications = useMemo(
    () =>
      filteredApplications.filter(
        (application) => application.status === "approved"
      ),
    [filteredApplications]
  );

  const rejectedApplications = useMemo(
    () =>
      filteredApplications.filter(
        (application) => application.status === "rejected"
      ),
    [filteredApplications]
  );

  const renderApplicationCard = (application) => {
    const isProcessing =
      processingApplicationId === application.id;
    const squareConnection =
      connectionsByBarberId[application.user_id];

    return (
      <article
        key={application.id}
        className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-heading text-lg font-extrabold text-ink">
              {application.full_name}
            </h3>

            <p className="mt-1 text-sm text-ink/60">
              {application.email}
            </p>
          </div>

          <StatusBadge status={application.status} />
        </div>

        <ApplicationDetails application={application} />

        {application.status === "pending" && (
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                handleApproveApplication(application.id)
              }
              disabled={isProcessing}
              className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 font-heading text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <UserCheck size={15} />
              {isProcessing ? "Processing..." : "Approve"}
            </button>

            <button
              type="button"
              onClick={() =>
                handleRejectApplication(application.id)
              }
              disabled={isProcessing}
              className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-4 py-2 font-heading text-xs font-bold text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <UserX size={15} />
              Reject
            </button>
          </div>
        )}

        {application.status === "approved" && (
          <div className="mt-5 rounded-xl bg-green-50 p-4 text-sm text-green-800">
            <p className="font-semibold">
              Approved {formatDateTime(application.reviewed_at)}
            </p>

            <p className="mt-1">
              Square:{" "}
              <strong>
                {squareConnection?.status === "connected"
                  ? "Connected"
                  : "Not connected"}
              </strong>
            </p>
          </div>
        )}

        {application.status === "rejected" && (
          <div className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            <p className="font-semibold">
              Rejected {formatDateTime(application.reviewed_at)}
            </p>

            <p className="mt-2">
              <strong>Reason:</strong>{" "}
              {application.rejection_reason ||
                "No reason was recorded."}
            </p>
          </div>
        )}
      </article>
    );
  };

  const renderApplicationSection = ({
    title,
    description,
    applications: sectionApplications,
    emptyMessage,
  }) => (
    <section className="mb-12">
      <div className="mb-5">
        <h2 className="font-heading text-2xl font-extrabold text-ink">
          {title}
        </h2>

        <p className="mt-1 text-sm text-ink/60">
          {description}
        </p>
      </div>

      {sectionApplications.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {sectionApplications.map(renderApplicationCard)}
        </div>
      ) : (
        <div className="rounded-2xl border border-ink/10 bg-white p-6 text-sm text-ink/60">
          {emptyMessage}
        </div>
      )}
    </section>
  );

  return (
    <main className="py-16 sm:py-24">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <SectionHeading
          label="ADMIN"
          title="Barber Management"
          className="mb-3"
        />

        <p className="mb-8 max-w-2xl text-sm text-ink/60">
          Review applications, manage approved barber
          accounts, preserve decision history, and monitor
          Square onboarding.
        </p>

        <div className="mb-8 flex flex-wrap items-center gap-3">
          <label className="relative min-w-64 flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/40"
            />

            <input
              type="search"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              placeholder="Search name, email, or business"
              className="w-full rounded-full border border-ink/15 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-ink"
            />
          </label>

          <button
            type="button"
            onClick={loadApplications}
            disabled={applicationsLoading}
            className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-white px-4 py-3 font-heading text-xs font-bold text-ink transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={14}
              className={
                applicationsLoading ? "animate-spin" : ""
              }
            />
            Refresh applications
          </button>
        </div>

        <div className="mb-8 flex flex-wrap gap-3">
          <div className="rounded-full bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-900 ring-1 ring-amber-200">
            Pending: {pendingApplications.length}
          </div>

          <div className="rounded-full bg-green-50 px-4 py-2 text-xs font-semibold text-green-800 ring-1 ring-green-200">
            Approved: {approvedApplications.length}
          </div>

          <div className="rounded-full bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 ring-1 ring-red-200">
            Rejected: {rejectedApplications.length}
          </div>
        </div>

        {actionMessage && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            <CheckCircle2
              size={18}
              className="mt-0.5 shrink-0"
            />
            <p>{actionMessage}</p>
          </div>
        )}

        {emailWarning && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <Mail size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">
                Account status changed, but email delivery
                needs attention.
              </p>
              <p className="mt-1 text-xs">{emailWarning}</p>
            </div>
          </div>
        )}

        {applicationsError && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle
              size={18}
              className="mt-0.5 shrink-0"
            />
            <div>
              <p className="font-semibold">
                Barber applications could not be loaded.
              </p>
              <p className="mt-1 text-xs">
                {applicationsError}
              </p>
            </div>
          </div>
        )}

        {applicationsLoading ? (
          <div className="mb-14 grid gap-4 sm:grid-cols-2">
            {[0, 1].map((item) => (
              <div
                key={item}
                className="h-64 animate-pulse rounded-2xl border border-ink/10 bg-white"
              />
            ))}
          </div>
        ) : (
          <>
            {renderApplicationSection({
              title: "Pending Barber Applications",
              description:
                "Approve qualified applicants or reject applications with a reason.",
              applications: pendingApplications,
              emptyMessage: "No pending barber applications.",
            })}

            {renderApplicationSection({
              title: "Approved Barbers",
              description:
                "Approved accounts remain visible with their review date and Square onboarding status.",
              applications: approvedApplications,
              emptyMessage: "No approved barber applications match this search.",
            })}

            {renderApplicationSection({
              title: "Rejected Applications",
              description:
                "Rejected applications remain available as an administrative record.",
              applications: rejectedApplications,
              emptyMessage: "No rejected barber applications match this search.",
            })}
          </>
        )}

        <SectionHeading
          label="PAYMENTS"
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
              className={loading ? "animate-spin" : ""}
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

              <p className="mt-1 text-xs">{error}</p>

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
                  connectionsByBarberSlug[barber.slug]
                }
                onConnectionChanged={loadConnections}
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
                  send-notification
                </code>{" "}
                and all Square Edge Functions.
              </span>
            </li>

            <li className="flex items-start gap-3">
              <RefreshCw
                size={16}
                className="mt-0.5 shrink-0 text-cta"
              />

              <span>
                Keep the Resend API key and Square credentials
                in Supabase Edge Function secrets.
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
            <code className="font-mono text-xs">VITE_</code>{" "}
            prefix.
          </p>
        </section>
      </div>
    </main>
  );
}
