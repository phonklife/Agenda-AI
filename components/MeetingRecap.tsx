import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  FileCheck2,
  Clock,
  User,
  Copy,
  Check,
  Download,
  Mail,
  ExternalLink,
  Plus,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  FileText,
  Send,
  Sliders,
  ShieldCheck,
  ListTodo
} from 'lucide-react';
import { MeetingPlan, MeetingRecapData, ActionItem, RecapDecision, RecapActionItem } from '../types';
import { generateMeetingRecap } from '../services/geminiService';

interface MeetingRecapProps {
  meetingPlan: MeetingPlan;
  docContext?: string;
  onUpdateRecap?: (recap: MeetingRecapData) => void;
  onSyncActionItems?: (newItems: ActionItem[]) => void;
}

const MeetingRecap: React.FC<MeetingRecapProps> = ({
  meetingPlan,
  docContext,
  onUpdateRecap,
  onSyncActionItems,
}) => {
  const [meetingNotes, setMeetingNotes] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [recapData, setRecapData] = useState<MeetingRecapData | null>(meetingPlan.recap || null);
  const [modelUsed, setModelUsed] = useState<string>(meetingPlan.recap?.modelUsed || 'Gemini 3 Pro');
  
  // UI states
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [showEmailDraft, setShowEmailDraft] = useState<boolean>(true);
  const [showNotesInput, setShowNotesInput] = useState<boolean>(false);
  const [syncedCount, setSyncedCount] = useState<number | null>(null);

  // Sample discussion notes for instant testing
  const sampleDiscussionNotes = `• Team reached consensus on launching v2.0 in the first week of next month.
• Security & compliance audit passed with 0 critical blockers; Alex to file SOC2 paperwork by Wednesday.
• Marketing budget approved at $18,000 for initial rollout campaign.
• Deferred international localization decision until Q3 metric review.`;

  const handleGenerateRecap = async () => {
    setIsGenerating(true);
    setError(null);
    setSyncedCount(null);

    try {
      const result = await generateMeetingRecap(meetingPlan, meetingNotes.trim() || undefined, docContext);
      setRecapData(result.recap);
      setModelUsed(result.modelUsed);
      if (onUpdateRecap) {
        onUpdateRecap(result.recap);
      }
    } catch (err: any) {
      console.error("Recap generation error:", err);
      setError(err?.message || "Failed to generate meeting recap. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => {
      setCopiedSection(null);
    }, 2000);
  };

  const handleSyncActionItems = () => {
    if (!recapData?.actionItems || !onSyncActionItems) return;

    const existingTasks = new Set((meetingPlan.actionItems || []).map((a) => a.task.toLowerCase().trim()));
    const itemsToAdd: ActionItem[] = [];

    recapData.actionItems.forEach((item, index) => {
      // Check if already in action items
      if (!existingTasks.has(item.task.toLowerCase().trim())) {
        const d = new Date();
        d.setHours(d.getHours() + (index + 1) * 3);
        const offset = d.getTimezoneOffset() * 60000;
        const defaultIso = new Date(d.getTime() - offset).toISOString().slice(0, 16);

        itemsToAdd.push({
          id: `recap-ai-${Date.now()}-${index}`,
          task: item.task,
          owner: item.owner || 'Assignee',
          deadline: item.deadline || 'End of Sprint',
          deadlineDate: defaultIso,
          reminderSet: true,
          reminderMinutesBefore: 15,
          isCompleted: false,
          notified: false,
        });
      }
    });

    if (itemsToAdd.length > 0) {
      onSyncActionItems(itemsToAdd);
      setSyncedCount(itemsToAdd.length);
    } else {
      setSyncedCount(0);
    }

    setTimeout(() => {
      setSyncedCount(null);
    }, 4000);
  };

  const handleDownloadRecap = () => {
    if (!recapData) return;

    let content = `# MEETING RECAP: ${recapData.meetingTitle}\n`;
    content += `Generated: ${new Date(recapData.generatedAt).toLocaleString()} via ${modelUsed}\n\n`;
    content += `## EXECUTIVE SUMMARY\n${recapData.executiveSummary}\n\n`;

    content += `## KEY DECISIONS REACHED\n`;
    recapData.keyDecisions.forEach((kd, i) => {
      content += `${i + 1}. ${kd.decision}\n`;
      if (kd.rationale) content += `   • Rationale: ${kd.rationale}\n`;
      if (kd.impact) content += `   • Impact: ${kd.impact}\n`;
    });
    content += `\n`;

    content += `## ACTION ITEMS & DELIVERABLES\n`;
    recapData.actionItems.forEach((ai, i) => {
      content += `${i + 1}. [ ] ${ai.task} - Owner: ${ai.owner} (Deadline: ${ai.deadline || 'TBD'}, Priority: ${ai.priority || 'Normal'})\n`;
    });
    content += `\n`;

    if (recapData.nextSteps && recapData.nextSteps.length > 0) {
      content += `## NEXT STEPS\n`;
      recapData.nextSteps.forEach((ns, i) => {
        content += `${i + 1}. ${ns}\n`;
      });
      content += `\n`;
    }

    if (recapData.unresolvedIssuesOrRisks && recapData.unresolvedIssuesOrRisks.length > 0) {
      content += `## OPEN QUESTIONS & RISKS\n`;
      recapData.unresolvedIssuesOrRisks.forEach((risk, i) => {
        content += `• ${risk}\n`;
      });
      content += `\n`;
    }

    if (recapData.emailDraft) {
      content += `## EMAIL DRAFT\nSubject: ${recapData.emailDraft.subject}\n\n${recapData.emailDraft.body}\n`;
    }

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${(recapData.meetingTitle || 'meeting_recap').replace(/[^a-z0-9]/gi, '_').toLowerCase()}_recap.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getPriorityBadgeClass = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'medium':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'low':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <section
      id="meeting-recap"
      className="bg-white border border-slate-200/90 rounded-3xl p-6 md:p-8 shadow-xs relative overflow-hidden transition-all"
    >
      {/* Accent subtle backdrop */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-50/40 rounded-full -mr-24 -mt-24 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center shadow-xs">
            <FileCheck2 size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Meeting Recap</h2>
              <span className="text-[10px] uppercase tracking-wider font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                End of Meeting Flow
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              AI synthesis of final decisions, agreed action items, and follow-up communication
            </p>
          </div>
        </div>

        {/* Header Action / Trigger */}
        <div className="flex items-center gap-2">
          {recapData && (
            <button
              onClick={handleDownloadRecap}
              className="text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 px-3 py-2 rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5"
              title="Download full Markdown recap"
            >
              <Download size={13} />
              Export
            </button>
          )}

          <button
            onClick={handleGenerateRecap}
            disabled={isGenerating}
            className="text-xs font-bold bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white px-4 py-2 rounded-xl transition-all shadow-xs flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <RefreshCw size={13} className="animate-spin text-emerald-400" />
                <span>Synthesizing Recap...</span>
              </>
            ) : (
              <>
                <Sparkles size={14} className="text-emerald-400" />
                <span>{recapData ? 'Regenerate Recap' : 'Generate Meeting Recap'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Optional In-Meeting Notes Accordion */}
      <div className="mt-5 relative z-10">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowNotesInput(!showNotesInput)}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-colors"
          >
            <Sliders size={13} className="text-slate-400" />
            <span>{showNotesInput ? 'Hide' : 'Add'} live discussion notes or outcome bullet points (optional)</span>
            {showNotesInput ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {showNotesInput && (
            <button
              type="button"
              onClick={() => setMeetingNotes(sampleDiscussionNotes)}
              className="text-[11px] font-medium text-emerald-700 hover:text-emerald-800 hover:underline"
            >
              Paste Sample Notes
            </button>
          )}
        </div>

        {showNotesInput && (
          <div className="mt-2.5 space-y-2 p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl animate-in fade-in-50">
            <textarea
              rows={3}
              value={meetingNotes}
              onChange={(e) => setMeetingNotes(e.target.value)}
              placeholder="e.g., Consensus reached to push launch by 1 week; Sarah approved $15k tooling budget; Mike will coordinate with IT..."
              className="w-full text-xs bg-white border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            <p className="text-[11px] text-slate-400">
              The AI incorporates these live points along with all agenda topics, stakeholders, and anticipated decisions.
            </p>
          </div>
        )}
      </div>

      {/* Error Notice */}
      {error && (
        <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
          <AlertTriangle size={15} className="shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Synced Notification Banner */}
      {syncedCount !== null && (
        <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
            <span>
              {syncedCount > 0
                ? `Successfully synced ${syncedCount} new action item${syncedCount === 1 ? '' : 's'} into your Action Items list with deadline notifications enabled!`
                : 'All action items from this recap are already present in your Action Items list.'}
            </span>
          </div>
          <span className="text-[11px] font-semibold text-emerald-700">Active</span>
        </div>
      )}

      {/* Main Recap Content */}
      {recapData ? (
        <div className="mt-6 space-y-6 relative z-10">
          {/* Metadata banner */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-200/70 rounded-xl text-[11px]">
            <div className="flex items-center gap-2 text-slate-600 font-medium">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>
                Recap generated at {new Date(recapData.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2 py-0.5 rounded-md">
                {modelUsed}
              </span>
              <button
                onClick={() =>
                  copyToClipboard(
                    `${recapData.meetingTitle}\n\n${recapData.executiveSummary}`,
                    'summary'
                  )
                }
                className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold hover:underline"
              >
                {copiedSection === 'summary' ? (
                  <>
                    <Check size={11} className="text-emerald-600" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy size={11} />
                    Copy Summary
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Executive Summary */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Executive Summary
            </h3>
            <div className="p-4 bg-slate-50/90 border border-slate-200/80 rounded-2xl">
              <p className="text-xs md:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {recapData.executiveSummary}
              </p>
            </div>
          </div>

          {/* Key Decisions Reached */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-600" />
                Key Decisions Reached ({recapData.keyDecisions.length})
              </h3>
              <button
                onClick={() => {
                  const text = recapData.keyDecisions
                    .map(
                      (d, i) =>
                        `${i + 1}. ${d.decision}\nRationale: ${d.rationale || 'N/A'}\nImpact: ${d.impact || 'N/A'}`
                    )
                    .join('\n\n');
                  copyToClipboard(text, 'decisions');
                }}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
              >
                {copiedSection === 'decisions' ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                Copy Decisions
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {recapData.keyDecisions.map((kd, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-emerald-50/40 border border-emerald-200/80 rounded-2xl flex flex-col justify-between space-y-2.5 shadow-2xs hover:bg-emerald-50/70 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <h4 className="font-bold text-slate-900 text-xs md:text-sm leading-snug">
                        {kd.decision}
                      </h4>
                    </div>

                    {kd.rationale && (
                      <p className="text-[11px] text-slate-600 pl-7 leading-relaxed">
                        <strong className="text-slate-700">Rationale:</strong> {kd.rationale}
                      </p>
                    )}
                  </div>

                  {kd.impact && (
                    <div className="pl-7 pt-1 border-t border-emerald-100">
                      <span className="inline-block text-[10px] font-semibold text-emerald-800 bg-white border border-emerald-200 px-2 py-0.5 rounded-md">
                        Impact: {kd.impact}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Action Items Reached & Commitments */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <ListTodo size={13} className="text-blue-600" />
                Action Items & Commitments ({recapData.actionItems.length})
              </h3>

              <div className="flex items-center gap-2">
                {onSyncActionItems && (
                  <button
                    onClick={handleSyncActionItems}
                    className="text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
                    title="Add these action items to the notification tracker"
                  >
                    <Plus size={12} />
                    Sync to Action Items List
                  </button>
                )}

                <button
                  onClick={() => {
                    const text = recapData.actionItems
                      .map(
                        (a, i) =>
                          `${i + 1}. [ ] ${a.task} (${a.owner}) - Due: ${a.deadline || 'TBD'} [${a.priority || 'Normal'}]`
                      )
                      .join('\n');
                    copyToClipboard(text, 'actionItems');
                  }}
                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                >
                  {copiedSection === 'actionItems' ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                  Copy Tasks
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {recapData.actionItems.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs hover:border-slate-300 transition-all"
                >
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <div className="w-5 h-5 rounded-md border border-slate-300 bg-slate-50 flex items-center justify-center shrink-0 mt-0.5 text-slate-400 font-bold text-[10px]">
                      {idx + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 leading-snug">{item.task}</p>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1 font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          <User size={11} className="text-slate-500" />
                          {item.owner}
                        </span>
                        {item.deadline && (
                          <span className="flex items-center gap-1 text-slate-500">
                            <Clock size={11} className="text-slate-400" />
                            {item.deadline}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Priority Badge */}
                  {item.priority && (
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border shrink-0 ${getPriorityBadgeClass(
                        item.priority
                      )}`}
                    >
                      {item.priority}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Next Steps & Open Risks in Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Next Steps */}
            {recapData.nextSteps && recapData.nextSteps.length > 0 && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <ArrowRight size={13} className="text-blue-600" />
                  Next Steps & Milestones
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-600">
                  {recapData.nextSteps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">•</span>
                      <span className="leading-snug">{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Unresolved Questions or Risks */}
            {recapData.unresolvedIssuesOrRisks && recapData.unresolvedIssuesOrRisks.length > 0 && (
              <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-2xl space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                  <AlertTriangle size={13} className="text-amber-600" />
                  Open Questions & Deferred Topics
                </h4>
                <ul className="space-y-1.5 text-xs text-amber-800">
                  {recapData.unresolvedIssuesOrRisks.map((risk, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-amber-600 font-bold">•</span>
                      <span className="leading-snug">{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Ready-to-Send Email Draft */}
          {recapData.emailDraft && (
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowEmailDraft(!showEmailDraft)}
                  className="text-xs font-bold text-slate-800 flex items-center gap-1.5 hover:text-blue-600 transition-colors"
                >
                  <Mail size={14} className="text-blue-600" />
                  <span>Executive Follow-up Email Draft</span>
                  {showEmailDraft ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const fullEmail = `Subject: ${recapData.emailDraft?.subject}\n\n${recapData.emailDraft?.body}`;
                      copyToClipboard(fullEmail, 'email');
                    }}
                    className="text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors flex items-center gap-1 shadow-2xs"
                  >
                    {copiedSection === 'email' ? (
                      <>
                        <Check size={12} className="text-emerald-600" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        Copy Email
                      </>
                    )}
                  </button>

                  <a
                    href={`mailto:?subject=${encodeURIComponent(
                      recapData.emailDraft.subject
                    )}&body=${encodeURIComponent(recapData.emailDraft.body)}`}
                    className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                  >
                    <Send size={11} />
                    Open in Mail
                  </a>
                </div>
              </div>

              {showEmailDraft && (
                <div className="space-y-2 animate-in fade-in-50">
                  <div className="p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800">
                    <span className="font-bold text-slate-400">Subject:</span> {recapData.emailDraft.subject}
                  </div>
                  <div className="p-3.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto font-sans">
                    {recapData.emailDraft.body}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Empty / Ready to Generate State */
        <div className="mt-6 p-8 border border-dashed border-slate-200 rounded-2xl text-center space-y-4 bg-slate-50/40">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto border border-emerald-100">
            <Sparkles size={22} />
          </div>

          <div className="max-w-md mx-auto space-y-1">
            <h3 className="font-bold text-sm text-slate-800">
              Ready to wrap up the meeting flow?
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Click below to trigger Gemini to analyze all discussion topics, stakeholder roles, and notes to summarize the key decisions and action items reached.
            </p>
          </div>

          <button
            onClick={handleGenerateRecap}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-xs transition-all"
          >
            {isGenerating ? (
              <>
                <RefreshCw size={14} className="animate-spin text-emerald-400" />
                <span>Synthesizing Decisions & Tasks with Gemini...</span>
              </>
            ) : (
              <>
                <Sparkles size={14} className="text-emerald-400" />
                <span>Generate Meeting Recap Now</span>
              </>
            )}
          </button>
        </div>
      )}
    </section>
  );
};

export default MeetingRecap;
