import React, { useState, useEffect } from 'react';
import {
  Upload,
  FileText,
  Users,
  Calendar,
  Clock,
  Sparkles,
  Loader2,
  ChevronRight,
  AlertCircle,
  Download,
  Copy,
  Check,
  RotateCcw,
  CheckCircle2,
  Sliders,
  FileCode,
  FilePlus,
  BellRing,
  Bell,
  Volume2,
  VolumeX,
  FileCheck2,
} from 'lucide-react';
import { MeetingPlan, AgendaItem, ActionItem, MeetingRecapData } from './types';
import { generateMeetingPlan } from './services/geminiService';
import Timeline from './components/Timeline';
import ChatBot from './components/ChatBot';
import ActionItemsList from './components/ActionItemsList';
import MeetingRecap from './components/MeetingRecap';
import NotificationBanner, { ActiveAlert } from './components/NotificationBanner';
import { playChime } from './utils/audioAlert';
import { SAMPLE_DOCUMENTS, SampleDoc } from './sampleData';
import { initAuth, googleSignIn, logout as googleLogout } from './services/authService';
import GoogleDrivePicker from './components/GoogleDrivePicker';
import { User } from 'firebase/auth';

const App: React.FC = () => {
  const [docContent, setDocContent] = useState<string>('');
  const [fileData, setFileData] = useState<{ base64: string; mimeType: string } | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [meetingPlan, setMeetingPlan] = useState<MeetingPlan | null>(null);
  const [modelUsed, setModelUsed] = useState<string>('Gemini 3 Pro');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<string>('09:00');
  const [inputMode, setInputMode] = useState<'upload' | 'paste' | 'samples'>('upload');
  const [targetDuration, setTargetDuration] = useState<number>(45);
  const [meetingType, setMeetingType] = useState<string>('Standard Review & Alignment');

  // Auth & Drive State
  const [user, setUser] = useState<User | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showDrivePicker, setShowDrivePicker] = useState(false);

  // Notification tracking state
  const [activeAlerts, setActiveAlerts] = useState<ActiveAlert[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showNotificationCenter, setShowNotificationCenter] = useState<boolean>(false);

  // File Upload Handler
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);

    const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
    const isImage = file.type.startsWith('image/');

    if (isPdf || isImage) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const resultStr = e.target?.result as string;
        const base64Data = resultStr.split(',')[1];
        setFileData({
          base64: base64Data,
          mimeType: file.type || (isPdf ? 'application/pdf' : 'image/jpeg'),
        });
        setDocContent(`[Binary document: ${file.name} (${Math.round(file.size / 1024)} KB)]`);
      };
      reader.readAsDataURL(file);
    } else {
      setFileData(null);
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setDocContent(content);
      };
      reader.readAsText(file);
    }
  };

  const handleSelectSample = (sample: SampleDoc) => {
    setFileName(sample.fileName);
    setDocContent(sample.content);
    setFileData(null);
    setInputMode('upload');
  };

  // Auth Initialization
  useEffect(() => {
    const unsubscribe = initAuth(
      (user) => {
        setUser(user);
        setNeedsAuth(false);
      },
      () => {
        setUser(null);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setNeedsAuth(false);
      }
    } catch (err: any) {
      setError(`Login failed: ${err.message}`);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await googleLogout();
      setUser(null);
      setNeedsAuth(true);
      handleReset();
    } catch (err: any) {
      setError(`Logout failed: ${err.message}`);
    }
  };

  const handleDriveFileSelected = (content: string, name: string) => {
    setFileName(name);
    setDocContent(content);
    setFileData(null);
    setInputMode('upload');
  };

  const processDocument = async () => {
    if (!docContent && !fileData) return;
    setIsProcessing(true);
    setError(null);
    try {
      const result = await generateMeetingPlan(
        docContent,
        fileData || undefined,
        {
          targetDuration,
          meetingType,
        }
      );

      // Enhance action items with deadline tracking & notification settings
      const mappedActionItems: ActionItem[] = (result.meetingPlan.actionItems || []).map((ai, index) => {
        const d = new Date();
        if (index === 0) {
          // Schedule first item due in 10 minutes so it demonstrates the approaching notification immediately
          d.setMinutes(d.getMinutes() + 10);
        } else if (index === 1) {
          d.setHours(d.getHours() + 2);
        } else {
          d.setDate(d.getDate() + 1);
        }
        const offset = d.getTimezoneOffset() * 60000;
        const isoLocal = new Date(d.getTime() - offset).toISOString().slice(0, 16);

        return {
          ...ai,
          id: ai.id || `ai-${Date.now()}-${index}`,
          deadlineDate: isoLocal,
          reminderSet: true,
          reminderMinutesBefore: 15,
          isCompleted: false,
          notified: false,
        };
      });

      const updatedPlan: MeetingPlan = {
        ...result.meetingPlan,
        actionItems: mappedActionItems,
      };

      setMeetingPlan(updatedPlan);
      if (result.modelUsed) {
        setModelUsed(result.modelUsed);
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to generate meeting agenda. Please try a different document or try again later.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Heartbeat Deadline & Notification Tracking Engine
  useEffect(() => {
    if (!meetingPlan?.actionItems || meetingPlan.actionItems.length === 0) {
      setActiveAlerts([]);
      return;
    }

    const checkDeadlines = () => {
      const now = Date.now();
      const newAlerts: ActiveAlert[] = [];

      meetingPlan.actionItems?.forEach((item) => {
        if (item.isCompleted) return;
        if (!item.reminderSet) return;

        // Skip if snoozed
        if (item.snoozedUntil && now < item.snoozedUntil) return;

        // Determine deadline timestamp
        let targetTimestamp: number | null = null;
        if (item.deadlineDate) {
          targetTimestamp = new Date(item.deadlineDate).getTime();
        } else if (item.deadline) {
          const parsed = Date.parse(item.deadline);
          if (!isNaN(parsed)) {
            targetTimestamp = parsed;
          }
        }

        if (!targetTimestamp) return;

        const diffMs = targetTimestamp - now;
        const diffMinutes = Math.round(diffMs / 60000);
        const thresholdMinutes = item.reminderMinutesBefore ?? 15;

        // Approaching deadline condition: within threshold minutes or up to 2 hours overdue
        if (diffMinutes <= thresholdMinutes && diffMinutes >= -120) {
          let dueStatus = '';
          if (diffMinutes > 1) {
            dueStatus = `Due in ${diffMinutes}m`;
          } else if (diffMinutes === 1) {
            dueStatus = `Due in 1m`;
          } else if (diffMinutes === 0) {
            dueStatus = `Due right now!`;
          } else {
            dueStatus = `${Math.abs(diffMinutes)}m overdue`;
          }

          newAlerts.push({
            item,
            dueStatus,
            diffMinutes,
          });
        }
      });

      setActiveAlerts((prevAlerts) => {
        const prevIds = new Set(prevAlerts.map((a) => a.item.id));
        const hasNewlyTriggered = newAlerts.some((a) => !prevIds.has(a.item.id));
        if (hasNewlyTriggered && soundEnabled) {
          playChime();
        }
        return newAlerts;
      });
    };

    checkDeadlines();
    const intervalId = setInterval(checkDeadlines, 5000);
    return () => clearInterval(intervalId);
  }, [meetingPlan?.actionItems, soundEnabled]);

  // Notification Banner actions
  const handleDismissAlert = (itemId: string) => {
    setActiveAlerts((prev) => prev.filter((a) => a.item.id !== itemId));
    // Temporarily snooze for 30 minutes so it doesn't immediately re-pop
    if (meetingPlan?.actionItems) {
      const updated = meetingPlan.actionItems.map((it) => {
        if (it.id === itemId) {
          return {
            ...it,
            snoozedUntil: Date.now() + 30 * 60 * 1000,
          };
        }
        return it;
      });
      setMeetingPlan({ ...meetingPlan, actionItems: updated });
    }
  };

  const handleMarkCompleteFromAlert = (itemId: string) => {
    setActiveAlerts((prev) => prev.filter((a) => a.item.id !== itemId));
    if (meetingPlan?.actionItems) {
      const updated = meetingPlan.actionItems.map((it) => {
        if (it.id === itemId) {
          return {
            ...it,
            isCompleted: true,
            reminderSet: false,
          };
        }
        return it;
      });
      setMeetingPlan({ ...meetingPlan, actionItems: updated });
    }
  };

  const handleSnoozeAlert = (itemId: string, minutes: number) => {
    setActiveAlerts((prev) => prev.filter((a) => a.item.id !== itemId));
    if (meetingPlan?.actionItems) {
      const updated = meetingPlan.actionItems.map((it) => {
        if (it.id === itemId) {
          return {
            ...it,
            snoozedUntil: Date.now() + minutes * 60 * 1000,
          };
        }
        return it;
      });
      setMeetingPlan({ ...meetingPlan, actionItems: updated });
    }
  };

  const handleTriggerInstantTestAlert = (item: ActionItem) => {
    const testAlert: ActiveAlert = {
      item,
      dueStatus: 'Due in 3 minutes (Test)',
      diffMinutes: 3,
    };

    setActiveAlerts((prev) => {
      const filtered = prev.filter((a) => a.item.id !== item.id);
      return [testAlert, ...filtered];
    });

    if (soundEnabled) {
      playChime();
    }
  };

  const handleUpdateActionItems = (newActionItems: ActionItem[]) => {
    if (!meetingPlan) return;
    setMeetingPlan({
      ...meetingPlan,
      actionItems: newActionItems,
    });
  };

  const handleUpdateRecap = (recap: MeetingRecapData) => {
    if (!meetingPlan) return;
    setMeetingPlan({
      ...meetingPlan,
      recap,
    });
  };

  const handleSyncActionItemsFromRecap = (newItems: ActionItem[]) => {
    if (!meetingPlan) return;
    const current = meetingPlan.actionItems || [];
    setMeetingPlan({
      ...meetingPlan,
      actionItems: [...current, ...newItems],
    });
  };

  const handleScrollToRecap = () => {
    const el = document.getElementById('meeting-recap');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleExportICS = () => {
    if (!meetingPlan) return;
    const [hours, mins] = (startTime || '09:00').split(':').map(Number);
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, mins, 0);
    const endDate = new Date(startDate.getTime() + (meetingPlan.totalDuration || 60) * 60000);

    const formatICSDate = (d: Date) => {
      return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    let description = `${meetingPlan.objective}\\n\\n--- AGENDA ITEMS ---\\n`;
    meetingPlan.items.forEach((it, idx) => {
      description += `${idx + 1}. ${it.title} (${it.durationMinutes}m): ${it.description}\\n`;
    });
    if (meetingPlan.actionItems && meetingPlan.actionItems.length > 0) {
      description += `\\n--- ACTION ITEMS ---\\n`;
      meetingPlan.actionItems.forEach((ai) => {
        description += `• [${ai.owner}] ${ai.task} ${ai.deadline ? `(Due: ${ai.deadline})` : ''}\\n`;
      });
    }

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//AgendaAI//Smart Meeting Architect//EN',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:${Date.now()}@agendaai.app`,
      `DTSTAMP:${formatICSDate(new Date())}`,
      `DTSTART:${formatICSDate(startDate)}`,
      `DTEND:${formatICSDate(endDate)}`,
      `SUMMARY:${meetingPlan.title.replace(/[\r\n]+/g, ' ')}`,
      `DESCRIPTION:${description}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${(meetingPlan.title || 'agenda').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyMarkdown = () => {
    if (!meetingPlan) return;
    let md = `# ${meetingPlan.title}\n\n`;
    md += `**Objective:** ${meetingPlan.objective}\n`;
    md += `**Total Duration:** ${meetingPlan.totalDuration} minutes\n`;
    md += `**Proposed Start Time:** ${startTime}\n\n`;

    md += `## Key Stakeholders\n`;
    meetingPlan.stakeholders.forEach((s) => {
      md += `- **${s.name}** (${s.role}): ${s.contribution}\n`;
    });

    md += `\n## Meeting Timeline\n`;
    meetingPlan.items.forEach((item, i) => {
      md += `${i + 1}. **${item.title}** (${item.durationMinutes}m - *${item.type}*)\n   ${item.description}\n`;
    });

    if (meetingPlan.keyDecisionsNeeded && meetingPlan.keyDecisionsNeeded.length > 0) {
      md += `\n## Key Decisions Needed\n`;
      meetingPlan.keyDecisionsNeeded.forEach((d) => {
        md += `- [ ] ${d}\n`;
      });
    }

    if (meetingPlan.actionItems && meetingPlan.actionItems.length > 0) {
      md += `\n## Action Items\n`;
      meetingPlan.actionItems.forEach((a) => {
        md += `- [${a.isCompleted ? 'x' : ' '}] **${a.owner}**: ${a.task} ${a.deadline ? `(Due: ${a.deadline})` : ''}\n`;
      });
    }

    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setMeetingPlan(null);
    setDocContent('');
    setFileData(null);
    setFileName('');
    setError(null);
    setActiveAlerts([]);
  };

  const handleUpdateItems = (newItems: AgendaItem[]) => {
    if (!meetingPlan) return;
    const total = newItems.reduce((acc, curr) => acc + (Number(curr.durationMinutes) || 0), 0);
    setMeetingPlan({
      ...meetingPlan,
      items: newItems,
      totalDuration: total,
    });
  };

  const totalActiveReminders =
    meetingPlan?.actionItems?.filter((it) => it.reminderSet && !it.isCompleted).length || 0;

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-900 overflow-hidden font-sans relative">
      {/* On-Screen Notification Banner / Toast */}
      <NotificationBanner
        alerts={activeAlerts}
        onDismiss={handleDismissAlert}
        onMarkComplete={handleMarkCompleteFromAlert}
        onSnooze={handleSnoozeAlert}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((v) => !v)}
      />

      {/* Sidebar - File Management & Config */}
      <aside className="w-84 md:w-96 border-r border-slate-200 bg-white flex flex-col shrink-0 z-20 shadow-xs">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-xs">
              <Calendar size={19} />
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-900 tracking-tight leading-tight">AgendaAI</h1>
              <p className="text-[11px] text-slate-500 font-medium">Smart Meeting Architect</p>
            </div>
          </div>
          {meetingPlan && (
            <button
              onClick={handleReset}
              className="text-xs text-slate-500 hover:text-blue-600 font-medium flex items-center gap-1 bg-slate-50 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg transition-colors border border-slate-200"
              title="Start New Document"
            >
              <RotateCcw size={13} />
              New
            </button>
          )}
        </div>

        {/* Input Controls */}
        <div className="p-5 border-b border-slate-100 space-y-4 overflow-y-auto">
          {/* Input Mode Selector */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setInputMode('upload')}
              className={`flex-1 py-1.5 rounded-lg transition-all text-center flex items-center justify-center gap-1 ${
                inputMode === 'upload' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Upload size={12} />
              Upload
            </button>
            <button
              onClick={() => setInputMode('paste')}
              className={`flex-1 py-1.5 rounded-lg transition-all text-center flex items-center justify-center gap-1 ${
                inputMode === 'paste' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <FileCode size={12} />
              Paste Text
            </button>
            <button
              onClick={() => setInputMode('samples')}
              className={`flex-1 py-1.5 rounded-lg transition-all text-center flex items-center justify-center gap-1 ${
                inputMode === 'samples' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <FilePlus size={12} />
              Samples
            </button>
          </div>

          {/* Upload View */}
          {inputMode === 'upload' && (
            <div className="space-y-3">
              {needsAuth ? (
                <button
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                  className="w-full border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 rounded-2xl p-6 transition-all flex flex-col items-center justify-center text-center bg-slate-50/50 group"
                >
                  <div className="w-11 h-11 bg-white rounded-xl shadow-xs border border-slate-200 flex items-center justify-center mb-2.5 group-hover:scale-105 group-hover:border-blue-200 transition-transform">
                    {isLoggingIn ? <Loader2 className="animate-spin text-blue-600" size={20} /> : <Users className="text-slate-400 group-hover:text-blue-600" size={20} />}
                  </div>
                  <p className="text-xs font-semibold text-slate-800">
                    Sign in with Google
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    To import files from Google Drive
                  </p>
                </button>
              ) : (
                <button
                  onClick={() => setShowDrivePicker(true)}
                  className="w-full border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 rounded-2xl p-6 transition-all flex flex-col items-center justify-center text-center bg-slate-50/50 group"
                >
                  <div className="w-11 h-11 bg-white rounded-xl shadow-xs border border-slate-200 flex items-center justify-center mb-2.5 group-hover:scale-105 group-hover:border-blue-200 transition-transform">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-slate-800">
                    Import from Google Drive
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Select a Doc, Markdown, or Text file
                  </p>
                </button>
              )}

              <div className="relative flex items-center gap-4 py-2">
                <div className="flex-1 h-px bg-slate-100"></div>
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">OR</span>
                <div className="flex-1 h-px bg-slate-100"></div>
              </div>

              <div className="relative group">
                <input
                  type="file"
                  onChange={handleFileUpload}
                  accept=".txt,.md,.markdown,.json,.csv,.pdf,image/*"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="border-2 border-dashed border-slate-200 group-hover:border-blue-500 group-hover:bg-blue-50/40 rounded-2xl p-6 transition-all flex flex-col items-center justify-center text-center bg-slate-50/50">
                  <div className="w-11 h-11 bg-white rounded-xl shadow-xs border border-slate-200 flex items-center justify-center mb-2.5 group-hover:scale-105 group-hover:border-blue-200 transition-transform">
                    <Upload className="text-slate-400 group-hover:text-blue-600" size={20} />
                  </div>
                  <p className="text-xs font-semibold text-slate-800 line-clamp-1 max-w-[200px]">
                    {fileName || 'Click to upload local document'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Supports PDF, Markdown, Text, CSV, JSON, Images
                  </p>
                </div>
              </div>

              {fileName && (
                <div className="p-2.5 bg-blue-50/80 border border-blue-100 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate pr-2">
                    <FileText className="text-blue-600 shrink-0" size={15} />
                    <span className="font-semibold text-blue-900 truncate">{fileName}</span>
                  </div>
                  <button
                    onClick={() => {
                      setFileName('');
                      setDocContent('');
                      setFileData(null);
                    }}
                    className="text-blue-500 hover:text-blue-700 font-bold"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Paste View */}
          {inputMode === 'paste' && (
            <div className="space-y-2">
              <textarea
                value={docContent}
                onChange={(e) => {
                  setDocContent(e.target.value);
                  setFileName('pasted_document.txt');
                  setFileData(null);
                }}
                rows={5}
                placeholder="Paste meeting notes, PRD requirements, project brief, or transcript here..."
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <span className="text-[10px] text-slate-400 block text-right">
                {docContent.length} characters
              </span>
            </div>
          )}

          {/* Samples View */}
          {inputMode === 'samples' && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 font-medium">Select a sample document to test:</p>
              <div className="space-y-2">
                {SAMPLE_DOCUMENTS.map((sample) => (
                  <button
                    key={sample.id}
                    onClick={() => handleSelectSample(sample)}
                    className="w-full text-left p-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl transition-all group"
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                        {sample.category}
                      </span>
                      <span className="text-slate-300 group-hover:text-blue-500 text-xs">→</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 group-hover:text-blue-950">
                      {sample.title}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tuning Options */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 flex items-center gap-1">
                <Sliders size={13} className="text-slate-400" />
                Target Duration:
              </span>
              <select
                value={targetDuration}
                onChange={(e) => setTargetDuration(Number(e.target.value))}
                className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-800 focus:outline-none"
              >
                <option value={30}>30 mins</option>
                <option value={45}>45 mins</option>
                <option value={60}>60 mins (1 hr)</option>
                <option value={90}>90 mins (1.5 hr)</option>
              </select>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">Meeting Style:</span>
              <select
                value={meetingType}
                onChange={(e) => setMeetingType(e.target.value)}
                className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-800 focus:outline-none max-w-[170px]"
              >
                <option value="Executive Review & Decisions">Executive Review</option>
                <option value="Agile Sprint & Planning">Sprint Planning</option>
                <option value="Cross-functional Strategy Sync">Strategy Sync</option>
                <option value="Technical Design Review">Design Review</option>
              </select>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={processDocument}
            disabled={(!docContent && !fileData) || isProcessing}
            className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            {isProcessing ? (
              <>
                <Loader2 className="animate-spin text-blue-400" size={16} />
                <span>Extracting with Gemini 3 Pro...</span>
              </>
            ) : (
              <>
                <Sparkles size={15} className="text-blue-400" />
                <span>Generate Structured Agenda</span>
              </>
            )}
          </button>
        </div>

        {/* Current Agenda Summary in Sidebar */}
        <div className="flex-1 p-5 overflow-y-auto">
          <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
            Current Agenda
          </h2>
          {meetingPlan ? (
            <div className="space-y-3">
              <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl">
                <div className="flex items-start gap-2.5">
                  <FileText className="text-blue-600 shrink-0 mt-0.5" size={16} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-blue-950 truncate leading-snug">
                      {meetingPlan.title}
                    </p>
                    <p className="text-[11px] text-blue-700 font-medium mt-0.5">
                      {meetingPlan.totalDuration}m • {meetingPlan.items.length} topics • {meetingPlan.actionItems?.length || 0} action items
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Exports */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleExportICS}
                  className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Download size={13} className="text-blue-600" />
                  .ICS File
                </button>
                <button
                  onClick={handleCopyMarkdown}
                  className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check size={13} className="text-emerald-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={13} className="text-slate-500" />
                      Copy MD
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 px-4 border border-dashed border-slate-200 rounded-2xl">
              <FileText size={24} className="text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-400 font-medium">Upload or paste a document to generate an agenda.</p>
            </div>
          )}
        </div>

        {/* Gemini Notice Card */}
        <div className="p-5 border-t border-slate-100 bg-slate-50/50">
          {user && (
            <div className="mb-4 flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
              <div className="flex items-center gap-2 overflow-hidden">
                <img src={user.photoURL || ''} alt="" className="w-6 h-6 rounded-full border border-slate-100" />
                <div className="truncate">
                  <p className="text-[10px] font-bold text-slate-800 truncate">{user.displayName}</p>
                  <p className="text-[9px] text-slate-400 truncate">{user.email}</p>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="text-[10px] font-bold text-red-500 hover:text-red-700 uppercase"
              >
                Sign Out
              </button>
            </div>
          )}
          <div className="bg-amber-50/80 rounded-xl p-3.5 border border-amber-200/80">
            <div className="flex gap-2.5 items-start">
              <Sparkles className="text-amber-600 shrink-0 mt-0.5" size={16} />
              <div>
                <p className="text-xs font-bold text-amber-900">Powered by Gemini 3</p>
                <p className="text-[11px] text-amber-800 leading-relaxed mt-0.5">
                  AgendaAI uses Gemini 3 Pro to extract structured data from your files.
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto flex flex-col bg-[#F8FAFC]">
        {showDrivePicker && (
          <GoogleDrivePicker 
            onFileSelected={handleDriveFileSelected}
            onClose={() => setShowDrivePicker(false)}
          />
        )}
        {meetingPlan ? (
          <div className="p-6 md:p-10 max-w-6xl mx-auto w-full space-y-8">
            {/* Header / Summary */}
            <header className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 shadow-xs relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-blue-50/60 rounded-full -mr-28 -mt-28 blur-3xl pointer-events-none"></div>

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                <div className="space-y-2.5 max-w-2xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-blue-50 text-blue-700 border border-blue-100 font-bold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                      Meeting Architect
                    </span>
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Sparkles size={10} />
                      {modelUsed}
                    </span>
                    {totalActiveReminders > 0 && (
                      <span className="bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <BellRing size={10} className="text-amber-600 animate-pulse" />
                        {totalActiveReminders} Notification{totalActiveReminders === 1 ? '' : 's'} Active
                      </span>
                    )}
                    {fileName && (
                      <span className="text-[11px] text-slate-400 font-medium truncate max-w-[200px]">
                        Source: {fileName}
                      </span>
                    )}
                  </div>

                  <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
                    {meetingPlan.title}
                  </h1>
                  <p className="text-slate-600 text-sm md:text-base leading-relaxed">
                    {meetingPlan.objective}
                  </p>
                </div>

                {/* Key Metric Badges & Export Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 flex items-center gap-3">
                    <div className="w-9 h-9 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-blue-600 shadow-xs">
                      <Clock size={18} />
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 font-medium">Duration</p>
                      <p className="text-base font-bold text-slate-900">{meetingPlan.totalDuration}m</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 flex items-center gap-3">
                    <div className="w-9 h-9 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-blue-600 shadow-xs">
                      <Users size={18} />
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 font-medium">Stakeholders</p>
                      <p className="text-base font-bold text-slate-900">{meetingPlan.stakeholders.length}</p>
                    </div>
                  </div>

                  {/* Actions & Sound Toggle */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSoundEnabled((v) => !v)}
                      className={`p-3 rounded-2xl border transition-colors shadow-xs ${
                        soundEnabled
                          ? 'bg-amber-50 border-amber-200 text-amber-800'
                          : 'bg-white border-slate-200 text-slate-400'
                      }`}
                      title={soundEnabled ? 'Chime sound enabled' : 'Chime sound muted'}
                    >
                      {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                    </button>
                    <button
                      onClick={handleScrollToRecap}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-3 rounded-2xl text-xs flex items-center gap-2 transition-colors shadow-xs"
                      title="Jump to Meeting Recap"
                    >
                      <FileCheck2 size={14} />
                      <span>{meetingPlan.recap ? 'View Recap' : 'Meeting Recap'}</span>
                      {meetingPlan.recap && (
                        <span className="w-2 h-2 rounded-full bg-emerald-300"></span>
                      )}
                    </button>
                    <button
                      onClick={handleExportICS}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-3 rounded-2xl text-xs flex items-center gap-2 transition-colors shadow-xs"
                      title="Download calendar invite (.ics)"
                    >
                      <Calendar size={14} />
                      Calendar (.ICS)
                    </button>
                    <button
                      onClick={handleCopyMarkdown}
                      className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold px-4 py-3 rounded-2xl text-xs flex items-center gap-2 transition-colors shadow-xs"
                    >
                      {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>
            </header>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Stakeholders, Decisions & Chat */}
              <div className="lg:col-span-1 space-y-6">
                {/* Stakeholders Card */}
                <section className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs relative overflow-hidden">
                  <h2 className="font-bold text-slate-900 mb-4 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Users className="text-blue-600" size={16} />
                      Key Stakeholders
                    </span>
                    <span className="text-xs text-slate-400 font-normal">
                      {meetingPlan.stakeholders.length} invited
                    </span>
                  </h2>

                  <div className="space-y-3">
                    {meetingPlan.stakeholders.map((s, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 bg-slate-50/70 hover:bg-white border border-slate-100 hover:border-slate-200 rounded-xl transition-all"
                      >
                        <div className="flex items-center gap-2.5 mb-1.5">
                          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700 text-xs">
                            {s.name.charAt(0)}
                          </div>
                          <div className="truncate">
                            <p className="text-xs font-bold text-slate-900 truncate">{s.name}</p>
                            <p className="text-[11px] text-slate-500 font-medium truncate">{s.role}</p>
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed italic border-l-2 border-slate-200 pl-2.5">
                          "{s.contribution}"
                        </p>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Key Decisions Needed */}
                {meetingPlan.keyDecisionsNeeded && meetingPlan.keyDecisionsNeeded.length > 0 && (
                  <section className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
                    <h2 className="font-bold text-slate-900 mb-3 flex items-center gap-2 text-sm">
                      <CheckCircle2 className="text-emerald-600" size={16} />
                      Key Decisions Needed
                    </h2>
                    <ul className="space-y-2">
                      {meetingPlan.keyDecisionsNeeded.map((dec, i) => (
                        <li
                          key={i}
                          className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-start gap-2"
                        >
                          <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <span className="leading-snug">{dec}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* AI Assistant Chat */}
                <section>
                  <ChatBot meetingPlan={meetingPlan} docContext={docContent} />
                </section>
              </div>

              {/* Right Column - Action Items with Notification Feature & Timeline */}
              <div className="lg:col-span-2 space-y-8">
                {/* Action Items with Set Notification feature */}
                <ActionItemsList
                  actionItems={meetingPlan.actionItems || []}
                  onUpdateActionItems={handleUpdateActionItems}
                  onTriggerInstantTestAlert={handleTriggerInstantTestAlert}
                />

                {/* Timeline */}
                <section className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
                        <Clock className="text-blue-600" size={22} />
                        Meeting Timeline & Topics
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Sequential time slots with allocated discussion times and objectives
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-lg border border-blue-100">
                        {meetingPlan.items.length} items
                      </span>
                    </div>
                  </div>

                  <Timeline
                    items={meetingPlan.items}
                    startTime={startTime}
                    onStartTimeChange={setStartTime}
                    onUpdateItems={handleUpdateItems}
                    onTriggerRecap={handleScrollToRecap}
                    hasRecap={Boolean(meetingPlan.recap)}
                  />
                </section>

                {/* Meeting Recap Component at the end of the meeting flow */}
                <MeetingRecap
                  meetingPlan={meetingPlan}
                  docContext={docContent}
                  onUpdateRecap={handleUpdateRecap}
                  onSyncActionItems={handleSyncActionItemsFromRecap}
                />
              </div>
            </div>
          </div>
        ) : (
          /* Empty / Welcome State */
          <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 text-center">
            <div className="max-w-xl w-full space-y-6">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mx-auto shadow-xs border border-blue-100">
                <Sparkles size={28} />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Transform Any Document into a Meeting Agenda
                </h2>
                <p className="text-slate-500 text-sm leading-relaxed max-w-md mx-auto">
                  Upload project requirements, memos, transcripts, or notes. AgendaAI uses Gemini 3 Pro to extract topics, stakeholder roles, and generate a precise timeline with automated action item deadline notifications.
                </p>
              </div>

              {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-2xl border border-red-100 text-xs font-medium flex items-center gap-2 text-left">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Interactive Quick Start Cards */}
              <div className="text-left pt-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 text-center">
                  Try with a sample document:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {SAMPLE_DOCUMENTS.map((sample) => (
                    <button
                      key={sample.id}
                      onClick={() => handleSelectSample(sample)}
                      className="p-4 bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 rounded-2xl shadow-xs transition-all flex flex-col justify-between text-left group"
                    >
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                          {sample.category}
                        </span>
                        <h3 className="font-bold text-xs text-slate-800 group-hover:text-blue-900 mt-2 line-clamp-2">
                          {sample.title}
                        </h3>
                      </div>
                      <span className="text-[11px] font-semibold text-blue-600 flex items-center gap-1 mt-4 group-hover:translate-x-0.5 transition-transform">
                        Load Document →
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Feature Pills */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-6 border-t border-slate-200/80">
                {[
                  { label: 'Multimodal Files', sub: 'PDF, Markdown, TXT', icon: <FileText size={15} /> },
                  { label: 'Stakeholders', sub: 'Roles & input needed', icon: <Users size={15} /> },
                  { label: 'Dynamic Timeline', sub: 'Interactive editing', icon: <Clock size={15} /> },
                  { label: 'Set Notification', sub: 'Deadline alert banners', icon: <BellRing size={15} /> },
                ].map((feat, i) => (
                  <div key={i} className="p-3 bg-white border border-slate-200/60 rounded-xl text-center">
                    <div className="text-blue-600 mx-auto w-fit mb-1">{feat.icon}</div>
                    <p className="text-xs font-bold text-slate-800">{feat.label}</p>
                    <p className="text-[10px] text-slate-400">{feat.sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
