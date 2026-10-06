
export interface Stakeholder {
  name: string;
  role: string;
  contribution: string;
}

export interface AgendaItem {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  type: 'presentation' | 'discussion' | 'decision' | 'break';
  speaker?: string;
}

export interface ActionItem {
  id: string;
  task: string;
  owner: string;
  deadline?: string;
  deadlineDate?: string; // ISO or YYYY-MM-DDTHH:mm
  reminderSet?: boolean;
  reminderMinutesBefore?: number; // e.g. 0, 5, 15, 60
  isCompleted?: boolean;
  notified?: boolean;
  snoozedUntil?: number;
}

export interface RecapDecision {
  decision: string;
  rationale?: string;
  impact?: string;
}

export interface RecapActionItem {
  id?: string;
  task: string;
  owner: string;
  deadline?: string;
  priority?: 'high' | 'medium' | 'low';
}

export interface MeetingRecapData {
  meetingTitle: string;
  executiveSummary: string;
  keyDecisions: RecapDecision[];
  actionItems: RecapActionItem[];
  nextSteps: string[];
  unresolvedIssuesOrRisks?: string[];
  emailDraft?: {
    subject: string;
    body: string;
  };
  generatedAt: string;
  modelUsed?: string;
}

export interface MeetingPlan {
  title: string;
  objective: string;
  stakeholders: Stakeholder[];
  items: AgendaItem[];
  totalDuration: number;
  actionItems?: ActionItem[];
  keyDecisionsNeeded?: string[];
  recap?: MeetingRecapData;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}
