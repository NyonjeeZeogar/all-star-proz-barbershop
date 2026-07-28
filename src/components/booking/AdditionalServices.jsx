import React from "react";
import { formatCents, dollarsToCents } from "@/lib/pricing";

const MAX_QUANTITY = 4;

export default function AdditionalServices({
  services = [],
  selected = [],
  onChange,
  includeAddOns = true,
  title = "Additional services",
  description = "Choose a quantity for each service. Leave it at zero to skip it.",
}) {
  const availableServices = services.filter((service) =>
    includeAddOns ? service.is_add_on === true : service.is_add_on !== true
  );

  const selectedById = new Map(
    selected.map((item) => [item.service_id || item.id, item])
  );

  function setQuantity(service, nextQuantity) {
    const quantity = Math.min(
      MAX_QUANTITY,
      Math.max(0, Number.parseInt(nextQuantity, 10) || 0)
    );

    const withoutService = selected.filter(
      (item) => (item.service_id || item.id) !== service.id
    );

    onChange?.(
      quantity === 0
        ? withoutService
        : [
            ...withoutService,
            {
              ...service,
              service_id: service.id,
              quantity,
            },
          ]
    );
  }

  if (availableServices.length === 0) return null;

  return (
    <section className="space-y-3">
      <div>
        <h3 className="font-heading text-lg font-bold text-ink">{title}</h3>
        <p className="mt-1 text-xs text-ink/55">{description}</p>
      </div>

      <div className="divide-y divide-ink/10 rounded-2xl border border-ink/10 bg-white px-4">
        {availableServices.map((service) => {
          const item = selectedById.get(service.id);
          const quantity = Number(item?.quantity || 0);

          return (
            <div
              key={service.id}
              className="flex items-center justify-between gap-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate font-heading text-sm font-bold text-ink">
                  {service.name}
                </p>
                <p className="mt-0.5 text-xs text-ink/55">
                  {formatCents(dollarsToCents(service.price))} ·{" "}
                  {service.duration_minutes} min each
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  aria-label={`Decrease ${service.name} quantity`}
                  disabled={quantity === 0}
                  onClick={() => setQuantity(service, quantity - 1)}
                  className="grid h-8 w-8 place-items-center rounded-full border border-ink/15 text-lg font-bold text-ink disabled:opacity-30"
                >
                  −
                </button>
                <span className="w-6 text-center font-heading text-sm font-bold text-ink">
                  {quantity}
                </span>
                <button
                  type="button"
                  aria-label={`Increase ${service.name} quantity`}
                  disabled={quantity >= MAX_QUANTITY}
                  onClick={() => setQuantity(service, quantity + 1)}
                  className="grid h-8 w-8 place-items-center rounded-full border border-ink/15 text-lg font-bold text-ink disabled:opacity-30"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
