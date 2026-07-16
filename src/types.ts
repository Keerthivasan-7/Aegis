export type UserRole = 'student' | 'admin';

export interface UserProfile {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  password?: string;
}

export type QuestionType = 'multiple-choice' | 'coding';

export interface BaseQuestion {
  id: string;
  type: QuestionType;
  points: number;
  questionText: string;
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'multiple-choice';
  options: string[];
  correctOptionIndex: number;
}

export interface CodingQuestion extends BaseQuestion {
  type: 'coding';
  starterCode: string;
  testCases: { input: string; expectedOutput: string }[];
  language?: 'javascript' | 'python';
}

export type Question = MultipleChoiceQuestion | CodingQuestion;

export interface Assessment {
  assessmentId: string;
  title: string;
  description: string;
  timeLimit: number; // in minutes
  questions: Question[];
  createdBy: string;
  createdAt: string;
}

export interface ProctoringLog {
  timestamp: string;
  type: 'tab-switch' | 'fullscreen-exit' | 'face-missing' | 'multiple-faces' | 'look-away' | 'copy-paste';
  details: string;
}

export interface Submission {
  submissionId: string;
  assessmentId: string;
  assessmentTitle: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  answers: Record<string, string>; // Maps questionId to candidate's answer/code
  status: 'ongoing' | 'submitted' | 'graded' | 'terminated';
  score: number;
  totalPoints: number;
  proctoringLogs: ProctoringLog[];
  aiRiskScore?: number; // 0 to 100
  aiProctoringSummary?: string;
  terminationReason?: string;
  startedAt: string;
  submittedAt?: string;
}
