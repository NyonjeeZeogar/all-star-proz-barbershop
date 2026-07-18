import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Check,
  Loader2,
  Plus,
  Scissors,
  Trash2,
  X,
} from "lucide-react";

import {
  deleteBarberService,
  getAvailableShopServices,
  getBarberServices,
  saveBarberService,
  toggleBarberService,
} from "@/services/barberPortal";

const EMPTY_FORM = {
  serviceId: "",
  customPrice: "",
  customDurationMinutes: "",
};

export default function MyServices() {
  const [barberServices, setBarberServices] =
    useState([]);

  const [shopServices, setShopServices] =
    useState([]);

  const [form, setForm] =
    useState(EMPTY_FORM);

  const [saving, setSaving] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [
        barberServiceRows,
        shopServiceRows,
      ] = await Promise.all([
        getBarberServices(),
        getAvailableShopServices(),
      ]);

      setBarberServices(
        barberServiceRows ?? []
      );

      setShopServices(
        shopServiceRows ?? []
      );
    } catch (err) {
      console.error(
        "Unable to load barber services:",
        err
      );

      setError(
        err?.message ||
          "Unable to load services."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const assignedServiceIds =
    useMemo(
      () =>
        new Set(
          barberServices.map(
            (item) => item.service_id
          )
        ),
      [barberServices]
    );

  const unassignedServices =
    shopServices.filter(
      (service) =>
        !assignedServiceIds.has(service.id)
    );

  const submit = async (event) => {
    event.preventDefault();

    if (!form.serviceId) {
      setError(
        "Please select a service."
      );
      return;
    }

    setSaving(true);
    setError("");

    try {
      await saveBarberService({
        serviceId: form.serviceId,
        customPrice: form.customPrice,
        customDurationMinutes:
          form.customDurationMinutes,
        active: true,
      });

      setForm(EMPTY_FORM);

      await load();
    } catch (err) {
      console.error(
        "Unable to save barber service:",
        err
      );

      setError(
        err?.message ||
          "Unable to save service."
      );
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (item) => {
    try {
      const updated =
        await toggleBarberService(
          item.id,
          !item.active
        );

      setBarberServices((current) =>
        current.map((row) =>
          row.id === item.id
            ? {
                ...row,
                ...updated,
              }
            : row
        )
      );
    } catch (err) {
      console.error(
        "Unable to update barber service:",
        err
      );

      setError(
        err?.message ||
          "Unable to update service."
      );
    }
  };

  const remove = async (id) => {
    const confirmed =
      window.confirm(
        "Remove this service from your list?"
      );

    if (!confirmed) {
      return;
    }

    try {
      await deleteBarberService(id);

      setBarberServices((current) =>
        current.filter(
          (item) => item.id !== id
        )
      );
    } catch (err) {
      console.error(
        "Unable to remove barber service:",
        err
      );

      setError(
        err?.message ||
          "Unable to remove service."
      );
    }
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={submit}
        className="rounded-2xl border border-ink/10 bg-white p-5"
      >
        <h3 className="mb-4 font-heading font-extrabold text-ink">
          Add a service
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="font-heading text-xs font-extrabold tracking-[0.2em] text-ink/50">
              SERVICE
            </label>

            <select
              value={form.serviceId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  serviceId:
                    event.target.value,
                }))
              }
              required
              className="mt-2 w-full rounded-xl border border-ink/15 px-4 py-3 text-sm focus:outline-none"
            >
              <option value="">
                Select a shop service
              </option>

              {unassignedServices.map(
                (service) => (
                  <option
                    key={service.id}
                    value={service.id}
                  >
                    {service.name}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label className="font-heading text-xs font-extrabold tracking-[0.2em] text-ink/50">
              CUSTOM PRICE
            </label>

            <input
              type="number"
              min="0"
              step="0.01"
              value={form.customPrice}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  customPrice:
                    event.target.value,
                }))
              }
              placeholder="Use shop price"
              className="mt-2 w-full rounded-xl border border-ink/15 px-4 py-3 text-sm focus:outline-none"
            />
          </div>

          <div>
            <label className="font-heading text-xs font-extrabold tracking-[0.2em] text-ink/50">
              CUSTOM DURATION
            </label>

            <input
              type="number"
              min="1"
              value={
                form.customDurationMinutes
              }
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  customDurationMinutes:
                    event.target.value,
                }))
              }
              placeholder="Use shop duration"
              className="mt-2 w-full rounded-xl border border-ink/15 px-4 py-3 text-sm focus:outline-none"
            />
          </div>
        </div>

        {error && (
          <p className="mt-4 text-sm font-medium text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={
            saving ||
            !form.serviceId
          }
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-cta px-6 py-3 font-heading text-sm font-bold text-white disabled:opacity-60"
        >
          {saving ? (
            <Loader2
              className="animate-spin"
              size={16}
            />
          ) : (
            <Plus size={16} />
          )}

          Add service
        </button>
      </form>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2
            className="animate-spin text-ink/40"
            size={24}
          />
        </div>
      ) : barberServices.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink/15 bg-muted/40 p-10 text-center">
          <Scissors
            className="mx-auto text-ink/30"
            size={28}
          />

          <h3 className="mt-3 font-heading font-bold text-ink">
            No services selected
          </h3>

          <p className="mt-1 text-sm text-ink/60">
            Add your first service above.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {barberServices.map((item) => {
            const service = item.service;

            const displayPrice =
              item.custom_price ??
              service?.price;

            const displayDuration =
              item.custom_duration_minutes ??
              service?.duration_minutes;

            return (
              <div
                key={item.id}
                className="flex items-start gap-4 rounded-2xl border border-ink/10 bg-white p-5 shadow-sm"
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-cyanAccent/40">
                  <Scissors
                    className="text-ink"
                    size={16}
                  />
                </div>

                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-heading font-extrabold text-ink">
                      {service?.name ||
                        "Service"}
                    </h3>

                    {displayPrice != null && (
                      <span className="text-sm font-bold text-cta">
                        $
                        {Number(
                          displayPrice
                        ).toFixed(2)}
                      </span>
                    )}

                    {displayDuration != null && (
                      <span className="text-xs text-ink/50">
                        {displayDuration} min
                      </span>
                    )}

                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                        item.active
                          ? "bg-green-100 text-green-700"
                          : "bg-muted text-ink/50"
                      }`}
                    >
                      {item.active
                        ? "Active"
                        : "Hidden"}
                    </span>
                  </div>

                  {service?.description && (
                    <p className="mt-1 text-sm text-ink/60">
                      {service.description}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      toggle(item)
                    }
                    title={
                      item.active
                        ? "Hide"
                        : "Activate"
                    }
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-ink/15 text-ink/70 hover:bg-muted"
                  >
                    {item.active ? (
                      <X size={15} />
                    ) : (
                      <Check size={15} />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      remove(item.id)
                    }
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-ink/15 text-ink/70 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
