import { doc, getDoc, getDocs, setDoc, updateDoc, collection, query, where } from 'firebase/firestore';
import { db } from './firebase';
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
    operationType,
    path,
    authInfo: {}
  };
  console.error('Firestore Security/Operational Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- CORE DB API ---

export async function getAssessments(): Promise<Assessment[]> {
  const path = 'assessments';
  const q = collection(db, path);
  const snap = await getDocs(q);
  const list = snap.docs.map(d => ({ assessmentId: d.id, ...d.data() } as Assessment));
  if (list.length === 0) {
    return INITIAL_ASSESSMENTS;
  }
  return list;
}

export async function getAssessmentById(id: string): Promise<Assessment | null> {
  const path = `assessments/${id}`;
  try {
    const d = await getDoc(doc(db, 'assessments', id));
    if (!d.exists()) return null;
    return { assessmentId: d.id, ...d.data() } as Assessment;
  } catch (error) {
    console.warn('Firestore getAssessmentById failed:', error);
    return null;
  }
}

export async function saveAssessment(assessment: Assessment): Promise<void> {
  const path = `assessments/${assessment.assessmentId}`;
  try {
    await setDoc(doc(db, 'assessments', assessment.assessmentId), assessment);
  } catch (error) {
    console.warn('Firestore saveAssessment failed:', error);
    throw error;
  }
}

export async function getSubmissions(): Promise<Submission[]> {
  const path = 'submissions';
  const snap = await getDocs(collection(db, path));
  return snap.docs.map(d => ({ submissionId: d.id, ...d.data() } as Submission));
}

export async function getSubmissionsForStudent(studentId: string): Promise<Submission[]> {
  const path = 'submissions';
  const q = query(collection(db, 'submissions'), where('studentId', '==', studentId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ submissionId: d.id, ...d.data() } as Submission));
}

export async function getSubmissionsForAssessment(assessmentId: string): Promise<Submission[]> {
  const path = 'submissions';
  const q = query(collection(db, 'submissions'), where('assessmentId', '==', assessmentId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ submissionId: d.id, ...d.data() } as Submission));
}

export async function getSubmissionById(id: string): Promise<Submission | null> {
  const path = `submissions/${id}`;
  try {
    const d = await getDoc(doc(db, 'submissions', id));
    if (!d.exists()) return null;
    return { submissionId: d.id, ...d.data() } as Submission;
  } catch (error) {
    console.warn('Firestore getSubmissionById failed:', error);
    return null;
  }
}

export async function saveSubmission(submission: Submission): Promise<void> {
  const path = `submissions/${submission.submissionId}`;
  try {
    await setDoc(doc(db, 'submissions', submission.submissionId), submission);
  } catch (error) {
    console.warn('Firestore saveSubmission failed:', error);
    throw error;
  }
}

export async function updateSubmissionFields(submissionId: string, fields: Partial<Submission>): Promise<void> {
  const path = `submissions/${submissionId}`;
  try {
    await updateDoc(doc(db, 'submissions', submissionId), fields);
  } catch (error) {
    console.warn('Firestore updateSubmissionFields failed:', error);
    throw error;
  }
}

export async function registerUserDoc(user: UserProfile): Promise<void> {
  const path = `users/${user.userId}`;
  try {
    await setDoc(doc(db, 'users', user.userId), user, { merge: true });
  } catch (error) {
    console.warn('Firestore registerUserDoc failed:', error);
    throw error;
  }
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const path = `users/${userId}`;
  try {
    const d = await getDoc(doc(db, 'users', userId));
    if (!d.exists()) return null;
    return d.data() as UserProfile;
  } catch (error) {
    console.warn('Firestore getUserProfile failed:', error);
    return null;
  }
}