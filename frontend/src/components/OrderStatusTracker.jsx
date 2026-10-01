import React from 'react';
import { CheckCircle, Circle, Truck, Package, RotateCcw } from 'lucide-react';

const STEPS = [
  { key: 'requested',           label: 'Request Sent',          icon: Package },
  { key: 'accepted',            label: 'Farmer Accepted',        icon: CheckCircle },
  { key: 'transport_allocated', label: 'Transport Allocated',    icon: Truck },
  { key: 'pickup',              label: 'Pickup In Progress',     icon: Truck },
  { key: 'in_transit',          label: 'In Transit',             icon: Truck },
  { key: 'delivered',           label: 'Delivered',              icon: CheckCircle },
];

const STATUS_INDEX = {
  requested: 0,
  accepted: 1,
  transport_allocated: 2,
  pickup: 3,
  pickup_started: 3,
  picking_up: 3,
  picked_up: 4,
  in_transit: 4,
  delivered: 5,
  rejected: -1,
};

export default function OrderStatusTracker({ status }) {
  const currentIndex = STATUS_INDEX[status] ?? 0;

  if (status === 'rejected') {
    return (
      <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-sm">
        <RotateCcw className="w-4 h-4" />
        Request was rejected by the farmer.
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Connector line */}
      <div className="absolute top-4 left-4 right-4 h-0.5 bg-stone-100" />
      <div
        className="absolute top-4 left-4 h-0.5 bg-primary-500 transition-all duration-700"
        style={{ width: `${(currentIndex / (STEPS.length - 1)) * (100 - 8)}%` }}
      />

      <div className="relative flex justify-between">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const done = i < currentIndex;
          const active = i === currentIndex;
          return (
            <div key={step.key} className="flex flex-col items-center gap-1 min-w-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-500 z-10 ${
                done
                  ? 'bg-primary-500 border-primary-500 text-white'
                  : active
                    ? 'bg-white border-primary-500 text-primary-600 shadow-md shadow-primary-500/20'
                    : 'bg-white border-stone-200 text-stone-300'
              }`}>
                {done ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <span className={`text-[10px] font-bold text-center leading-tight max-w-[60px] ${
                active ? 'text-primary-700' : done ? 'text-primary-500' : 'text-stone-400'
              }`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
