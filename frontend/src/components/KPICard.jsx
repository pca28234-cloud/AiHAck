import React from 'react';

export default function KPICard({ title, value, unit, icon: Icon, color = 'green', delay = 0 }) {
  const colorMap = {
    green: {
      bg: 'bg-primary-50',
      icon: 'text-primary-600',
      border: 'border-primary-100',
      value: 'text-primary-800',
    },
    orange: {
      bg: 'bg-harvest-50',
      icon: 'text-harvest-600',
      border: 'border-harvest-100',
      value: 'text-harvest-800',
    },
    blue: {
      bg: 'bg-sky-50',
      icon: 'text-sky-600',
      border: 'border-sky-100',
      value: 'text-sky-800',
    },
    purple: {
      bg: 'bg-violet-50',
      icon: 'text-violet-600',
      border: 'border-violet-100',
      value: 'text-violet-800',
    },
    rose: {
      bg: 'bg-rose-50',
      icon: 'text-rose-600',
      border: 'border-rose-100',
      value: 'text-rose-800',
    },
  };

  const c = colorMap[color] || colorMap.green;

  return (
    <div
      className={`relative overflow-hidden rounded-xl border ${c.border} ${c.bg} p-5 shadow-card hover:shadow-card-hover transition-all duration-300 animate-slide-up`}
      style={{ animationDelay: `${delay}ms` }}
      id={`kpi-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1.5">
            {title}
          </p>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl font-display font-bold ${c.value}`}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </span>
            {unit && (
              <span className="text-sm font-medium text-stone-400">{unit}</span>
            )}
          </div>
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-lg ${c.bg} border ${c.border}`}>
            <Icon className={`w-5 h-5 ${c.icon}`} />
          </div>
        )}
      </div>
      {/* Decorative gradient bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 opacity-40 gradient-primary" />
    </div>
  );
}
