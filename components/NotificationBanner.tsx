import React from 'react';
import { ActionItem } from '../types';
import { BellRing, Check, Clock, X, Volume2, VolumeX, AlertTriangle } from 'lucide-react';

export interface ActiveAlert {
  item: ActionItem;
  dueStatus: string;
  diffMinutes: number;
}

interface NotificationBannerProps {
  alerts: ActiveAlert[];
  onDismiss: (itemId: string) => void;
  onMarkComplete: (itemId: string) => void;
  onSnooze: (itemId: string, minutes: number) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

const NotificationBanner: React.FC<NotificationBannerProps> = ({
  alerts,
  onDismiss,
  onMarkComplete,
  onSnooze,
  soundEnabled,
  onToggleSound,
}) => {
  if (alerts.length === 0) return null;

  return (
    <div
      id="on-screen-deadline-notifications"
      className="fixed top-5 right-5 z-50 flex flex-col gap-3 max-w-sm sm:max-w-md w-full pointer-events-none px-3 sm:px-0"
    >
      {alerts.map(({ item, dueStatus, diffMinutes }) => {
        const isPastDue = diffMinutes < 0;

        return (
          <div
            key={item.id}
            className={`pointer-events-auto rounded-2xl shadow-xl border p-4 transition-all duration-300 animate-in slide-in-from-top-3 ${
              isPastDue
                ? 'bg-rose-50/95 border-rose-200 text-rose-950 ring-1 ring-rose-300/50'
                : 'bg-amber-50/95 border-amber-200 text-amber-950 ring-1 ring-amber-300/50'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs mt-0.5 ${
                    isPastDue
                      ? 'bg-rose-600 text-white animate-bounce'
                      : 'bg-amber-500 text-white animate-pulse'
                  }`}
                >
                  <BellRing size={18} />
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        isPastDue
                          ? 'bg-rose-100 text-rose-800 border-rose-200'
                          : 'bg-amber-100 text-amber-800 border-amber-200'
                      }`}
                    >
                      {isPastDue ? 'Deadline Overdue' : 'Deadline Approaching'}
                    </span>
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <Clock size={12} className="text-slate-400" />
                      {dueStatus}
                    </span>
                  </div>

                  <p className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                    {item.task}
                  </p>

                  <div className="flex items-center gap-2 text-xs text-slate-600 pt-0.5">
                    <span className="font-semibold text-slate-700 bg-white/80 px-2 py-0.5 rounded border border-slate-200/80">
                      Owner: {item.owner}
                    </span>
                    {item.deadline && (
                      <span className="text-[11px] text-slate-500 truncate max-w-[150px]">
                        Target: {item.deadline}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={onToggleSound}
                  title={soundEnabled ? 'Disable chime' : 'Enable chime'}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white/60 rounded-lg transition-colors"
                >
                  {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
                </button>
                <button
                  onClick={() => onDismiss(item.id)}
                  title="Dismiss notification"
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white/60 rounded-lg transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Quick Action Footer */}
            <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-500 italic">
                AgendaAI Reminder
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onSnooze(item.id, 5)}
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white/90 hover:bg-white border border-slate-200 hover:border-slate-300 text-slate-700 transition-all shadow-2xs"
                >
                  Snooze 5m
                </button>
                <button
                  onClick={() => onMarkComplete(item.id)}
                  className="text-xs font-semibold px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs flex items-center gap-1"
                >
                  <Check size={13} />
                  Mark Complete
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default NotificationBanner;
