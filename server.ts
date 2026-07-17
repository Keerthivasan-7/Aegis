import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import vm from 'vm';
import { exec } from 'child_process';
import fs from 'fs';
import os from 'os';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '2mb' })); // Limit input size

// --- FIREBASE ADMIN INITIALIZATION ---
let firestoreDb: Firestore | null = null;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    initializeApp({
      credential: cert(serviceAccount)
    });
    console.log("Firebase Admin successfully initialized with Service Account Credentials.");
  } else {
    // Rely on Application Default Credentials in Cloud Run or Project ID fallback
    initializeApp({
      projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'fallback-aegis'
    });
    console.log("Firebase Admin initialized with Default Credentials / Project ID.");
  }
  firestoreDb = getFirestore();
} catch (error) {
  console.error("CRITICAL: Firebase Admin initialization failed. Server operations may fallback to simulation:", error);
}

// --- LAZY GEMINI CLIENT ---
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

/**
 * Resilient wrapper for Gemini content generation that retries and falls back
 * across multiple models in the event of 503 (Unavailable) or 429 (Rate Limit) errors.
 */
async function generateContentWithFallback(
  ai: GoogleGenAI,
  prompt: string,
  responseMimeType?: string
): Promise<string> {
  // Ordered sequence of models to attempt
  const modelsToTry = [
    'gemini-3.5-flash',
    'gemini-2.5-flash',
    'gemini-1.5-flash',
    'gemini-2.5-pro',
    'gemini-1.5-pro'
  ];
  let lastError: any = null;

  for (const model of modelsToTry) {
    let attempts = 0;
    const maxAttempts = 2;
    while (attempts < maxAttempts) {
      try {
        console.log(`[Gemini Safe Dispatch] Trying model: ${model} (attempt ${attempts + 1}/${maxAttempts})`);
        const response = await ai.models.generateContent({
          model: model,
          contents: prompt,
          config: responseMimeType ? { responseMimeType } : undefined,
        });

        if (response.text) {
          console.log(`[Gemini Safe Dispatch] Success using model: ${model}`);
          return response.text;
        }
      } catch (err: any) {
        lastError = err;
        const errStr = err instanceof Error ? err.message : String(err);
        console.warn(`[Gemini Safe Dispatch] Model ${model} failed (attempt ${attempts + 1}): ${errStr}`);
        attempts++;
        if (attempts < maxAttempts) {
          // Exponential backoff
          await new Promise((resolve) => setTimeout(resolve, 800 * attempts));
        }
      }
    }
  }
  throw lastError || new Error('All Gemini fallback models exhausted without successful resolution');
}

// --- SECURE SANDBOX CODE EXECUTION FUNCTIONS ---

function runJsSandbox(code: string, funcName: string, inputString: string): Promise<{ success: boolean; result?: any; error?: string }> {
  return new Promise((resolve) => {
    // Generate clean node subprocess wrapper script
    const scriptCode = `
      const vm = require('vm');
      try {
        const sandbox = {
          console: { log: () => {} },
        };
        const context = vm.createContext(sandbox);
        const codeToRun = ${JSON.stringify(code)};
        const funcName = ${JSON.stringify(funcName)};
        const inputStr = ${JSON.stringify(inputString)};

        const scriptCode = codeToRun + "\\n" +
          "try { const res = " + funcName + "(" + inputStr + "); JSON.stringify(res); res; } catch(e) { throw new Error('runtime_error: ' + e.message); }";

        const script = new vm.Script(scriptCode);
        const result = script.runInContext(context, { timeout: 1000 });
        console.log("---JS_OUT_START---");
        console.log(JSON.stringify(result));
        console.log("---JS_OUT_END---");
      } catch (err) {
        console.log("---JS_OUT_START---");
        console.log(JSON.stringify({ sandbox_runtime_error: err.message }));
        console.log("---JS_OUT_END---");
      }
    `;

    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `js_sandbox_${Date.now()}_${Math.random().toString(36).substring(7)}.js`);

    fs.writeFile(tempFile, scriptCode, (err) => {
      if (err) {
        return resolve({ success: false, error: "Sandbox file IO failure" });
      }

      // Execute node with an empty env block so NO env secrets are visible to the child process!
      exec(`node ${tempFile}`, { timeout: 1500, maxBuffer: 1024 * 1024, env: {} }, (execErr, stdout, stderr) => {
        // Clean up temp file immediately
        fs.unlink(tempFile, () => {});

        if (execErr) {
          if (execErr.killed) {
            return resolve({ success: false, error: "Execution Timeout: Code took too long to run." });
          }
          return resolve({ success: false, error: stderr || execErr.message });
        }

        try {
          const startTag = "---JS_OUT_START---";
          const endTag = "---JS_OUT_END---";
          const startIdx = stdout.indexOf(startTag);
          const endIdx = stdout.indexOf(endTag);

          if (startIdx === -1 || endIdx === -1) {
            return resolve({ success: false, error: stdout || stderr || "No output generated" });
          }

          const targetChunk = stdout.substring(startIdx + startTag.length, endIdx).trim();
          const parsed = JSON.parse(targetChunk);

          if (parsed && typeof parsed === 'object' && 'sandbox_runtime_error' in parsed) {
            return resolve({ success: false, error: parsed.sandbox_runtime_error });
          }

          resolve({ success: true, result: parsed });
        } catch (parseErr: any) {
          resolve({ success: false, error: stdout || "Failed to process sandbox response" });
        }
      });
    });
  });
}

