import { Assessment, Submission, UserProfile } from '../types';
import { INITIAL_ASSESSMENTS } from '../data/mockAssessments';

const KEY_USERS = 'integrity_users';
const KEY_ASSESSMENTS = 'integrity_assessments';
const KEY_SUBMISSIONS = 'integrity_submissions';
const KEY_CURRENT_USER = 'integrity_current_user';

// Pre-populate some historical submissions with realistic violations for the visual analytics
const HISTORICAL_SUBMISSIONS: Submission[] = [
  {
    submissionId: 'sub-1',
    assessmentId: 'assess-1',
    assessmentTitle: 'Algorithms & Data Structures Challenge',
    studentId: 'student-alex',
    studentName: 'Alex Mercer',
    studentEmail: 'alex@student.com',
    answers: {
      'q1_1': '1', // Incorrect option (Queue instead of BST, or O(log N) instead of O(N))
      'q1_2': `function twoSum(nums, target) {
  // Found on StackOverflow
  return [0, 1];
}`,
      'q1_3': '1' // Stack (Correct)
    },
    status: 'graded',
    score: 20,
    totalPoints: 60,
    proctoringLogs: [
      { timestamp: new Date(Date.now() - 3600000 * 24 - 1000 * 600).toISOString(), type: 'tab-switch', details: 'Candidate opened a secondary browser window.' },
      { timestamp: new Date(Date.now() - 3600000 * 24 - 1000 * 500).toISOString(), type: 'copy-paste', details: 'Pasted coding snippet directly into the editor.' },
      { timestamp: new Date(Date.now() - 3600000 * 24 - 1000 * 400).toISOString(), type: 'look-away', details: 'Gaze departed from the assessment screen for 12 seconds.' }
    ],
    aiRiskScore: 84,
    aiProctoringSummary: 'Multiple high-risk actions detected. Alex repeatedly exited full-screen mode, copied external code, and frequently looked off-screen toward a secondary device. Code quality is abnormally low for coding section but copied exactly from popular helper templates.',
    startedAt: new Date(Date.now() - 3600000 * 24 - 1000 * 1200).toISOString(),
    submittedAt: new Date(Date.now() - 3600000 * 24).toISOString()
  },
  {
    submissionId: 'sub-2',
    assessmentId: 'assess-1',
    assessmentTitle: 'Algorithms & Data Structures Challenge',
    studentId: 'student-bella',
    studentName: 'Bella Thorne',
    studentEmail: 'bella@student.com',
    answers: {
      'q1_1': '2', // Correct (O(N))
      'q1_2': `function twoSum(nums, target) {
  const map = {};
  for (let i = 0; i < nums.length; i++) {
    const diff = target - nums[i];
    if (diff in map) {
      return [map[diff], i];
    }
    map[nums[i]] = i;
  }
  return [];
}`,
      'q1_3': '1' // Stack
    },
    status: 'graded',
    score: 60,
    totalPoints: 60,
    proctoringLogs: [],
    aiRiskScore: 5,
    aiProctoringSummary: 'Exemplary focus maintained. No technical indicators or eye-gaze anomalies were observed. Candidate wrote and tested standard linear two-sum solution iteratively.',
    startedAt: new Date(Date.now() - 3600000 * 12 - 1000 * 1500).toISOString(),
    submittedAt: new Date(Date.now() - 3600000 * 12).toISOString()
  },
  {
    submissionId: 'sub-3',
    assessmentId: 'assess-2',
    assessmentTitle: 'Full-Stack JavaScript & Web Core',
    studentId: 'student-chris',
    studentName: 'Chris Evans',
    studentEmail: 'chris@student.com',
    answers: {
      'q2_1': '0', // Correct
      'q2_2': `function reverseWords(str) {
  return str.split(' ').reverse().join(' '); // Used .reverse() contrary to constraints
}`
    },
    status: 'graded',
    score: 30,
    totalPoints: 50,
    proctoringLogs: [
      { timestamp: new Date(Date.now() - 3600000 * 6 - 1000 * 400).toISOString(), type: 'face-missing', details: 'User camera stream reported no active human presence.' }
    ],
    aiRiskScore: 45,
    aiProctoringSummary: 'Moderate risk. Candidate left camera frame for 45 seconds during the evaluation. Code correctness is high but broke instructional constraints by using built-in helper utilities.',
    startedAt: new Date(Date.now() - 3600000 * 6 - 1000 * 1000).toISOString(),
    submittedAt: new Date(Date.now() - 3600000 * 6).toISOString()
  },
  {
    submissionId: 'sub-4',
    assessmentId: 'assess-1',
    assessmentTitle: 'Algorithms & Data Structures Challenge',
    studentId: 'student-diana',
    studentName: 'Diana Prince',
    studentEmail: 'diana@student.com',
    answers: {
      'q1_1': '2',
      'q1_2': `function twoSum(nums, target) {
  // Simple brute-force
  for(let i=0; i<nums.length; i++) {
    for(let j=i+1; j<nums.length; j++) {
      if(nums[i] + nums[j] === target) return [i, j];
    }
  }
  return [];
}`,
      'q1_3': '0' // Queue (incorrect)
    },
    status: 'graded',
    score: 45,
    totalPoints: 60,
    proctoringLogs: [
      { timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), type: 'multiple-faces', details: 'Multiple human profiles identified in the proctoring webcam frame.' }
    ],
    aiRiskScore: 68,
    aiProctoringSummary: 'Secondary person detected in the camera frame multiple times, indicating possible external support. Written code utilizes clean but suboptimal brute-force algorithm.',
    startedAt: new Date(Date.now() - 3600000 * 2 - 1000 * 900).toISOString(),
    submittedAt: new Date(Date.now() - 3600000 * 2).toISOString()
  }
];

