import { doc, getDoc, getDocs, setDoc, updateDoc, collection, query, where, getDocFromServer } from 'firebase/firestore';
import { db, auth } from './firebase';
import { Assessment, Submission, UserProfile, ProctoringLog } from '../types';
import { INITIAL_ASSESSMENTS } from '../data/mockAssessments';

// Operations supported
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

// Global helper to handle Firestore error formatting
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Security/Operational Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Dual-Mode Database State Tracker
let isFirestoreAvailable = true;

// Fallback Local Storage Keys and helper utilities
const LOCAL_STORAGE_PREFIX = 'aegis_local_';

function getLocalItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(LOCAL_STORAGE_PREFIX + key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setLocalItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.error('Local Storage fallback write error:', e);
  }
}

// Fallback static datasets
const defaultUsers: UserProfile[] = [
  { userId: 'student-alex', name: 'Alex Mercer', email: 'alex@student.com', role: 'student', createdAt: new Date().toISOString() },
  { userId: 'student-bella', name: 'Bella Thorne', email: 'bella@student.com', role: 'student', createdAt: new Date().toISOString() },
  { userId: 'student-chris', name: 'Chris Evans', email: 'chris@student.com', role: 'student', createdAt: new Date().toISOString() },
  { userId: 'student-diana', name: 'Diana Prince', email: 'diana@student.com', role: 'student', createdAt: new Date().toISOString() },
  { userId: 'admin-1', name: 'Dr. Keerthivasan', email: 'keerthivasangkv77@gmail.com', role: 'admin', createdAt: new Date().toISOString() }
];

const MOCK_SUBMISSIONS: Submission[] = [
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
    status: 'graded' as const,
    score: 20,
    totalPoints: 60,
    proctoringLogs: [
      { timestamp: new Date(Date.now() - 3600000 * 24).toISOString(), type: 'tab-switch' as const, details: 'Candidate opened secondary windows.' },
      { timestamp: new Date(Date.now() - 3600000 * 24 + 5000).toISOString(), type: 'copy-paste' as const, details: 'Pasted coding snippet directly into editor.' },
      { timestamp: new Date(Date.now() - 3600000 * 24 + 10000).toISOString(), type: 'look-away' as const, details: 'Gaze departed from the assessment environment temporarily.' }
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
    status: 'graded' as const,
    score: 60,
    totalPoints: 60,
    proctoringLogs: [],
    aiRiskScore: 5,
    aiProctoringSummary: 'Exemplary focus maintained. Gaze tracking remained steady with zero interface excursions or unauthorized interruptions.',
    startedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    submittedAt: new Date(Date.now() - 3600000 * 12 + 120000).toISOString()
  }
];

// Helper to determine active mode
export function isUsingLocalSandbox(): boolean {
  return !isFirestoreAvailable;
}

// 1. Connection Validation as mandatory in skill
export async function validateFirebaseConnection() {
  try {
    await getDocFromServer(doc(db, '_connection_test_collection_', 'ping'));
    isFirestoreAvailable = true;
    console.log('Firebase Firestore Connection successfully validated.');
  } catch (error) {
    isFirestoreAvailable = false;
    console.warn('Firebase Firestore is not available/configured. Aegis will operate in highly-resilient local sandbox fallback mode.');
  }
}

// --- CORE DB API WITH RESILIENT DUAL-MODE DRIVERS ---

export async function getAssessments(): Promise<Assessment[]> {
  const path = 'assessments';
  if (!isFirestoreAvailable) {
    return getLocalItem<Assessment[]>('assessments', INITIAL_ASSESSMENTS);
  }
  try {
    const q = collection(db, path);
    const snap = await getDocs(q);
    const list = snap.docs.map(d => ({ assessmentId: d.id, ...d.data() } as Assessment));
    if (list.length === 0) {
      return INITIAL_ASSESSMENTS;
    }
    return list;
  } catch (error) {
    console.warn('Firestore getAssessments failed, falling back to local storage:', error);
    return getLocalItem<Assessment[]>('assessments', INITIAL_ASSESSMENTS);
  }
}

export async function getAssessmentById(id: string): Promise<Assessment | null> {
  const path = `assessments/${id}`;
  if (!isFirestoreAvailable) {
    const list = getLocalItem<Assessment[]>('assessments', INITIAL_ASSESSMENTS);
    return list.find(a => a.assessmentId === id) || null;
  }
  try {
    const d = await getDoc(doc(db, 'assessments', id));
    if (!d.exists()) return null;
    return { assessmentId: d.id, ...d.data() } as Assessment;
  } catch (error) {
    console.warn('Firestore getAssessmentById failed, falling back to local storage:', error);
    const list = getLocalItem<Assessment[]>('assessments', INITIAL_ASSESSMENTS);
    return list.find(a => a.assessmentId === id) || null;
  }
}

export async function saveAssessment(assessment: Assessment): Promise<void> {
  const path = `assessments/${assessment.assessmentId}`;
  const list = getLocalItem<Assessment[]>('assessments', INITIAL_ASSESSMENTS);
  const index = list.findIndex(a => a.assessmentId === assessment.assessmentId);
  if (index >= 0) {
    list[index] = assessment;
  } else {
    list.push(assessment);
  }
  setLocalItem('assessments', list);

  if (!isFirestoreAvailable) return;
  try {
    await setDoc(doc(db, 'assessments', assessment.assessmentId), assessment);
  } catch (error) {
    console.warn('Firestore saveAssessment failed, data saved locally:', error);
  }
}