function runPythonSandbox(code: string, funcName: string, inputString: string): Promise<{ success: boolean; result?: any; error?: string }> {
  return new Promise((resolve) => {
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `sandbox_${Date.now()}_${Math.random().toString(36).substring(7)}.py`);

    const escapedInputString = inputString.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

    // Wrap python invocation in json.loads output securely, entirely avoiding python eval()
    const runnerScript = `
import json
import sys

${code}

try:
    # Safely load the inputs via json.loads
    val = json.loads("[${escapedInputString}]")
    if not isinstance(val, list):
        val = [val]
    
    result = ${funcName}(*val)
    # Output JSON stringified response for parent process to capture
    print("---SANDBOX_OUT_START---")
    print(json.dumps(result))
    print("---SANDBOX_OUT_END---")
except Exception as e:
    print("---SANDBOX_OUT_START---")
    print(json.dumps({"sandbox_runtime_error": str(e)}))
    print("---SANDBOX_OUT_END---")
`;

    fs.writeFile(tempFile, runnerScript, (err) => {
      if (err) {
        return resolve({ success: false, error: "Sandbox file IO failure" });
      }

      // Execute Python 3 in a sandboxed subprocess with clean empty env environment
      exec(`python3 ${tempFile}`, { timeout: 1500, maxBuffer: 1024 * 1024, env: {} }, (execErr, stdout, stderr) => {
        // Clean up immediately
        fs.unlink(tempFile, () => {});

        if (execErr) {
          if (execErr.killed) {
            return resolve({ success: false, error: "Execution Timeout: Code took too long to run (Infinite loop suspected)." });
          }
          return resolve({ success: false, error: stderr || execErr.message });
        }

        try {
          // Find standard bounding tags to avoid contamination from unformatted print logs
          const startTag = "---SANDBOX_OUT_START---";
          const endTag = "---SANDBOX_OUT_END---";
          const startIdx = stdout.indexOf(startTag);
          const endIdx = stdout.indexOf(endTag);

          if (startIdx === -1 || endIdx === -1) {
            return resolve({ success: false, error: stdout || stderr || "No output generated" });
          }

          const targetChunk = stdout.substring(startIdx + startTag.length, endIdx).trim();
          const parsed = JSON.parse(targetChunk);

          if (parsed && typeof parsed === 'object' && 'sandbox_runtime_error' in parsed) {
            return resolve({ success: false, error: parsed.sandbox_runtime_error });
          }

          resolve({ success: true, result: parsed });
        } catch (parseErr: any) {
          resolve({ success: false, error: stdout || "Failed to process sandbox response" });
        }
      });
    });
  });
}

// --- FULL-STACK SECURE ASSESSMENT API ENDPOINTS ---

// --- FULL-STACK SECURE ASSESSMENT API ENDPOINTS ---

