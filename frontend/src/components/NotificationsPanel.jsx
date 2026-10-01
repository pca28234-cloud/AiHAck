import React from 'react';
import { Bell, Check, Package, Truck, CheckCircle, Clock, X } from 'lucide-react';
import { markNotificationRead } from '../services/api';

const eventIcon = {
  buyer_request_created: <Package className="w-4 h-4" />,
  request_accepted: <CheckCircle className="w-4 h-4" />,
  request_rejected: <X className="w-4 h-4" />,
  transport_allocated: <Truck className="w-4 h-4" />,
  truck_status_updated: <Truck className="w-4 h-4" />,
  notification: <Bell className="w-4 h-4" />,
};

const eventColor = {
  buyer_request_created: 'bg-blue-50 text-blue-600',
  request_accepted: 'bg-primary-50 text-primary-600',
  request_rejected: 'bg-rose-50 text-rose-600',
  transport_allocated: 'bg-violet-50 text-violet-600',
  truck_status_updated: 'bg-amber-50 text-amber-600',
  notification: 'bg-stone-100 text-stone-600',
};

export default function NotificationsPanel({ notifications = [], onMarkRead, maxShown = 5 }) {
  const unread = notifications.filter(n => !n.is_read).length;
  const shown = notifications.slice(0, maxShown);

  const handleRead = async (id) => {
    try {
      await markNotificationRead(id);
      if (onMarkRead) onMarkRead(id);
    } catch (e) {
      // ignore
    }
  };

  if (notifications.length === 0) {
    return (
      <div className="text-center py-8 text-stone-400">
        <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">No notifications yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {shown.map((n) => (
        <div
          key={n.id}
          className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
            n.is_read
              ? 'bg-white border-stone-100 opacity-70'
              : 'bg-stone-50 border-stone-200 shadow-sm'
          }`}
        >
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${eventColor[n.event] || eventColor.notification}`}>
            {eventIcon[n.event] || eventIcon.notification}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-bold ${n.is_read ? 'text-stone-500' : 'text-stone-900'}`}>{n.title}</p>
            <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">{n.message}</p>
            {n.created_at && (
              <p className="text-[10px] text-stone-400 mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(n.created_at).toLocaleTimeString()}
              </p>
            )}
          </div>
          {!n.is_read && (
            <button
              onClick={() => handleRead(n.id)}
              className="p-1 hover:bg-stone-200 rounded-lg transition-colors flex-shrink-0"
              title="Mark as read"
            >
              <Check className="w-3.5 h-3.5 text-stone-400" />
            </button>
          )}
        </div>
      ))}
      {notifications.length > maxShown && (
        <p className="text-center text-xs text-stone-400 py-2">
          +{notifications.length - maxShown} more notifications
        </p>
      )}
    </div>
  );
}
