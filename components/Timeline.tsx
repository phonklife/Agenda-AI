import React, { useState } from 'react';
import { AgendaItem } from '../types';
import { Clock, MessageSquare, Presentation, CheckCircle, Coffee, User, Plus, Trash2, Edit2, Check, CheckCircle2, Sparkles } from 'lucide-react';

interface TimelineProps {
  items: AgendaItem[];
  startTime: string;
  onStartTimeChange?: (newTime: string) => void;
  onUpdateItems?: (newItems: AgendaItem[]) => void;
  onTriggerRecap?: () => void;
  hasRecap?: boolean;
}

const Timeline: React.FC<TimelineProps> = ({
  items,
  startTime,
  onStartTimeChange,
  onUpdateItems,
  onTriggerRecap,
  hasRecap,
}) => {
  const [filter, setFilter] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<AgendaItem>>({});
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('timeline');

  const getIcon = (type: AgendaItem['type']) => {
    switch (type) {
      case 'presentation':
        return <Presentation size={15} className="text-blue-600" />;
      case 'discussion':
        return <MessageSquare size={15} className="text-purple-600" />;
      case 'decision':
        return <CheckCircle size={15} className="text-emerald-600" />;
      case 'break':
        return <Coffee size={15} className="text-amber-600" />;
      default:
        return <Clock size={15} className="text-slate-500" />;
    }
  };

  const getTypeBadge = (type: AgendaItem['type']) => {
    switch (type) {
      case 'presentation':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'discussion':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'decision':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'break':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const calculateTime = (startStr: string, minutesToAdd: number) => {
    const [hours, mins] = (startStr || '09:00').split(':').map(Number);
    const date = new Date();
    date.setHours(hours, mins, 0);
    date.setMinutes(date.getMinutes() + minutesToAdd);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const handleStartEdit = (item: AgendaItem) => {
    setEditingId(item.id);
    setEditForm({ ...item });
  };

  const handleSaveEdit = () => {
    if (!editingId || !onUpdateItems) return;
    const updated = items.map((it) => (it.id === editingId ? ({ ...it, ...editForm } as AgendaItem) : it));
    onUpdateItems(updated);
    setEditingId(null);
  };

  const handleDeleteItem = (id: string) => {
    if (!onUpdateItems) return;
    const updated = items.filter((it) => it.id !== id);
    onUpdateItems(updated);
  };

  const handleAddItem = () => {
    if (!onUpdateItems) return;
    const newItem: AgendaItem = {
      id: `item-${Date.now()}`,
      title: 'New Discussion Topic',
      description: 'Review action items and next steps.',
      durationMinutes: 15,
      type: 'discussion',
    };
    onUpdateItems([...items, newItem]);
    handleStartEdit(newItem);
  };

  const filteredItems = filter === 'all' ? items : items.filter((item) => item.type === filter);

  let currentMinutes = 0;

  return (
    <div id="meeting-timeline-wrapper" className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
            <Clock size={14} className="text-blue-600" />
            Start Time:
          </label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => onStartTimeChange?.(e.target.value)}
            className="text-xs font-mono font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter Pills */}
          <div className="flex bg-slate-100 p-0.5 rounded-xl text-xs">
            {['all', 'presentation', 'discussion', 'decision', 'break'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded-lg capitalize font-medium transition-all ${
                  filter === f ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Add topic button */}
          {onUpdateItems && (
            <button
              onClick={handleAddItem}
              className="text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-xl border border-blue-200 transition-colors flex items-center gap-1.5"
            >
              <Plus size={13} />
              Add Item
            </button>
          )}
        </div>
      </div>

      {/* Timeline Stream */}
      <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-blue-200 before:via-slate-200 before:to-transparent">
        {filteredItems.map((item, _index) => {
          const itemStartTime = calculateTime(startTime, currentMinutes);
          currentMinutes += Number(item.durationMinutes) || 0;
          const itemEndTime = calculateTime(startTime, currentMinutes);
          const isEditing = editingId === item.id;

          return (
            <div
              key={item.id}
              className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group"
            >
              {/* Dot Icon */}
              <div className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-slate-100 bg-white shadow-sm shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-transform group-hover:scale-105">
                {getIcon(item.type)}
              </div>

              {/* Card Content */}
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-5 rounded-2xl border border-slate-200/80 bg-white shadow-xs hover:shadow-md transition-all hover:border-slate-300">
                {isEditing ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editForm.title || ''}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      placeholder="Item Title"
                    />
                    <textarea
                      value={editForm.description || ''}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      rows={2}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      placeholder="Item Description"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-500">Duration (m):</label>
                        <input
                          type="number"
                          min="1"
                          max="180"
                          value={editForm.durationMinutes || 15}
                          onChange={(e) => setEditForm({ ...editForm, durationMinutes: Number(e.target.value) })}
                          className="w-16 text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1"
                        />
                        <select
                          value={editForm.type || 'discussion'}
                          onChange={(e) => setEditForm({ ...editForm, type: e.target.value as any })}
                          className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1"
                        >
                          <option value="presentation">Presentation</option>
                          <option value="discussion">Discussion</option>
                          <option value="decision">Decision</option>
                          <option value="break">Break</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={handleSaveEdit}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white p-1.5 rounded-lg text-xs flex items-center gap-1 shadow-xs"
                        >
                          <Check size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h4 className="font-bold text-slate-900 text-sm leading-snug">{item.title}</h4>
                      <time className="font-mono text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full shrink-0">
                        {itemStartTime} - {itemEndTime} ({item.durationMinutes}m)
                      </time>
                    </div>

                    <p className="text-slate-600 text-xs leading-relaxed mb-3">{item.description}</p>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${getTypeBadge(
                            item.type
                          )}`}
                        >
                          {item.type}
                        </span>
                        {item.speaker && (
                          <span className="text-[11px] text-slate-500 flex items-center gap-1">
                            <User size={12} className="text-slate-400" />
                            {item.speaker}
                          </span>
                        )}
                      </div>

                      {onUpdateItems && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          <button
                            onClick={() => handleStartEdit(item)}
                            className="text-slate-400 hover:text-blue-600 p-1 hover:bg-slate-100 rounded transition-colors"
                            title="Edit Item"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="text-slate-400 hover:text-red-600 p-1 hover:bg-red-50 rounded transition-colors"
                            title="Delete Item"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Meeting Flow Conclusion & Recap Marker */}
        <div className="relative pl-8 pt-2">
          <div className="absolute -left-3.5 top-3 w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center ring-4 ring-white shadow-xs z-10">
            <CheckCircle2 size={16} />
          </div>
          <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                  Meeting Flow Complete
                </span>
                <span className="text-xs font-bold text-slate-800">Final Step: Executive Recap</span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Summarize final decisions, confirmed action items, and follow-up communications.
              </p>
            </div>
            {onTriggerRecap && (
              <button
                onClick={onTriggerRecap}
                className="text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-2 rounded-xl transition-all shadow-2xs flex items-center gap-1.5 shrink-0"
              >
                <Sparkles size={13} className="text-emerald-300" />
                {hasRecap ? 'View Meeting Recap' : 'Generate Meeting Recap'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Timeline;