const INITIAL_ASSESSMENTS = [
  {
    assessmentId: 'assess-1',
    title: 'Algorithms & Data Structures Challenge',
    description: 'Evaluate fundamental problem-solving abilities, including array manipulation, search optimization, and dynamic coding logic.',
    timeLimit: 45,
    createdBy: 'admin-1',
    createdAt: new Date().toISOString(),
    questions: [
      {
        id: 'q1_1',
        type: 'multiple-choice',
        points: 10,
        questionText: 'What is the worst-case time complexity of finding an element in a binary search tree (BST) of size N?',
        options: [
          'O(1)',
          'O(log N)',
          'O(N)',
          'O(N log N)'
        ],
        correctOptionIndex: 2
      },
      {
        id: 'q1_2',
        type: 'coding',
        points: 40,
        questionText: 'Write a JavaScript function "twoSum(nums, target)" that returns indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice.',
        starterCode: `function twoSum(nums, target) {
  // Write your code here
  const map = {};
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (complement in map) {
      return [map[complement], i];
    }
    map[nums[i]] = i;
  }
  return [];
}`,
        testCases: [
          { input: '[2, 7, 11, 15], 9', expectedOutput: '[0, 1]' },
          { input: '[3, 2, 4], 6', expectedOutput: '[1, 2]' },
          { input: '[3, 3], 6', expectedOutput: '[0, 1]' }
        ],
        language: 'javascript'
      },
      {
        id: 'q1_3',
        type: 'multiple-choice',
        points: 10,
        questionText: 'Which data structure uses the LIFO (Last In First Out) property?',
        options: [
          'Queue',
          'Stack',
          'Heap',
          'Linked List'
        ],
        correctOptionIndex: 1
      }
    ]
  },
  {
    assessmentId: 'assess-2',
    title: 'Full-Stack JavaScript & Web Core',
    description: 'Assess standard web technologies, asynchronous execution flow, and advanced array manipulation methods.',
    timeLimit: 30,
    createdBy: 'admin-1',
    createdAt: new Date().toISOString(),
    questions: [
      {
        id: 'q2_1',
        type: 'multiple-choice',
        points: 15,
        questionText: 'Which of the following is true about "Promise.all" vs "Promise.allSettled" in JavaScript?',
        options: [
          'Promise.all rejects immediately if any promise rejects, while Promise.allSettled waits for all to settle regardless of outcome.',
          'Promise.allSettled rejects immediately if any promise rejects, while Promise.all waits.',
          'Both reject immediately on any failure.',
          'Promise.all returns settled states, while Promise.allSettled only returns resolved values.'
        ],
        correctOptionIndex: 0
      },
      {
        id: 'q2_2',
        type: 'coding',
        points: 35,
        questionText: 'Write a JavaScript function "reverseWords(str)" that reverses the order of words in a sentence, while maintaining single space separation. Do not use built-in array utilities like .reverse().',
        starterCode: `function reverseWords(str) {
  // Write your code here
  const words = str.split(' ').filter(Boolean);
  let result = '';
  for (let i = words.length - 1; i >= 0; i--) {
    result += words[i] + (i > 0 ? ' ' : '');
  }
  return result;
}`,
        testCases: [
          { input: '"hello world"', expectedOutput: '"world hello"' },
          { input: '"Aegis is awesome"', expectedOutput: '"awesome is Aegis"' }
        ],
        language: 'javascript'
      }
    ]
  }
];

const HISTORICAL_SUBMISSIONS_MOCK = [
  {
    submissionId: 'sub-1',
    assessmentId: 'assess-1',
    assessmentTitle: 'Algorithms & Data Structures Challenge',
    studentId: 'student-alex',
    studentName: 'Alex Mercer',
    studentEmail: 'alex@student.com',
    answers: {
      'q1_1': '1',
      'q1_2': 'function twoSum(nums, target) {\n  return [0, 1];\n}',
      'q1_3': '1'
    },
    status: 'graded',
    score: 20,
    totalPoints: 60,
    proctoringLogs: [
      { timestamp: new Date(Date.now() - 3600000 * 24).toISOString(), type: 'tab-switch', details: 'Candidate opened secondary windows.' },
      { timestamp: new Date(Date.now() - 3600000 * 24 + 5000).toISOString(), type: 'copy-paste', details: 'Pasted coding snippet directly into editor.' },
      { timestamp: new Date(Date.now() - 3600000 * 24 + 10000).toISOString(), type: 'look-away', details: 'Gaze departed from the assessment environment temporarily.' }
    ],
    aiRiskScore: 84,
    aiProctoringSummary: 'Multiple violations detected. Frequently exited full-screen, copied external templates, and shifted focus to auxiliary equipment.',
    startedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    submittedAt: new Date(Date.now() - 3600000 * 24 + 60000).toISOString()
  },
  {
    submissionId: 'sub-2',
    assessmentId: 'assess-1',
    assessmentTitle: 'Algorithms & Data Structures Challenge',
    studentId: 'student-bella',
    studentName: 'Bella Thorne',
    studentEmail: 'bella@student.com',
    answers: {
      'q1_1': '2',
      'q1_2': 'function twoSum(nums, target) {\n  const map = {};\n  for (let i = 0; i < nums.length; i++) {\n    const diff = target - nums[i];\n    if (diff in map) return [map[diff], i];\n    map[nums[i]] = i;\n  }\n  return [];\n}',
      'q1_3': '1'
    },
    status: 'graded',
    score: 60,
    totalPoints: 60,
    proctoringLogs: [],
    aiRiskScore: 5,
    aiProctoringSummary: 'Examiner focus maintained. Gaze tracking remained steady with zero interface excursions or unauthorized interruptions.',
    startedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    submittedAt: new Date(Date.now() - 3600000 * 12 + 120000).toISOString()
  }
];