export async function getSubmissions(): Promise<Submission[]> {
  const path = 'submissions';
  if (!isFirestoreAvailable) {
    return getLocalItem<Submission[]>('submissions', MOCK_SUBMISSIONS);
  }
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(d => ({ submissionId: d.id, ...d.data() } as Submission));
  } catch (error) {
    console.warn('Firestore getSubmissions failed, falling back to local storage:', error);
    return getLocalItem<Submission[]>('submissions', MOCK_SUBMISSIONS);
  }
}

export async function getSubmissionsForStudent(studentId: string): Promise<Submission[]> {
  const path = 'submissions';
  if (!isFirestoreAvailable) {
    const list = getLocalItem<Submission[]>('submissions', MOCK_SUBMISSIONS);
    return list.filter(s => s.studentId === studentId);
  }
  try {
    const q = query(collection(db, 'submissions'), where('studentId', '==', studentId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ submissionId: d.id, ...d.data() } as Submission));
  } catch (error) {
    console.warn('Firestore getSubmissionsForStudent failed, falling back to local storage:', error);
    const list = getLocalItem<Submission[]>('submissions', MOCK_SUBMISSIONS);
    return list.filter(s => s.studentId === studentId);
  }
}

export async function getSubmissionsForAssessment(assessmentId: string): Promise<Submission[]> {
  const path = 'submissions';
  if (!isFirestoreAvailable) {
    const list = getLocalItem<Submission[]>('submissions', MOCK_SUBMISSIONS);
    return list.filter(s => s.assessmentId === assessmentId);
  }
  try {
    const q = query(collection(db, 'submissions'), where('assessmentId', '==', assessmentId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ submissionId: d.id, ...d.data() } as Submission));
  } catch (error) {
    console.warn('Firestore getSubmissionsForAssessment failed, falling back to local storage:', error);
    const list = getLocalItem<Submission[]>('submissions', MOCK_SUBMISSIONS);
    return list.filter(s => s.assessmentId === assessmentId);
  }
}

export async function getSubmissionById(id: string): Promise<Submission | null> {
  const path = `submissions/${id}`;
  if (!isFirestoreAvailable) {
    const list = getLocalItem<Submission[]>('submissions', MOCK_SUBMISSIONS);
    return list.find(s => s.submissionId === id) || null;
  }
  try {
    const d = await getDoc(doc(db, 'submissions', id));
    if (!d.exists()) return null;
    return { submissionId: d.id, ...d.data() } as Submission;
  } catch (error) {
    console.warn('Firestore getSubmissionById failed, falling back to local storage:', error);
    const list = getLocalItem<Submission[]>('submissions', MOCK_SUBMISSIONS);
    return list.find(s => s.submissionId === id) || null;
  }
}

export async function saveSubmission(submission: Submission): Promise<void> {
  const path = `submissions/${submission.submissionId}`;
  const list = getLocalItem<Submission[]>('submissions', MOCK_SUBMISSIONS);
  const index = list.findIndex(s => s.submissionId === submission.submissionId);
  if (index >= 0) {
    list[index] = submission;
  } else {
    list.push(submission);
  }
  setLocalItem('submissions', list);

  if (!isFirestoreAvailable) return;
  try {
    await setDoc(doc(db, 'submissions', submission.submissionId), submission);
  } catch (error) {
    console.warn('Firestore saveSubmission failed, data saved locally:', error);
  }
}

export async function updateSubmissionFields(submissionId: string, fields: Partial<Submission>): Promise<void> {
  const path = `submissions/${submissionId}`;
  const list = getLocalItem<Submission[]>('submissions', MOCK_SUBMISSIONS);
  const index = list.findIndex(s => s.submissionId === submissionId);
  if (index >= 0) {
    list[index] = { ...list[index], ...fields } as Submission;
    setLocalItem('submissions', list);
  }

  if (!isFirestoreAvailable) return;
  try {
    await updateDoc(doc(db, 'submissions', submissionId), fields);
  } catch (error) {
    console.warn('Firestore updateSubmissionFields failed, data saved locally:', error);
  }
}

export async function registerUserDoc(user: UserProfile): Promise<void> {
  const path = `users/${user.userId}`;
  const list = getLocalItem<UserProfile[]>('users', defaultUsers);
  const index = list.findIndex(u => u.userId === user.userId);
  if (index >= 0) {
    list[index] = user;
  } else {
    list.push(user);
  }
  setLocalItem('users', list);

  if (!isFirestoreAvailable) return;
  try {
    await setDoc(doc(db, 'users', user.userId), {
      userId: user.userId,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    });
  } catch (error) {
    console.warn('Firestore registerUserDoc failed, profile saved locally:', error);
  }
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const path = `users/${userId}`;
  if (!isFirestoreAvailable) {
    const list = getLocalItem<UserProfile[]>('users', defaultUsers);
    return list.find(u => u.userId === userId) || null;
  }
  try {
    const d = await getDoc(doc(db, 'users', userId));
    if (!d.exists()) return null;
    return d.data() as UserProfile;
  } catch (error) {
    console.warn('Firestore getUserProfile failed, falling back to local storage:', error);
    const list = getLocalItem<UserProfile[]>('users', defaultUsers);
    return list.find(u => u.userId === userId) || null;
  }
}


