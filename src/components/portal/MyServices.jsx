import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  Loader2,
  Pencil,
  Plus,
  Scissors,
  Trash2,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";

const emptyForm = {
  serviceId: "",
  price: "",
  deposit: "",
  duration: "",
};

export default function MyServices() {
  const { user } = useAuth();

  const [catalog, setCatalog] = useState([]);
  const [services, setServices] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    if (!user?.id) {
      setCatalog([]);
      setServices([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const [catalogResult, barberServicesResult] = await Promise.all([
      supabase
        .from("services")
        .select("id, name, description, price, deposit, duration_minutes, active")
        .eq("active", true)
        .order("name", { ascending: true }),
      supabase
        .from("barber_services")
        .select(`
          id,
          barber_id,
          service_id,
          custom_price,
          custom_deposit,
          custom_duration_minutes,
          active,
          created_at,
          service:services (
            id,
            name,
            description,
            price,
            deposit,
            duration_minutes,
            active
          )
        `)
        .eq("barber_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

    if (catalogResult.error || barberServicesResult.error) {
      const loadError = catalogResult.error || barberServicesResult.error;
      setError(loadError.message);
      setCatalog([]);
      setServices([]);
    } else {
      setCatalog(catalogResult.data ?? []);
      setServices(barberServicesResult.data ?? []);
    }

    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const linkedServiceIds = useMemo(
    () => new Set(services.map((row) => row.service_id)),
    [services]
  );

  const availableCatalog = useMemo(
    () =>
      catalog.filter(
        (service) =>
          service.id === form.serviceId || !linkedServiceIds.has(service.id)
      ),
    [catalog, form.serviceId, linkedServiceIds]
  );

  const selectedCatalogService = useMemo(
    () => catalog.find((service) => service.id === form.serviceId) || null,
    [catalog, form.serviceId]
  );

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
  }

  function selectCatalogService(serviceId) {
    const service = catalog.find((item) => item.id === serviceId);

    setForm({
      serviceId,
      price: service?.price ?? "",
      deposit: service?.deposit ?? "",
      duration: service?.duration_minutes ?? "",
    });
    setError("");
  }

  function editService(row) {
    setEditingId(row.id);
    setForm({
      serviceId: row.service_id,
      price: row.custom_price ?? row.service?.price ?? "",
      deposit: row.custom_deposit ?? row.service?.deposit ?? "",
      duration:
        row.custom_duration_minutes ?? row.service?.duration_minutes ?? "",
    });
    setError("");
  }

  async function submit(event) {
    event.preventDefault();

    if (!user?.id) {
      setError("You must be signed in as a barber.");
      return;
    }

    if (!form.serviceId) {
      setError("Select an approved service from the catalog.");
      return;
    }

    const price = Number(form.price);
    const deposit = Number(form.deposit || 0);
    const duration = Number(form.duration);

    if (!Number.isFinite(price) || price <= 0) {
      setError("Enter a valid service price greater than $0.");
      return;
    }

    if (!Number.isFinite(deposit) || deposit < 0) {
      setError("Deposit cannot be negative.");
      return;
    }

    if (deposit > price) {
      setError("The deposit cannot be greater than the service price.");
      return;
    }

    if (!Number.isFinite(duration) || duration <= 0) {
      setError("Enter a valid duration greater than 0 minutes.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        barber_id: user.id,
        service_id: form.serviceId,
        custom_price: Number(price.toFixed(2)),
        custom_deposit: Number(deposit.toFixed(2)),
        custom_duration_minutes: Math.round(duration),
        active: true,
      };

      if (editingId) {
        const { error: updateError } = await supabase
          .from("barber_services")
          .update({
            custom_price: payload.custom_price,
            custom_deposit: payload.custom_deposit,
            custom_duration_minutes: payload.custom_duration_minutes,
          })
          .eq("id", editingId)
          .eq("barber_id", user.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("barber_services")
          .insert(payload);

        if (insertError) {
          if (insertError.code === "23505") {
            throw new Error("This service is already in your service list.");
          }
          throw insertError;
        }
      }

      resetForm();
      await loadData();
    } catch (submitError) {
      setError(submitError?.message || "The service could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleService(row) {
    setError("");

    const { error: toggleError } = await supabase
      .from("barber_services")
      .update({ active: !row.active })
      .eq("id", row.id)
      .eq("barber_id", user.id);

    if (toggleError) {
      setError(toggleError.message);
      return;
    }

    setServices((current) =>
      current.map((item) =>
        item.id === row.id ? { ...item, active: !item.active } : item
      )
    );
  }

  async function removeService(row) {
    const confirmed = window.confirm(
      `Remove ${row.service?.name || "this service"} from your service list?`
    );

    if (!confirmed) return;

    setError("");

    const { error: deleteError } = await supabase
      .from("barber_services")
      .delete()
      .eq("id", row.id)
      .eq("barber_id", user.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setServices((current) => current.filter((item) => item.id !== row.id));

    if (editingId === row.id) resetForm();
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={submit}
        className="rounded-2xl border border-ink/10 bg-white p-5"
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-heading font-extrabold text-ink">
              {editingId ? "Edit service settings" : "Add an approved service"}
            </h3>
            <p className="mt-1 text-sm text-ink/55">
              Service names are managed by your agency during onboarding. You can customize your price, deposit, and duration.
            </p>
          </div>

          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-full p-2 text-ink/50 hover:bg-muted"
              aria-label="Cancel editing"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_140px_140px_140px]">
          <label>
            <span className="font-heading text-xs font-bold tracking-[0.18em] text-ink/45">
              SERVICE
            </span>
            <select
              value={form.serviceId}
              onChange={(event) => selectCatalogService(event.target.value)}
              disabled={Boolean(editingId)}
              required
              className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-cta disabled:bg-muted disabled:text-ink/60"
            >
              <option value="">Select an approved service</option>
              {availableCatalog.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </label>

          <NumberField
            label="PRICE ($)"
            value={form.price}
            onChange={(value) => setForm((current) => ({ ...current, price: value }))}
            min="0.01"
            step="0.01"
            placeholder="40.00"
          />

          <NumberField
            label="DEPOSIT ($)"
            value={form.deposit}
            onChange={(value) => setForm((current) => ({ ...current, deposit: value }))}
            min="0"
            step="0.01"
            placeholder="15.00"
          />

          <NumberField
            label="DURATION"
            value={form.duration}
            onChange={(value) => setForm((current) => ({ ...current, duration: value }))}
            min="1"
            step="1"
            placeholder="45"
          />
        </div>

        {selectedCatalogService?.description && (
          <div className="mt-4 rounded-xl bg-muted/60 px-4 py-3 text-sm text-ink/65">
            <strong className="text-ink">Catalog description:</strong>{" "}
            {selectedCatalogService.description}
          </div>
        )}

        {error && (
          <p role="alert" className="mt-4 text-sm font-medium text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving || !form.serviceId}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-cta px-6 py-3 font-heading text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : editingId ? (
            <Check size={16} />
          ) : (
            <Plus size={16} />
          )}
          {saving ? "Saving..." : editingId ? "Save changes" : "Add service"}
        </button>
      </form>

      {loading ? (
        <div className="flex justify-center py-14">
          <Loader2 size={26} className="animate-spin text-ink/35" />
        </div>
      ) : services.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink/15 p-12 text-center">
          <Scissors className="mx-auto text-ink/25" size={30} />
          <h3 className="mt-4 font-heading font-bold text-ink">No services yet</h3>
          <p className="mt-1 text-sm text-ink/55">
            Select your first approved service above.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {services.map((row) => {
            const price = row.custom_price ?? row.service?.price ?? 0;
            const deposit = row.custom_deposit ?? row.service?.deposit ?? 0;
            const duration =
              row.custom_duration_minutes ?? row.service?.duration_minutes ?? 0;

            return (
              <article
                key={row.id}
                className="flex flex-col gap-4 rounded-2xl border border-ink/10 bg-white p-5 sm:flex-row sm:items-center"
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-cyanAccent/45">
                  <Scissors size={17} className="text-ink" />
                </div>

                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-heading font-extrabold text-ink">
                      {row.service?.name || "Service"}
                    </h3>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        row.active
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {row.active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {row.service?.description && (
                    <p className="mt-1 text-sm text-ink/55">
                      {row.service.description}
                    </p>
                  )}

                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink/65">
                    <span>Price: <strong>{formatCurrency(price)}</strong></span>
                    <span>Deposit: <strong>{formatCurrency(deposit)}</strong></span>
                    <span>Duration: <strong>{duration} min</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleService(row)}
                    className="rounded-full border border-ink/15 px-4 py-2 text-xs font-bold text-ink/70 hover:bg-muted"
                  >
                    {row.active ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    type="button"
                    onClick={() => editService(row)}
                    className="rounded-full border border-ink/15 p-2.5 text-ink/65 hover:bg-muted"
                    aria-label={`Edit ${row.service?.name || "service"}`}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeService(row)}
                    className="rounded-full border border-red-200 p-2.5 text-red-600 hover:bg-red-50"
                    aria-label={`Remove ${row.service?.name || "service"}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <p className="text-center text-xs text-ink/45">
        Platform managed and supported by your agency. Service catalog changes are handled during client onboarding.
      </p>
    </div>
  );
}

function NumberField({ label, value, onChange, ...inputProps }) {
  return (
    <label>
      <span className="font-heading text-xs font-bold tracking-[0.18em] text-ink/45">
        {label}
      </span>
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        className="mt-2 w-full rounded-xl border border-ink/15 px-4 py-3 text-sm text-ink outline-none focus:border-cta"
        {...inputProps}
      />
    </label>
  );
}

function formatCurrency(value) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number.isFinite(amount) ? amount : 0);
}