const defaultUsers = [
  { userId: 'student-alex', name: 'Alex Mercer', email: 'alex@student.com', role: 'student', createdAt: new Date().toISOString() },
  { userId: 'student-bella', name: 'Bella Thorne', email: 'bella@student.com', role: 'student', createdAt: new Date().toISOString() },
  { userId: 'student-chris', name: 'Chris Evans', email: 'chris@student.com', role: 'student', createdAt: new Date().toISOString() },
  { userId: 'student-diana', name: 'Diana Prince', email: 'diana@student.com', role: 'student', createdAt: new Date().toISOString() },
  { userId: 'admin-1', name: 'Dr. Keerthivasan', email: 'keerthivasangkv77@gmail.com', role: 'admin', createdAt: new Date().toISOString() }
];

// Server-side in-memory mock storage as a fallback pre-populated on boot
const serverInMemoryAssessments = new Map<string, any>();
const serverInMemorySubmissions = new Map<string, any>();
const serverInMemoryUsers = new Map<string, any>();

// Pre-populate caches on boot
for (const assessment of INITIAL_ASSESSMENTS) {
  serverInMemoryAssessments.set(assessment.assessmentId, assessment);
}
for (const sub of HISTORICAL_SUBMISSIONS_MOCK) {
  serverInMemorySubmissions.set(sub.submissionId, sub);
}
for (const u of defaultUsers) {
  serverInMemoryUsers.set(u.userId, u);
}

// --- AUTHENTICATION & SESSION AUTHORIZATION MIDDLEWARE ---

async function requireAuth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or malformed authorization token' });
  }

  const token = authHeader.substring(7);

  // Firebase Admin Token Verification
  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    const userId = decodedToken.uid;
    let profile = null;
    if (firestoreDb) {
      try {
        const userDoc = await firestoreDb.collection('users').doc(userId).get();
        if (userDoc.exists) {
          profile = userDoc.data();
        }
      } catch (dbErr) {
        console.warn("Auth middleware db query failed, using mock cache:", dbErr);
      }
    }
    if (!profile) {
      profile = serverInMemoryUsers.get(userId) || {
        userId,
        name: decodedToken.name || 'Candidate',
        email: decodedToken.email,
        role: 'student',
        createdAt: new Date().toISOString()
      };
    }
    req.user = profile;
    next();
  } catch (err: any) {
    return res.status(401).json({ error: 'Unauthorized: Invalid authentication credentials', details: err.message });
  }
}

async function verifyActiveSession(req: any, res: any, submissionId: string): Promise<any | null> {
  if (!submissionId) {
    res.status(400).json({ error: 'Missing active session authorization identifier' });
    return null;
  }
  const caller = req.user;
  if (!caller) {
    res.status(401).json({ error: 'Authentication required' });
    return null;
  }

  if (caller.role === 'admin') {
    return true; // Administrators possess global authority
  }

  let subData: any = null;
  if (firestoreDb) {
    try {
      const doc = await firestoreDb.collection('submissions').doc(submissionId).get();
      if (doc.exists) {
        subData = doc.data();
      }
    } catch (err) {
      console.warn("Session verification database lookup failed, checking cache:", err);
    }
  }
  if (!subData) {
    subData = serverInMemorySubmissions.get(submissionId);
  }

  if (!subData) {
    res.status(404).json({ error: 'Assessment session not found' });
    return null;
  }

  if (subData.studentId !== caller.userId) {
    res.status(403).json({ error: 'Access Denied: You do not own this assessment session' });
    return null;
  }

  if (subData.status !== 'ongoing') {
    res.status(403).json({ error: 'Access Denied: This assessment session is no longer active' });
    return null;
  }

  return subData;
}

