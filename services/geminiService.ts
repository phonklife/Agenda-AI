import { MeetingPlan, ChatMessage, MeetingRecapData } from "../types";

export interface GenerateAgendaResponse {
  meetingPlan: MeetingPlan;
  modelUsed: string;
}

export interface GenerateRecapResponse {
  recap: MeetingRecapData;
  modelUsed: string;
}

export const generateMeetingPlan = async (
  docContent: string,
  fileData?: { base64: string; mimeType: string },
  options?: { targetDuration?: number; meetingType?: string }
): Promise<GenerateAgendaResponse> => {
  const response = await fetch("/api/generate-agenda", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content: docContent,
      fileData,
      targetDuration: options?.targetDuration,
      meetingType: options?.meetingType,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Server returned ${response.status}`);
  }

  const result = await response.json();
  return result;
};

export const generateMeetingRecap = async (
  meetingPlan: MeetingPlan,
  meetingNotes?: string,
  docContext?: string
): Promise<GenerateRecapResponse> => {
  const response = await fetch("/api/generate-recap", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      meetingPlan,
      meetingNotes,
      docContext,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Server returned ${response.status}`);
  }

  const result = await response.json();
  return result;
};

export const sendChatMessage = async (
  message: string,
  history: ChatMessage[],
  meetingPlan: MeetingPlan | null,
  docContext: string
): Promise<string> => {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      history,
      meetingPlan,
      docContext,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Server returned ${response.status}`);
  }

  const data = await response.json();
  return data.reply;
};