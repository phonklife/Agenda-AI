import React, { useState } from 'react';
import { ActionItem } from '../types';
import {
  Bell,
  BellRing,
  Calendar,
  Check,
  Clock,
  Plus,
  Trash2,
  X,
  AlertCircle,
  Play,
  Sparkles,
  CheckCircle2
} from 'lucide-react';

interface ActionItemsListProps {
  actionItems: ActionItem[];
  onUpdateActionItems: (items: ActionItem[]) => void;
  onTriggerInstantTestAlert: (item: ActionItem) => void;
}

const ActionItemsList: React.FC<ActionItemsListProps> = ({
  actionItems,
  onUpdateActionItems,
  onTriggerInstantTestAlert,
}) => {
  const [selectedItemForModal, setSelectedItemForModal] = useState<ActionItem | null>(null);
  const [modalDeadlineDate, setModalDeadlineDate] = useState<string>('');
  const [modalReminderOffset, setModalReminderOffset] = useState<number>(15);
  const [filter, setFilter] = useState<'all' | 'pending' | 'reminders' | 'completed'>('all');
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');
  const [newTaskOwner, setNewTaskOwner] = useState<string>('');
  const [newTaskDeadline, setNewTaskDeadline] = useState<string>('');

  // Helper to format ISO datetime-local string default
  const getDefaultDateTime = () => {
    const d = new Date();
    // Default to 1 hour from now for easy testing
    d.setHours(d.getHours() + 1);
    d.setMinutes(0);
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0, 16);
  };

  const handleOpenNotificationModal = (item: ActionItem) => {
    setSelectedItemForModal(item);
    if (item.deadlineDate) {
      setModalDeadlineDate(item.deadlineDate);
    } else {
      setModalDeadlineDate(getDefaultDateTime());
    }
    setModalReminderOffset(item.reminderMinutesBefore ?? 15);
  };

  const handleSaveNotification = () => {
    if (!selectedItemForModal) return;

    const updated = actionItems.map((it) => {
      if (it.id === selectedItemForModal.id) {
        return {
          ...it,
          deadlineDate: modalDeadlineDate,
          reminderMinutesBefore: modalReminderOffset,
          reminderSet: true,
          notified: false, // reset so it can trigger
        };
      }
      return it;
    });

    onUpdateActionItems(updated);
    setSelectedItemForModal(null);
  };

  const handleRemoveNotification = (itemId: string) => {
    const updated = actionItems.map((it) => {
      if (it.id === itemId) {
        return {
          ...it,
          reminderSet: false,
          notified: false,
        };
      }
      return it;
    });
    onUpdateActionItems(updated);
    if (selectedItemForModal?.id === itemId) {
      setSelectedItemForModal(null);
    }
  };

  const handleToggleComplete = (itemId: string) => {
    const updated = actionItems.map((it) => {
      if (it.id === itemId) {
        const nextState = !it.isCompleted;
        return {
          ...it,
          isCompleted: nextState,
          // if completed, disarm active alert
          notified: nextState ? true : false,
        };
      }
      return it;
    });
    onUpdateActionItems(updated);
  };

  const handleDeleteItem = (itemId: string) => {
    const updated = actionItems.filter((it) => it.id !== itemId);
    onUpdateActionItems(updated);
  };

  const handleCreateNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const defaultIso = getDefaultDateTime();
    const newItem: ActionItem = {
      id: `ai-${Date.now()}`,
      task: newTaskTitle.trim(),
      owner: newTaskOwner.trim() || 'Team Member',
      deadline: newTaskDeadline.trim() || 'By end of sprint',
      deadlineDate: defaultIso,
      reminderSet: true,
      reminderMinutesBefore: 15,
      isCompleted: false,
      notified: false,
    };

    onUpdateActionItems([...actionItems, newItem]);
    setNewTaskTitle('');
    setNewTaskOwner('');
    setNewTaskDeadline('');
    setIsAddingNew(false);
  };

  // Filtered action items
  const filteredItems = actionItems.filter((it) => {
    if (filter === 'pending') return !it.isCompleted;
    if (filter === 'completed') return it.isCompleted;
    if (filter === 'reminders') return it.reminderSet && !it.isCompleted;
    return true;
  });

  const completedCount = actionItems.filter((it) => it.isCompleted).length;
  const remindersCount = actionItems.filter((it) => it.reminderSet && !it.isCompleted).length;

  return (
    <section id="action-items-notification-manager" className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs relative">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center text-purple-700">
            <Calendar size={15} />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-sm">Action Items & Reminders</h2>
            <p className="text-[11px] text-slate-500">
              {completedCount} of {actionItems.length} completed • {remindersCount} notification{remindersCount === 1 ? '' : 's'} active
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAddingNew(true)}
          className="text-xs font-semibold bg-purple-50 hover:bg-purple-100 text-purple-700 px-2.5 py-1.5 rounded-xl border border-purple-200 transition-colors flex items-center gap-1 shadow-2xs"
        >
          <Plus size={13} />
          Add Item
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex bg-slate-100 p-0.5 rounded-xl text-[11px] font-semibold mb-4">
        <button
          onClick={() => setFilter('all')}
          className={`flex-1 py-1 rounded-lg transition-all ${
            filter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          All ({actionItems.length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`flex-1 py-1 rounded-lg transition-all ${
            filter === 'pending' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Pending ({actionItems.length - completedCount})
        </button>
        <button
          onClick={() => setFilter('reminders')}
          className={`flex-1 py-1 rounded-lg transition-all flex items-center justify-center gap-1 ${
            filter === 'reminders' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <BellRing size={11} className={remindersCount > 0 ? 'text-amber-500' : ''} />
          Alerts ({remindersCount})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`flex-1 py-1 rounded-lg transition-all ${
            filter === 'completed' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Done ({completedCount})
        </button>
      </div>

      {/* Add New Item Inline Form */}
      {isAddingNew && (
        <form onSubmit={handleCreateNewItem} className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 animate-in fade-in-50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">New Action Item</span>
            <button
              type="button"
              onClick={() => setIsAddingNew(false)}
              className="text-slate-400 hover:text-slate-600 text-xs"
            >
              Cancel
            </button>
          </div>
          <input
            type="text"
            required
            placeholder="What needs to be done?"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Assignee / Owner"
              value={newTaskOwner}
              onChange={(e) => setNewTaskOwner(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-lg p-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            />
            <input
              type="text"
              placeholder="Deadline (e.g. Next Tuesday)"
              value={newTaskDeadline}
              onChange={(e) => setNewTaskDeadline(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-lg p-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            />
          </div>
          <button
            type="submit"
            className="w-full py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-lg transition-colors shadow-2xs"
          >
            Save Action Item & Arm Reminder
          </button>
        </form>
      )}

      {/* Action Items List */}
      <div className="space-y-2.5">
        {filteredItems.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs italic">
            No action items match this view.
          </div>
        ) : (
          filteredItems.map((item) => {
            const hasNotification = Boolean(item.reminderSet);

            return (
              <div
                key={item.id}
                className={`p-3 rounded-xl border transition-all ${
                  item.isCompleted
                    ? 'bg-slate-50/60 border-slate-200/60 opacity-65'
                    : 'bg-slate-50/90 hover:bg-white border-slate-200/80 shadow-2xs'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {/* Complete Checkbox */}
                  <button
                    onClick={() => handleToggleComplete(item.id)}
                    className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                      item.isCompleted
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-slate-300 hover:border-slate-400 bg-white text-transparent'
                    }`}
                    title={item.isCompleted ? 'Mark incomplete' : 'Mark complete'}
                  >
                    <Check size={13} strokeWidth={3} />
                  </button>

                  {/* Task Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-xs font-semibold leading-snug ${
                        item.isCompleted ? 'line-through text-slate-400' : 'text-slate-800'
                      }`}
                    >
                      {item.task}
                    </p>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1.5 flex-wrap">
                      <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-medium text-slate-700">
                        {item.owner}
                      </span>

                      {item.deadline && (
                        <span className="flex items-center gap-1 text-slate-500">
                          <Clock size={11} className="text-slate-400" />
                          {item.deadline}
                        </span>
                      )}

                      {/* Notification Status Badge */}
                      {hasNotification && !item.isCompleted && (
                        <span className="bg-amber-50 text-amber-800 border border-amber-200/80 px-1.5 py-0.2 rounded-md font-bold text-[10px] flex items-center gap-1">
                          <BellRing size={10} className="text-amber-600 animate-pulse" />
                          Alert: {item.reminderMinutesBefore === 0 ? 'At deadline' : `${item.reminderMinutesBefore}m before`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Action Controls: Set Notification Button */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenNotificationModal(item)}
                      className={`px-2 py-1 rounded-lg text-xs font-medium border flex items-center gap-1 transition-all ${
                        hasNotification
                          ? 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:text-purple-600 hover:border-purple-200 shadow-2xs'
                      }`}
                      title="Configure deadline notification"
                    >
                      {hasNotification ? (
                        <>
                          <BellRing size={12} className="text-amber-600" />
                          <span className="text-[11px] font-semibold">Active</span>
                        </>
                      ) : (
                        <>
                          <Bell size={12} className="text-slate-400" />
                          <span className="text-[11px]">Set Notification</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1 text-slate-300 hover:text-rose-600 rounded transition-colors"
                      title="Delete action item"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Set Notification Modal / Dialog */}
      {selectedItemForModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in-50 zoom-in-95">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-amber-100 text-amber-800 rounded-xl flex items-center justify-center">
                  <BellRing size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Set Deadline Notification</h3>
                  <p className="text-xs text-slate-500">
                    Get an on-screen alert when this task is approaching its deadline.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedItemForModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Target Item Display */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-xs font-semibold text-slate-800 leading-snug">
                {selectedItemForModal.task}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                <span>Assignee: <strong className="text-slate-700">{selectedItemForModal.owner}</strong></span>
                {selectedItemForModal.deadline && <span>• Target: {selectedItemForModal.deadline}</span>}
              </div>
            </div>

            {/* Date Time Picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Clock size={13} className="text-blue-600" />
                Target Deadline Date & Time:
              </label>
              <input
                type="datetime-local"
                value={modalDeadlineDate}
                onChange={(e) => setModalDeadlineDate(e.target.value)}
                className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <p className="text-[10px] text-slate-400">
                Adjust the specific date and time for the countdown tracking engine.
              </p>
            </div>

            {/* Notification Alert Offset */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Bell size={13} className="text-amber-600" />
                Trigger On-Screen Notification:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'At deadline', minutes: 0 },
                  { label: '5 minutes before', minutes: 5 },
                  { label: '15 minutes before', minutes: 15 },
                  { label: '30 minutes before', minutes: 30 },
                  { label: '1 hour before', minutes: 60 },
                  { label: '1 day before', minutes: 1440 },
                ].map((opt) => (
                  <button
                    key={opt.minutes}
                    type="button"
                    onClick={() => setModalReminderOffset(opt.minutes)}
                    className={`p-2 rounded-xl text-xs font-medium border text-left transition-all ${
                      modalReminderOffset === opt.minutes
                        ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Test Alert Button */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  onTriggerInstantTestAlert(selectedItemForModal);
                  setSelectedItemForModal(null);
                }}
                className="text-xs font-semibold text-slate-600 hover:text-amber-700 bg-slate-100 hover:bg-amber-50 px-3 py-2 rounded-xl border border-slate-200 hover:border-amber-200 transition-colors flex items-center gap-1.5"
                title="Immediately test what the on-screen notification looks like"
              >
                <Play size={12} className="text-amber-600 fill-amber-600" />
                Test Alert Now
              </button>

              <div className="flex items-center gap-2">
                {selectedItemForModal.reminderSet && (
                  <button
                    type="button"
                    onClick={() => handleRemoveNotification(selectedItemForModal.id)}
                    className="text-xs font-medium text-rose-600 hover:text-rose-700 px-3 py-2"
                  >
                    Turn Off
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSaveNotification}
                  className="text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                >
                  <Check size={14} />
                  Save Notification
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ActionItemsList;