// Server-Admin Seeding Endpoint to securely initialize Firestore collections without unauthenticated client writes
app.post('/api/seed-database', requireAuth, async (req, res) => {
  try {
    const caller = (req as any).user;
    if (caller.role !== 'admin') {
      return res.status(403).json({ error: 'Access Denied: Only administrators can seed databases.' });
    }

    if (!firestoreDb) {
      console.warn('[Server Seed] Firestore Admin DB is null. Local/Simulation mode fallback is active.');
      return res.json({ success: true, warning: 'Firestore Admin is not initialized; running in simulation fallback mode' });
    }

    try {
      for (const assessment of INITIAL_ASSESSMENTS) {
        const docRef = firestoreDb.collection('assessments').doc(assessment.assessmentId);
        const snap = await docRef.get();
        if (!snap.exists) {
          await docRef.set(assessment);
          console.log(`[Server Seed] Seeded assessment: ${assessment.title}`);
        }
      }

      for (const sub of HISTORICAL_SUBMISSIONS_MOCK) {
        const docRef = firestoreDb.collection('submissions').doc(sub.submissionId);
        const snap = await docRef.get();
        if (!snap.exists) {
          await docRef.set(sub);
          console.log(`[Server Seed] Seeded submission: ${sub.submissionId}`);
        }
      }

      for (const u of defaultUsers) {
        const docRef = firestoreDb.collection('users').doc(u.userId);
        const snap = await docRef.get();
        if (!snap.exists) {
          await docRef.set(u);
          console.log(`[Server Seed] Seeded user profile: ${u.email}`);
        }
      }

      return res.json({ success: true, message: 'Firestore database successfully seeded' });
    } catch (dbError: any) {
      console.warn('[Server Seed Warning] Failed to seed Firestore due to error (operating with in-memory seeded cache):', dbError.message || dbError);
      return res.json({ success: true, warning: 'Firestore not reachable; operating on active local server memory caches', details: dbError.message });
    }
  } catch (error: any) {
    console.error('Failed to seed demo data via Admin SDK:', error);
    res.status(500).json({ error: 'Failed to seed demo data', details: error.message });
  }
});

// 1. Server-Authoritative Exam Timing Trigger (Starts the assessment)
app.post('/api/start-exam', requireAuth, async (req, res) => {
  try {
    const caller = (req as any).user;
    const { assessmentId, studentId, studentName, studentEmail } = req.body;

    // Input sanitization
    if (!assessmentId || !studentId || !studentName || !studentEmail) {
      return res.status(400).json({ error: 'Missing start payload fields' });
    }

    // Verify student is only starting an exam for themselves
    if (caller.role !== 'admin' && caller.userId !== studentId) {
      return res.status(403).json({ error: 'Access Denied: Cannot register session for another candidate ID' });
    }

    if (studentName.length > 100 || studentEmail.length > 150) {
      return res.status(400).json({ error: 'Payload fields exceed safe limits' });
    }

    const submissionId = `sub-${studentId}-${assessmentId}-${Math.random().toString(36).substring(2, 7)}`;
    const startedAt = new Date().toISOString();

    let assessmentTitle = 'Algorithms & Data Structures Challenge';
    let useFallback = !firestoreDb;

    // Prevent re-entry: check if student has an existing completed, graded, or terminated submission for this assessment
    let existingSubmission: any = null;
    if (firestoreDb && !useFallback) {
      try {
        const subSnap = await firestoreDb.collection('submissions')
          .where('studentId', '==', studentId)
          .where('assessmentId', '==', assessmentId)
          .get();
        if (!subSnap.empty) {
          // Find if there's any that is NOT ongoing
          for (const doc of subSnap.docs) {
            const data = doc.data();
            if (data.status !== 'ongoing') {
              existingSubmission = data;
              break;
            }
          }
        }
      } catch (err: any) {
        console.warn('[Firestore Warning] Failed to query existing submissions:', err.message);
      }
    }
    
    // Check in-memory as well
    if (!existingSubmission) {
      for (const [subId, sub] of serverInMemorySubmissions.entries()) {
        if (sub.studentId === studentId && sub.assessmentId === assessmentId && sub.status !== 'ongoing') {
          existingSubmission = sub;
          break;
        }
      }
    }

    if (existingSubmission) {
      const reasonMsg = existingSubmission.status === 'terminated' 
        ? 'Disciplinary removal record found. Access to this assessment has been permanently blocked.'
        : 'You have already completed and submitted this assessment.';
      return res.status(403).json({ error: reasonMsg });
    }

    if (firestoreDb) {
      try {
        const assessDoc = await firestoreDb.collection('assessments').doc(assessmentId).get();
        if (assessDoc.exists) {
          const assessmentData = assessDoc.data();
          assessmentTitle = assessmentData?.title || 'Online Assessment';
        } else {
          // Fallback to in-memory caches
          const localAss = serverInMemoryAssessments.get(assessmentId);
          if (localAss) {
            assessmentTitle = localAss.title;
          }
        }
      } catch (err: any) {
        console.warn(`[Firestore Warning] Failed to get assessment ${assessmentId} from Firestore (Active fallback to local in-memory cache):`, err.message || err);
        useFallback = true;
        const localAss = serverInMemoryAssessments.get(assessmentId);
        if (localAss) {
          assessmentTitle = localAss.title;
        }
      }
    }

    const submissionPayload = {
      submissionId,
      assessmentId,
      assessmentTitle,
      studentId,
      studentName,
      studentEmail,
      answers: {},
      status: 'ongoing',
      score: 0,
      totalPoints: 0,
      proctoringLogs: [],
      startedAt,
    };

    if (firestoreDb && !useFallback) {
      try {
        await firestoreDb.collection('submissions').doc(submissionId).set(submissionPayload);
      } catch (err: any) {
        console.warn('[Firestore Warning] Failed to set submission in Firestore, falling back to server in-memory cache:', err.message || err);
        serverInMemorySubmissions.set(submissionId, submissionPayload);
      }
    } else {
      serverInMemorySubmissions.set(submissionId, submissionPayload);
    }

    return res.json(submissionPayload);
  } catch (error: any) {
    console.error('Error starting assessment:', error);
    res.status(500).json({ error: 'Failed to initialize assessment session' });
  }
});