export const initDb = () => {
  if (!localStorage.getItem(KEY_ASSESSMENTS)) {
    localStorage.setItem(KEY_ASSESSMENTS, JSON.stringify(INITIAL_ASSESSMENTS));
  }
  if (!localStorage.getItem(KEY_SUBMISSIONS)) {
    localStorage.setItem(KEY_SUBMISSIONS, JSON.stringify(HISTORICAL_SUBMISSIONS));
  }
  if (!localStorage.getItem(KEY_USERS)) {
    const defaultUsers: UserProfile[] = [
      { userId: 'student-alex', name: 'Alex Mercer', email: 'alex@student.com', role: 'student', createdAt: new Date().toISOString() },
      { userId: 'student-bella', name: 'Bella Thorne', email: 'bella@student.com', role: 'student', createdAt: new Date().toISOString() },
      { userId: 'student-chris', name: 'Chris Evans', email: 'chris@student.com', role: 'student', createdAt: new Date().toISOString() },
      { userId: 'student-diana', name: 'Diana Prince', email: 'diana@student.com', role: 'student', createdAt: new Date().toISOString() },
      { userId: 'admin-1', name: 'Dr. Keerthivasan', email: 'keerthivasangkv77@gmail.com', role: 'admin', createdAt: new Date().toISOString() }
    ];
    localStorage.setItem(KEY_USERS, JSON.stringify(defaultUsers));
  }
};

export const getCurrentUser = (): UserProfile | null => {
  const userJson = localStorage.getItem(KEY_CURRENT_USER);
  return userJson ? JSON.parse(userJson) : null;
};

export const setCurrentUser = (user: UserProfile | null) => {
  if (user) {
    localStorage.setItem(KEY_CURRENT_USER, JSON.stringify(user));
  } else {
    localStorage.removeItem(KEY_CURRENT_USER);
  }
};

export const getAssessments = (): Assessment[] => {
  initDb();
  return JSON.parse(localStorage.getItem(KEY_ASSESSMENTS) || '[]');
};

export const getAssessmentById = (id: string): Assessment | null => {
  return getAssessments().find(a => a.assessmentId === id) || null;
};

export const saveAssessment = (assessment: Assessment): void => {
  const assessments = getAssessments();
  const existingIndex = assessments.findIndex(a => a.assessmentId === assessment.assessmentId);
  if (existingIndex > -1) {
    assessments[existingIndex] = assessment;
  } else {
    assessments.push(assessment);
  }
  localStorage.setItem(KEY_ASSESSMENTS, JSON.stringify(assessments));
};

export const getSubmissions = (): Submission[] => {
  initDb();
  return JSON.parse(localStorage.getItem(KEY_SUBMISSIONS) || '[]');
};

export const getSubmissionsForStudent = (studentId: string): Submission[] => {
  return getSubmissions().filter(s => s.studentId === studentId);
};

export const getSubmissionsForAssessment = (assessmentId: string): Submission[] => {
  return getSubmissions().filter(s => s.assessmentId === assessmentId);
};

export const getSubmissionById = (id: string): Submission | null => {
  return getSubmissions().find(s => s.submissionId === id) || null;
};

export const saveSubmission = (submission: Submission): void => {
  const submissions = getSubmissions();
  const existingIndex = submissions.findIndex(s => s.submissionId === submission.submissionId);
  if (existingIndex > -1) {
    submissions[existingIndex] = submission;
  } else {
    submissions.push(submission);
  }
  localStorage.setItem(KEY_SUBMISSIONS, JSON.stringify(submissions));
};

export const registerUser = (user: UserProfile): void => {
  initDb();
  const users: UserProfile[] = JSON.parse(localStorage.getItem(KEY_USERS) || '[]');
  if (!users.some(u => u.email === user.email)) {
    users.push(user);
    localStorage.setItem(KEY_USERS, JSON.stringify(users));
  }
};

export const findUserByEmail = (email: string): UserProfile | null => {
  initDb();
  const users: UserProfile[] = JSON.parse(localStorage.getItem(KEY_USERS) || '[]');
  return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
};
