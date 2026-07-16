import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini Client to prevent crash if key is missing on startup
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

// Full-stack server side Gemini Risk Analysis API Route
app.post('/api/analyze-risk', async (req, res) => {
  try {
    const { submission, questions } = req.body;
    if (!submission) {
      return res.status(400).json({ error: 'Missing submission payload' });
    }

    const { answers, proctoringLogs, studentName, assessmentTitle } = submission;

    // Build the prompt for Gemini 2.5 Flash
    const logsText = proctoringLogs && proctoringLogs.length > 0
      ? proctoringLogs.map((l: any) => `[${l.timestamp}] VIOLATION: ${l.type} - Details: ${l.details}`).join('\n')
      : 'No browser, camera, or action violations recorded. Perfect alignment with physical proctoring constraints.';

    const answersText = Object.entries(answers || {})
      .map(([qid, ans]) => {
        const question = (questions || []).find((q: any) => q.id === qid);
        const qText = question ? question.questionText : 'Question ID: ' + qid;
        const qPoints = question ? `(Points: ${question.points})` : '';
        return `### Question: ${qText} ${qPoints}\n**Candidate Answer:**\n\`\`\`javascript\n${ans}\n\`\`\`\n`;
      })
      .join('\n\n');

    const prompt = `
You are the AI Proctor and Assessment Evaluator for "IntegrityIQ", an online secure examination platform.
Your task is to analyze the candidate's answers and proctoring logs to assess academic integrity risk.

--- CANDIDATE DETAILS ---
Candidate Name: ${studentName}
Assessment Name: ${assessmentTitle}

--- PROCTORING LOGS ---
${logsText}

--- SUBMISSION ANSWERS ---
${answersText}

Analyze the candidate's behavior, physical proctoring anomalies (like camera face missing, looking away, tab switching, copy-pasting, multiple people), and evaluate if they likely cheated.
Evaluate their written code or explanations. If there is a coding section, determine:
- If the code contains comments indicating external source copy (e.g., copied boilerplate, uncharacteristic complexity).
- If the copy-paste logs align with the instant insertion of code blocks.
- If they performed a "tab-switch" right before producing an optimal solution.

Generate a highly detailed response. Your response MUST be valid JSON matching this schema:
{
  "aiRiskScore": number, // A value from 0 to 100 representing calculated risk (0 = fully trustworthy, 100 = blatant cheating/absence)
  "aiProctoringSummary": string // A clear, structured markdown summary (about 200-400 words) summarizing candidate's proctoring profile, their technical correctiveness, any red flags, and your grading recommendation.
}

Return ONLY the raw JSON string. Do not wrap in markdown block fences like \`\`\`json.
`;

    try {
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        }
      });

      const responseText = response.text?.trim() || '{}';
      const parsed = JSON.parse(responseText);
      return res.json(parsed);

    } catch (aiError: any) {
      console.error('Gemini API Error:', aiError);
      
      // Smart Fallback calculation in case of key limits or credential errors
      let fallbackScore = 10;
      let logsAnalysis = 'No proctoring logs. Standard submission.';
      
      if (proctoringLogs && proctoringLogs.length > 0) {
        const tabSwitches = proctoringLogs.filter((l: any) => l.type === 'tab-switch').length;
        const copyPastes = proctoringLogs.filter((l: any) => l.type === 'copy-paste').length;
        const missingFaces = proctoringLogs.filter((l: any) => l.type === 'face-missing').length;
        const multiFaces = proctoringLogs.filter((l: any) => l.type === 'multiple-faces').length;
        
        fallbackScore += tabSwitches * 20;
        fallbackScore += copyPastes * 25;
        fallbackScore += missingFaces * 15;
        fallbackScore += multiFaces * 30;
        if (fallbackScore > 100) fallbackScore = 100;

        logsAnalysis = `The local detector flagged ${proctoringLogs.length} anomalies, including: ` +
          `[${tabSwitches} tab-switches, ${copyPastes} copy-pastes, ${missingFaces} face-absences, ${multiFaces} secondary persons].`;
      }

      const fallbackSummary = `### **AI Proctoring Review (Local Analyzer Fallback)**
Our primary intelligent analyzer returned an operational limit, so the automated risk-engine computed a calculated score.

- **Calculated Risk Index:** **${fallbackScore}%**
- **Violation Activity:** ${logsAnalysis}
- **Integrity Status:** ${fallbackScore > 60 ? '🔴 High Risk - Immediate human intervention recommended.' : fallbackScore > 30 ? '🟡 Moderate Risk - Review violation timestamps.' : '🟢 Low Risk - Full credential integrity verified.'}

_Note: This is an automatically generated rule-based evaluation due to active API rate-limits or inactive BYOK key configuration._`;

      return res.json({
        aiRiskScore: fallbackScore,
        aiProctoringSummary: fallbackSummary
      });
    }

  } catch (error: any) {
    console.error('Server side error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Serve frontend assets
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`IntegrityIQ Full-Stack Server running on port ${PORT}`);
  });
}

startServer();