// 2. Sandboxed Code Judge Execution Endpoint
app.post('/api/execute-code', requireAuth, async (req, res) => {
  try {
    const { code, language, funcName, inputString, submissionId } = req.body;

    if (!code || !funcName || !inputString || !submissionId) {
      return res.status(400).json({ error: 'Missing execution parameters' });
    }

    // Verify session state is ongoing and owned by candidate
    const sessionActive = await verifyActiveSession(req, res, submissionId);
    if (!sessionActive) return; // verifyActiveSession handles HTTP response

    // Server-side input length sanitization
    if (code.length > 20000 || inputString.length > 2000) {
      return res.status(400).json({ error: 'Input parameters exceed safe sandboxed limits' });
    }

    const lang = language === 'python' ? 'python' : 'javascript';

    let runResult;
    if (lang === 'python') {
      runResult = await runPythonSandbox(code, funcName, inputString);
    } else {
      runResult = await runJsSandbox(code, funcName, inputString);
    }

    return res.json(runResult);
  } catch (error: any) {
    console.error('Execution router error:', error);
    res.status(500).json({ error: 'Code execution engine failure' });
  }
});

// 3. Server-Authoritative Secured Grading & Integrity Evaluator Route
app.post('/api/submit-assessment', requireAuth, async (req, res) => {
  try {
    const { submissionId, answers, proctoringLogs } = req.body;

    if (!submissionId || !answers) {
      return res.status(400).json({ error: 'Missing submission payload' });
    }

    // Verify session is active and owned by candidate
    const subData = await verifyActiveSession(req, res, submissionId);
    if (!subData) return;

    // Input length sanitization to avoid DB overload
    if (JSON.stringify(answers).length > 200000 || (proctoringLogs && proctoringLogs.length > 1000)) {
      return res.status(400).json({ error: 'Payload exceeds safe data limits' });
    }

    const submittedAt = new Date().toISOString();
    let useFallback = !firestoreDb;

    // 2. Fetch assessment details to grade responses server-side securely
    let assessment: any = null;
    if (firestoreDb && !useFallback) {
      try {
        const assessDoc = await firestoreDb.collection('assessments').doc(subData.assessmentId).get();
        if (assessDoc.exists) {
          assessment = assessDoc.data()!;
        } else {
          assessment = serverInMemoryAssessments.get(subData.assessmentId);
        }
      } catch (err: any) {
        console.warn(`[Firestore Warning] Failed to fetch assessment ${subData.assessmentId} from Firestore (Using local fallback):`, err.message || err);
        assessment = serverInMemoryAssessments.get(subData.assessmentId);
      }
    } else {
      assessment = serverInMemoryAssessments.get(subData.assessmentId);
    }

    if (!assessment) {
      assessment = serverInMemoryAssessments.get('assess-1');
    }

    if (!assessment) {
      return res.status(404).json({ error: 'Associated assessment content not found' });
    }

    const questions = assessment.questions || [];
    const timeLimitMin = assessment.timeLimit || 45;

    // 3. Server-Authoritative Timing Enforcement Validation
    const startTime = new Date(subData.startedAt).getTime();
    const submissionTime = new Date(submittedAt).getTime();
    const elapsedMinutes = (submissionTime - startTime) / 1000 / 60;
    
    // Allow an auxiliary 2 minute grace period for submission network delays
    const timingViolation = elapsedMinutes > (timeLimitMin + 2);

    // 4. Server-Side Execution & Grading Loop
    let score = 0;
    let totalPoints = 0;

    for (const q of questions) {
      totalPoints += q.points || 0;
      const candidateAns = answers[q.id];

      if (!candidateAns) {
        continue; // Unanswered question gets 0 points
      }

      if (q.type === 'multiple-choice') {
        const selectedOpt = Number(candidateAns);
        if (selectedOpt === q.correctOptionIndex) {
          score += q.points;
        }
      } else if (q.type === 'coding') {
        // Run test cases securely inside our sandbox
        const starterCode = q.starterCode || '';
        const testCases = q.testCases || [];
        const funcNameMatch = starterCode.match(/function\s+(\w+)\s*\(/) || starterCode.match(/def\s+(\w+)\s*\(/);
        const funcName = funcNameMatch ? funcNameMatch[1] : null;

        if (!funcName) {
          continue; // Bad question template, no points awarded
        }

        // Determine coding language
        const language = q.language || 'javascript';

        let passedCases = 0;
        const totalCases = testCases.length;

        for (const tc of testCases) {
          let sandboxRes;
          if (language === 'python') {
            sandboxRes = await runPythonSandbox(candidateAns, funcName, tc.input);
          } else {
            sandboxRes = await runJsSandbox(candidateAns, funcName, tc.input);
          }

          if (sandboxRes.success) {
            const expectedNormalized = (tc.expectedOutput || '').replace(/\s+/g, '');
            const actualStr = JSON.stringify(sandboxRes.result);
            const actualNormalized = (actualStr ?? 'null').replace(/\s+/g, '');
            if (expectedNormalized === actualNormalized) {
              passedCases++;
            }
          }
        }

        // Enforce partial-credit grading based on passed cases
        const questionScore = totalCases > 0 ? (passedCases / totalCases) * q.points : 0;
        score += Math.round(questionScore * 100) / 100; // Round to 2 decimal places
      }
    }

    // 5. Build AI Proctoring Prompt for Gemini 3.5 Flash
    const logs = proctoringLogs || [];
    if (timingViolation) {
      logs.push({
        timestamp: submittedAt,
        type: 'fullscreen-exit',
        details: `Exam window expired. Candidate spent ${Math.round(elapsedMinutes)} minutes on a ${timeLimitMin} minute assessment.`
      });
    }

    const logsText = logs.length > 0
      ? logs.map((l: any) => `[${l.timestamp}] EVENT: ${l.type} - Details: ${l.details}`).join('\n')
      : 'No browser, camera, or activity violations logged. Clean proctoring profile.';

    const answersText = Object.entries(answers)
      .map(([qid, ans]) => {
        const question = questions.find((q: any) => q.id === qid);
        const qText = question ? question.questionText : 'Question ID: ' + qid;
        const qPoints = question ? `(Points: ${question.points})` : '';
        return `### Question: ${qText} ${qPoints}\n**Candidate Answer:**\n\`\`\`\n${ans}\n\`\`\`\n`;
      })
      .join('\n\n');

    const prompt = `
You are the AI Proctor and Assessment Evaluator for "Aegis", an online secure examination platform.
Your task is to analyze the candidate's answers and proctoring logs to assess academic integrity risk.

--- CANDIDATE DETAILS ---
Candidate Name: ${subData.studentName}
Assessment Name: ${subData.assessmentTitle}

--- PROCTORING LOGS ---
${logsText}

--- SUBMISSION ANSWERS ---
${answersText}

Analyze the candidate's behavior, physical proctoring anomalies (such as camera face missing, looking away, tab switching, copy-pasting, multiple people, timing limit overrides), and evaluate if they likely cheated.
Evaluate their written code or explanations. If there is a coding section, determine:
- If the code contains comments indicating external source copy.
- If the copy-paste logs align with the instant insertion of code blocks.
- If they performed a "tab-switch" right before producing an optimal solution.

Generate a highly detailed response. Your response MUST be valid JSON matching this schema:
{
  "aiRiskScore": number, // A value from 0 to 100 representing calculated risk (0 = fully trustworthy, 100 = blatant cheating)
  "aiProctoringSummary": string // A clear, structured markdown summary (about 200-400 words) summarizing candidate's proctoring profile, their technical correctiveness, any red flags, and your grading recommendation.
}

Return ONLY the raw JSON string. Do not wrap in markdown block fences like \`\`\`json.
`;

    let aiRiskScore = 0;
    let aiProctoringSummary = 'AI grading system unavailable. Manual audit recommended.';

    try {
      const ai = getAiClient();
      const responseText = await generateContentWithFallback(ai, prompt, 'application/json');
      const parsed = JSON.parse(responseText.trim() || '{}');
      aiRiskScore = parsed.aiRiskScore !== undefined ? parsed.aiRiskScore : 0;
      aiProctoringSummary = parsed.aiProctoringSummary || '';
    } catch (aiError) {
      console.error('Gemini API Grading/Proctoring error:', aiError);
      aiProctoringSummary = `Failed to automatically perform AI risk assessment: ${aiError instanceof Error ? aiError.message : String(aiError)}. Please audit manually.`;
    }

    // 6. Update document in Firestore / Local Cache
    const finalizedPayload = {
      ...subData,
      answers,
      proctoringLogs: logs,
      status: 'graded',
      score,
      totalPoints,
      aiRiskScore,
      aiProctoringSummary,
      submittedAt,
    };

    if (firestoreDb && !useFallback) {
      try {
        await firestoreDb.collection('submissions').doc(submissionId).set(finalizedPayload);
      } catch (err: any) {
        console.warn('[Firestore Warning] Failed to write finalized grading to Firestore, updating in-memory cache:', err.message || err);
        serverInMemorySubmissions.set(submissionId, finalizedPayload);
      }
    } else {
      serverInMemorySubmissions.set(submissionId, finalizedPayload);
    }

    return res.json(finalizedPayload);

  } catch (error: any) {
    console.error('Server submission grading failure:', error);
    res.status(500).json({ error: error.message || 'Failed to submit and grade assessment' });
  }
});

// 4. Server-Authoritative Secured Exam Disciplinary Termination Route
app.post('/api/terminate-exam', requireAuth, async (req, res) => {
  try {
    const { submissionId, proctoringLogs, reason } = req.body;

    if (!submissionId) {
      return res.status(400).json({ error: 'Missing submission payload' });
    }

    // Verify session is active and owned by candidate
    const subData = await verifyActiveSession(req, res, submissionId);
    if (!subData) return;

    // Input length sanitization to avoid DB overload
    if (proctoringLogs && proctoringLogs.length > 1000) {
      return res.status(400).json({ error: 'Payload exceeds safe data limits' });
    }

    const submittedAt = new Date().toISOString();
    let useFallback = !firestoreDb;

    // Set status: 'terminated', score: 0, save proctoringLogs and terminationReason, submittedAt: new timestamp.
    const finalizedPayload = {
      ...subData,
      status: 'terminated',
      score: 0,
      proctoringLogs: proctoringLogs || [],
      terminationReason: reason || 'multiple-faces-exceeded',
      submittedAt,
    };

    if (firestoreDb && !useFallback) {
      try {
        await firestoreDb.collection('submissions').doc(submissionId).set(finalizedPayload);
      } catch (err: any) {
        console.warn('[Firestore Warning] Failed to write finalized termination to Firestore, updating in-memory cache:', err.message || err);
        serverInMemorySubmissions.set(submissionId, finalizedPayload);
      }
    } else {
      serverInMemorySubmissions.set(submissionId, finalizedPayload);
    }

    console.log(`[Exam Terminated] Disqualified student session ${submissionId} successfully locked.`);
    return res.json(finalizedPayload);

  } catch (error: any) {
    console.error('Server submission termination failure:', error);
    res.status(500).json({ error: error.message || 'Failed to terminate assessment' });
  }
});

// Graceful unhandled-rejection handler: prevents google-auth-library's background async
// chains from crashing the process when no ADC credentials are present in local dev.
process.on('unhandledRejection', (reason: any) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  if (msg.includes('NO_ADC_FOUND') || msg.includes('Could not load the default credentials') || msg.includes('default credentials')) {
    console.warn('[Auth] Firebase ADC not available. Firestore disabled.');
    firestoreDb = null;
  } else {
    // Re-surface unexpected unhandled rejections as warnings so real bugs aren't silenced
    console.error('[Server] Unhandled rejection:', reason);
  }
});

// Serve frontend assets
async function startServer() {
  if (firestoreDb) {
    try {
      // Validate read permission on Firestore to catch unauthorized Project ID configuration early
      await firestoreDb.collection('_connection_check_').limit(1).get();
      console.log("Firebase Admin Firestore connection successfully verified with read access.");
    } catch (err: any) {
      console.log("[Firebase Info] Firestore read check bypassed or not permitted. Falling back to robust in-memory and local storage simulation.");
      firestoreDb = null;
    }
  }

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
    console.log(`Aegis Full-Stack Server running on port ${PORT}`);
  });
}

startServer();
