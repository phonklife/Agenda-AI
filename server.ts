import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "30mb" }));
  app.use(express.urlencoded({ extended: true, limit: "30mb" }));

  const getAiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      throw new Error("Missing GEMINI_API_KEY environment variable.");
    }

    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  };

  const getPrimaryModel = () => process.env.GEMINI_MODEL || "gemini-2.5-pro";
  const getFallbackModel = () => process.env.GEMINI_FALLBACK_MODEL || "gemini-2.5-flash";

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Extract agenda from document
  app.post("/api/generate-agenda", async (req, res) => {
    try {
      const { content, fileData, targetDuration, meetingType } = req.body;

      if (!content && !fileData) {
        return res.status(400).json({ error: "No document content or file provided." });
      }

      const ai = getAiClient();
      const parts: any[] = [];

      let userPrompt = "Analyze this document thoroughly and extract structured meeting information to build a comprehensive, time-optimized meeting agenda.";
      if (meetingType) {
        userPrompt += ` Target meeting type: ${meetingType}.`;
      }
      if (targetDuration) {
        userPrompt += ` Target meeting duration: ${targetDuration} minutes.`;
      }

      const primaryModel = getPrimaryModel();
      const fallbackModel = getFallbackModel();

      if (fileData && fileData.base64 && fileData.mimeType) {
        parts.push({
          inlineData: {
            data: fileData.base64,
            mimeType: fileData.mimeType,
          }
        });
        parts.push({
          text: `${userPrompt} Extract all relevant stakeholders, agenda topics with realistic durations and presentation/discussion/decision/break types, key decisions needed, and expected action items.`
        });
      } else {
        parts.push({
          text: `${userPrompt}

DOCUMENT CONTENT:
${content}

Extract all relevant stakeholders, agenda topics with realistic durations and presentation/discussion/decision/break types, key decisions needed, and expected action items.`
        });
      }

      const agendaSchema = {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Professional, clear title for the meeting" },
          objective: { type: Type.STRING, description: "The overarching goal and desired outcome of the meeting" },
          stakeholders: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                role: { type: Type.STRING },
                contribution: { type: Type.STRING, description: "Their specific input or role in this meeting" },
              },
              required: ["name", "role", "contribution"]
            }
          },
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                durationMinutes: { type: Type.NUMBER },
                type: { type: Type.STRING, enum: ["presentation", "discussion", "decision", "break"] },
                speaker: { type: Type.STRING, description: "Assigned lead or speaker for this section" },
              },
              required: ["id", "title", "description", "durationMinutes", "type"]
            }
          },
          totalDuration: { type: Type.NUMBER, description: "Total meeting duration in minutes" },
          actionItems: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                task: { type: Type.STRING },
                owner: { type: Type.STRING },
                deadline: { type: Type.STRING },
              },
              required: ["id", "task", "owner"]
            }
          },
          keyDecisionsNeeded: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["title", "objective", "stakeholders", "items", "totalDuration"]
      };

      let rawOutput = "";
      let modelUsed = "Gemini 3 Pro";

      try {
        const response = await ai.models.generateContent({
          model: primaryModel,
          contents: { parts },
          config: {
            responseMimeType: "application/json",
            responseSchema: agendaSchema,
          }
        });
        rawOutput = response.text || "{}";
      } catch (proError: any) {
        console.warn(`Primary agenda model (${primaryModel}) failed, attempting fallback to ${fallbackModel}:`, proError?.message || proError);
        modelUsed = "Gemini 2.5 Flash";
        const response = await ai.models.generateContent({
          model: fallbackModel,
          contents: { parts },
          config: {
            responseMimeType: "application/json",
            responseSchema: agendaSchema,
          }
        });
        rawOutput = response.text || "{}";
      }

      const meetingPlan = JSON.parse(rawOutput);
      
      // Ensure totalDuration matches items if not provided accurately
      if (Array.isArray(meetingPlan.items) && meetingPlan.items.length > 0) {
        const calculatedTotal = meetingPlan.items.reduce((acc: number, item: any) => acc + (Number(item.durationMinutes) || 0), 0);
        if (!meetingPlan.totalDuration || Math.abs(meetingPlan.totalDuration - calculatedTotal) > 5) {
          meetingPlan.totalDuration = calculatedTotal;
        }
      }

      res.json({ meetingPlan, modelUsed });
    } catch (error: any) {
      console.error("Error generating meeting agenda:", error);
      res.status(500).json({ error: error?.message || "Failed to generate meeting agenda from document." });
    }
  });

  // Generate meeting recap at the end of the meeting flow
  app.post("/api/generate-recap", async (req, res) => {
    try {
      const { meetingPlan, meetingNotes, docContext } = req.body;

      if (!meetingPlan) {
        return res.status(400).json({ error: "No meeting plan provided." });
      }

      const ai = getAiClient();
      const primaryModel = getPrimaryModel();
      const fallbackModel = getFallbackModel();

      const recapSchema = {
        type: Type.OBJECT,
        properties: {
          meetingTitle: { type: Type.STRING, description: "Title of the meeting recap" },
          executiveSummary: {
            type: Type.STRING,
            description: "Crisp, cohesive 2-3 paragraph executive summary synthesizing the meeting outcomes, strategic context, and key alignments reached."
          },
          keyDecisions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                decision: { type: Type.STRING, description: "The specific decision made" },
                rationale: { type: Type.STRING, description: "Why this decision was reached or the consensus factor" },
                impact: { type: Type.STRING, description: "Who or what this decision impacts directly" }
              },
              required: ["decision"]
            },
            description: "Concrete decisions reached and agreed upon at the conclusion of this meeting"
          },
          actionItems: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                task: { type: Type.STRING, description: "Clear, actionable task description" },
                owner: { type: Type.STRING, description: "Name of the responsible person or team" },
                deadline: { type: Type.STRING, description: "Target completion date or timeframe" },
                priority: { type: Type.STRING, enum: ["high", "medium", "low"] }
              },
              required: ["task", "owner"]
            },
            description: "Specific commitments, deliverables, and assignments resulting from the meeting flow"
          },
          nextSteps: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Immediate operational next steps or upcoming checkpoints"
          },
          unresolvedIssuesOrRisks: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Any open questions, risks, or topics deferred to future syncs"
          },
          emailDraft: {
            type: Type.OBJECT,
            properties: {
              subject: { type: Type.STRING, description: "Clear email subject line for meeting attendees" },
              body: { type: Type.STRING, description: "Polished, professional follow-up email text ready to send to participants" }
            },
            required: ["subject", "body"]
          }
        },
        required: ["meetingTitle", "executiveSummary", "keyDecisions", "actionItems", "nextSteps", "emailDraft"]
      };

      const promptText = `You are an executive chief of staff and expert meeting facilitator. The meeting has now concluded.
Your goal is to generate a comprehensive, highly organized, professional "Meeting Recap" summarizing the key decisions and action items reached at the end of the meeting flow.

MEETING PLAN & AGENDA:
Title: ${meetingPlan.title || 'Untitled Meeting'}
Objective: ${meetingPlan.objective || 'N/A'}
Total Duration: ${meetingPlan.totalDuration || 0} minutes
Stakeholders: ${JSON.stringify(meetingPlan.stakeholders || [], null, 2)}
Agenda Topics & Timeline: ${JSON.stringify(meetingPlan.items || [], null, 2)}
Initial Action Items: ${JSON.stringify(meetingPlan.actionItems || [], null, 2)}
Expected Decisions: ${JSON.stringify(meetingPlan.keyDecisionsNeeded || [], null, 2)}

${meetingNotes ? `LIVE IN-MEETING NOTES & DISCUSSION OUTCOMES LOGGED BY ATTENDEES:\n${meetingNotes}\n` : 'No additional live discussion notes were entered. Synthesize the final decisions and action items based on the complete agenda topics, discussion items, and action items.'}

${docContext ? `ORIGINAL DOCUMENT CONTEXT:\n${typeof docContext === 'string' ? docContext.slice(0, 3000) : ''}\n` : ''}

INSTRUCTIONS:
1. Formulate a crisp, insightful Executive Summary of what was accomplished.
2. Provide concrete, well-defined Key Decisions Reached (with rationale and impact).
3. Provide an updated, comprehensive list of Action Items (with assigned owners, realistic deadlines, and priority). Incorporate existing items plus any new ones emerging from the discussion.
4. List immediate Next Steps and follow-up checkpoints.
5. Highlight any unresolved issues or risks.
6. Generate a ready-to-send, beautifully structured Follow-up Email draft for all attendees.`;

      let rawOutput = "{}";
      let modelUsed = "Gemini 2.5 Pro";

      try {
        const response = await ai.models.generateContent({
          model: primaryModel,
          contents: [{ parts: [{ text: promptText }] }],
          config: {
            responseMimeType: "application/json",
            responseSchema: recapSchema,
          }
        });
        rawOutput = response.text || "{}";
      } catch (proError: any) {
        console.warn(`Primary recap model (${primaryModel}) failed, falling back to ${fallbackModel}:`, proError?.message || proError);
        modelUsed = "Gemini 2.5 Flash";
        const response = await ai.models.generateContent({
          model: fallbackModel,
          contents: [{ parts: [{ text: promptText }] }],
          config: {
            responseMimeType: "application/json",
            responseSchema: recapSchema,
          }
        });
        rawOutput = response.text || "{}";
      }

      const recap = JSON.parse(rawOutput);
      recap.generatedAt = new Date().toISOString();
      recap.modelUsed = modelUsed;

      res.json({ recap, modelUsed });
    } catch (error: any) {
      console.error("Error generating meeting recap:", error);
      res.status(500).json({ error: error?.message || "Failed to generate meeting recap." });
    }
  });

  // Chat assistant endpoint
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, history, meetingPlan, docContext } = req.body;
      const ai = getAiClient();

      const systemInstruction = `You are AgendaAI Assistant, an executive meeting facilitator and project planner.
The current meeting agenda is:
${meetingPlan ? JSON.stringify(meetingPlan, null, 2) : "No agenda generated yet."}

Document context summary/excerpt:
${typeof docContext === 'string' ? docContext.slice(0, 4000) : "Uploaded document"}

Answer questions about the agenda, suggest optimizations, draft calendar invites or follow-up communications, and help the user prepare for this meeting. Provide concise, clear, and actionable responses.`;

      const contents: any[] = [];
      if (Array.isArray(history)) {
        for (const item of history) {
          contents.push({
            role: item.role === 'model' ? 'model' : 'user',
            parts: [{ text: item.content }]
          });
        }
      }
      contents.push({
        role: 'user',
        parts: [{ text: message }]
      });

      let reply = "";
      try {
        const response = await ai.models.generateContent({
          model: getPrimaryModel(),
          contents,
          config: { systemInstruction }
        });
        reply = response.text || "";
      } catch (_err) {
        const response = await ai.models.generateContent({
          model: getFallbackModel(),
          contents,
          config: { systemInstruction }
        });
        reply = response.text || "";
      }

      res.json({ reply });
    } catch (error: any) {
      console.error("Chat error:", error);
      res.status(500).json({ error: error?.message || "Failed to process chat message." });
    }
  });

  // Vite middleware in dev, static files in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AgendaAI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
