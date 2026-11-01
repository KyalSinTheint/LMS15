import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  Profile,
  Course,
  Channel,
  CourseEnrollment,
  ChannelAccess,
  LearningProgress,
  AdminAuditLog,
  AdminStats,
  AccountStatus,
  UserRole,
  ProgressCompletionStatus,
  CompanyNewsArticle,
  CompanyVideoItem,
  TopPerformerEntry,
  EmailLogEntry,
  HodMotto,
  LdTeamMember,
  LicenseTrainingLesson,
  LicenseContentType,
  LicenseChapter,
  ChapterStatus,
  SkillDevelopmentResource,
  SkillCategory,
  LessonProgressInfo,
  LicenseQuiz,
  LicenseQuizQuestion,
  LicenseQuizAttempt,
  SkillQuiz,
  SkillQuizQuestion,
  SkillQuizAttempt,
  ProductKnowledgeItem,
  ProductQuiz,
  ProductQuizQuestion,
  ProductQuizAttempt,
  CompanyBulletinItem,
  BulletinCategory,
} from '../types/lms';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';

export function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}

interface LmsContextType {
  currentUser: Profile;
  profiles: Profile[];
  courses: Course[];
  channels: Channel[];
  courseEnrollments: CourseEnrollment[];
  channelAccesses: ChannelAccess[];
  learningProgress: LearningProgress[];
  companyNews: CompanyNewsArticle[];
  companyVideos: CompanyVideoItem[];
  topPerformers: TopPerformerEntry[];
  hodMotto: HodMotto;
  teamMembers: LdTeamMember[];
  licenseTrainingLessons: LicenseTrainingLesson[];
  skillCategories: SkillCategory[];
  skillDevelopmentResources: SkillDevelopmentResource[];
  products: ProductKnowledgeItem[];
  productQuizzes: ProductQuiz[];
  productQuizAttempts: ProductQuizAttempt[];
  companyBulletins: CompanyBulletinItem[];
  auditLogs: AdminAuditLog[];
  emailLogs: EmailLogEntry[];
  isLoading: boolean;
  isSupabaseLive: boolean;
  toasts: ToastMessage[];
  dismissToast: (id: string) => void;
  showToast: (type: ToastMessage['type'], title: string, message?: string, durationMs?: number) => void;

  // Theme support
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;

  // Session & Authentication (Supabase Auth)
  isAuthenticated: boolean;
  /** false until the stored Supabase session (and profile) has been checked */
  isAuthReady: boolean;
  /** true after the user opened a password-reset email link */
  isPasswordRecovery: boolean;
  completePasswordRecovery: (newPassword: string) => Promise<{ success: boolean; message: string }>;
  /** Leave the reset-password screen (e.g. expired link) and go back to the normal app / sign-in */
  exitPasswordRecovery: () => void;
  loginWithCredentials: (identifier: string, password: string) => Promise<{ success: boolean; message: string; mustChangePassword?: boolean; account_status?: AccountStatus; role?: UserRole }>;
  registerUser: (data: { full_name: string; username: string; email: string; password: string; department?: string; employee_id?: string }) => Promise<{ success: boolean; user?: Profile; message: string; needsEmailConfirmation?: boolean }>;
  checkUserApprovalStatus: (userId?: string) => Promise<AccountStatus>;
  approveUser: (userId: string) => Promise<boolean>;
  rejectUser: (userId: string, reason: string) => Promise<boolean>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; message: string; isConfigured?: boolean }>;
  updateAdminProfile: (updates: Partial<Profile>) => Promise<boolean>;
  updateProfile: (userId: string, updates: Partial<Profile>) => Promise<{ success: boolean; message: string; profile?: Profile }>;
  fetchProfile: (userId: string) => Promise<Profile | null>;
  signOut: () => void;

  // Computed / Queries
  getStats: () => AdminStats;
  getUserEnrollments: (userId: string) => CourseEnrollment[];
  getUserChannelAccesses: (userId: string) => ChannelAccess[];
  getUserAccessibleCourses: (userId: string) => Course[];
  getUserAccessibleChannels: (userId: string) => Channel[];
  getUserProgress: (userId: string, courseId?: string, channelId?: string) => LearningProgress | undefined;
  getPublishedNews: () => CompanyNewsArticle[];
  getPublishedVideos: () => CompanyVideoItem[];
  getPublishedTopPerformers: () => TopPerformerEntry[];
  getPublishedTeamMembers: () => LdTeamMember[];
  getPublishedHodMotto: () => HodMotto | null;
  getPublishedLicenseLessons: () => LicenseTrainingLesson[];
  getPublishedSkillCategories: () => SkillCategory[];
  getPublishedSkillResources: () => SkillDevelopmentResource[];
  getPublishedProducts: () => ProductKnowledgeItem[];
  getProduct: (id: string) => ProductKnowledgeItem | undefined;

  // Administrative mutations
  updateUserStatus: (userId: string, status: AccountStatus, reason?: string) => Promise<boolean>;
  updateUserRole: (userId: string, role: UserRole, reason?: string) => Promise<boolean>;
  assignCourse: (userId: string, courseId: string, expiresAt?: string | null, note?: string) => Promise<boolean>;
  revokeCourse: (userId: string, courseId: string, reason?: string) => Promise<boolean>;
  assignChannel: (userId: string, channelId: string, expiresAt?: string | null, note?: string) => Promise<boolean>;
  revokeChannel: (userId: string, channelId: string, reason?: string) => Promise<boolean>;
  createCourse: (course: Omit<Course, 'id' | 'created_at' | 'updated_at'>) => Promise<Course | null>;
  updateCourse: (courseId: string, updates: Partial<Course>) => Promise<boolean>;
  deleteCourse: (courseId: string) => Promise<boolean>;
  createChannel: (channel: Omit<Channel, 'id' | 'created_at' | 'updated_at'>) => Promise<Channel | null>;
  updateChannel: (channelId: string, updates: Partial<Channel>) => Promise<boolean>;
  deleteChannel: (channelId: string) => Promise<boolean>;

  // Company News mutations
  createNews: (article: Omit<CompanyNewsArticle, 'id' | 'created_at' | 'updated_at'>) => Promise<CompanyNewsArticle | null>;
  updateNews: (id: string, updates: Partial<CompanyNewsArticle>) => Promise<boolean>;
  deleteNews: (id: string) => Promise<boolean>;

  // Company Videos mutations
  createVideo: (video: Omit<CompanyVideoItem, 'id' | 'created_at' | 'updated_at'>) => Promise<CompanyVideoItem | null>;
  updateVideo: (id: string, updates: Partial<CompanyVideoItem>) => Promise<boolean>;
  deleteVideo: (id: string) => Promise<boolean>;

  // Top Performers mutations
  createTopPerformer: (performer: Omit<TopPerformerEntry, 'id' | 'created_at' | 'updated_at'>) => Promise<TopPerformerEntry | null>;
  updateTopPerformer: (id: string, updates: Partial<TopPerformerEntry>) => Promise<boolean>;
  deleteTopPerformer: (id: string) => Promise<boolean>;

  // License Training Lessons mutations (Admin to User Publishing Flow)
  createLicenseLesson: (lesson: Omit<LicenseTrainingLesson, 'id' | 'created_at' | 'updated_at'>) => Promise<LicenseTrainingLesson | null>;
  updateLicenseLesson: (id: string, updates: Partial<LicenseTrainingLesson>) => Promise<boolean>;
  deleteLicenseLesson: (id: string) => Promise<boolean>;

  // Skill Categories mutations (Admin Category Management)
  createSkillCategory: (category: Omit<SkillCategory, 'id' | 'created_at' | 'updated_at'>) => Promise<SkillCategory | null>;
  updateSkillCategory: (id: string, updates: Partial<SkillCategory>) => Promise<boolean>;
  deleteSkillCategory: (id: string) => Promise<boolean>;

  // Skill Development Resources mutations (Admin to User Publishing Flow)
  createSkillResource: (resource: Omit<SkillDevelopmentResource, 'id' | 'created_at' | 'updated_at'>) => Promise<SkillDevelopmentResource | null>;
  updateSkillResource: (id: string, updates: Partial<SkillDevelopmentResource>) => Promise<boolean>;
  deleteSkillResource: (id: string) => Promise<boolean>;

  // HOD Motto & L&D Team mutations
  updateHodMotto: (updates: Partial<HodMotto>) => Promise<boolean>;
  createTeamMember: (member: Omit<LdTeamMember, 'id' | 'created_at' | 'updated_at'>) => Promise<LdTeamMember | null>;
  updateTeamMember: (id: string, updates: Partial<LdTeamMember>) => Promise<boolean>;
  deleteTeamMember: (id: string) => Promise<boolean>;
  reorderTeamMembers: (orderedIds: string[]) => Promise<boolean>;

  // User invitation & Email Delivery
  inviteUser: (data: { email: string; full_name: string; role: UserRole; department: string; employee_id?: string }) => Promise<boolean>;
  sendCustomEmail: (to: string, subject: string, html: string, template?: string) => Promise<{ success: boolean; message: string }>;

  // Learner Progress mutations
  recordProgress: (
    courseId?: string,
    channelId?: string,
    percentage?: number,
    completionStatus?: ProgressCompletionStatus,
    completedModule?: string
  ) => Promise<boolean>;

  // License Training Video & PDF Progress (Genuinely Watched & Read Progress)
  licenseVideoProgress: Record<string, LessonProgressInfo>;
  getLessonProgress: (lessonId: string) => LessonProgressInfo;
  recordVideoHeartbeat: (
    lessonId: string,
    segment: { start: number; end: number },
    duration: number,
    playbackRate?: number,
    lastPosition?: number
  ) => Promise<LessonProgressInfo | null>;
  recordPdfPageProgress: (
    lessonId: string,
    page: number,
    totalPages: number
  ) => Promise<LessonProgressInfo | null>;

  // License Training Chapters, Sequential Progression & Quizzes
  licenseChapters: LicenseChapter[];
  chapterCompletions: Record<string, { status: ChapterStatus; materials_completed: boolean; quiz_passed: boolean; highest_quiz_score: number }>;
  getChapterStatus: (chapterId: string) => ChapterStatus;
  getChapterMaterialsProgress: (chapterId: string) => {
    isComplete: boolean;
    completedCount: number;
    totalCount: number;
    percentage: number;
  };
  getOverallLicenseProgress: () => {
    totalChapters: number;
    completedChapters: number;
    overallPercentage: number;
    isCourseCompleted: boolean;
  };
  createLicenseChapter: (data: {
    title: string;
    chapter_number?: number;
    description?: string;
    passing_score?: number;
    display_order?: number;
    is_published?: boolean;
  }) => Promise<boolean>;
  updateLicenseChapter: (id: string, updates: Partial<LicenseChapter>) => Promise<boolean>;
  deleteLicenseChapter: (id: string) => Promise<boolean>;
  reorderLicenseChapters: (orderedIds: string[]) => Promise<boolean>;
  getChapterQuiz: (chapterId: string) => Promise<LicenseQuiz | null>;
  saveChapterQuiz: (
    chapterId: string,
    data: {
      title: string;
      description?: string;
      passingScore: number;
      questions: LicenseQuizQuestion[];
    }
  ) => Promise<boolean>;
  submitChapterQuiz: (
    chapterId: string,
    quizId: string,
    answers: Record<string, number>
  ) => Promise<{
    success: boolean;
    score?: number;
    total_questions?: number;
    percentage?: number;
    passed?: boolean;
    passing_score?: number;
    breakdown?: Array<{
      question_id: string;
      question_text: string;
      selected_index: number | null;
      correct_index: number;
      is_correct: boolean;
      explanation: string;
    }>;
    next_chapter_unlocked?: boolean;
    next_chapter_title?: string;
    message?: string;
  }>;

  // License Training Quizzes & Assessments (Legacy & Lesson-Specific)
  licenseQuizzes: LicenseQuiz[];
  licenseQuizAttempts: LicenseQuizAttempt[];
  getLessonQuiz: (lessonId: string) => Promise<LicenseQuiz | null>;
  submitQuizAttempt: (
    lessonId: string,
    quizId: string,
    answers: Record<string, number>
  ) => Promise<{
    success: boolean;
    score?: number;
    total_questions?: number;
    percentage?: number;
    passed?: boolean;
    passing_score?: number;
    breakdown?: Array<{
      question_id: string;
      question_text: string;
      selected_index: number | null;
      correct_index: number;
      is_correct: boolean;
      explanation: string;
    }>;
    overall_completed?: boolean;
    message?: string;
  }>;
  saveQuiz: (
    lessonId: string,
    title: string,
    description: string,
    passingScore: number,
    questions: LicenseQuizQuestion[]
  ) => Promise<boolean>;
  getQuizAttempts: (lessonId?: string, chapterId?: string) => Promise<LicenseQuizAttempt[]>;

  // Product Knowledge Hub mutations
  createProduct: (product: Omit<ProductKnowledgeItem, 'id' | 'created_at' | 'updated_at'>) => Promise<ProductKnowledgeItem | null>;
  updateProduct: (id: string, updates: Partial<ProductKnowledgeItem>) => Promise<boolean>;
  deleteProduct: (id: string) => Promise<boolean>;
  getProductQuiz: (productId: string) => Promise<ProductQuiz | null>;
  saveProductQuiz: (productId: string, data: { title: string; description?: string; passing_score: number; max_attempts?: number; is_published: boolean; questions: ProductQuizQuestion[] }) => Promise<boolean>;
  submitProductQuizAttempt: (productId: string, quizId: string, answers: Record<string, number>) => Promise<{
    success: boolean;
    score?: number;
    total_questions?: number;
    percentage?: number;
    passed?: boolean;
    passing_score?: number;
    breakdown?: Array<{
      question_id: string;
      question_text: string;
      selected_index: number | null;
      correct_index: number;
      is_correct: boolean;
      explanation: string;
    }>;
    attempt?: ProductQuizAttempt;
    message?: string;
  }>;
  getUserProductAttempts: (productId?: string) => Promise<ProductQuizAttempt[]>;
  // AI-Powered Quiz Extraction & Generation from Uploaded PDF
  generateQuizFromPdf: (data: {
    fileUrl?: string;
    base64?: string;
    fileName?: string;
    count?: number;
    topic?: string;
  }) => Promise<{
    success: boolean;
    questions?: any[];
    page_count?: number;
    extracted_preview?: string;
    error?: string;
    isScanned?: boolean;
    message?: string;
  }>;

  // Skill Development Quizzes & Assessments
  skillQuizzes: SkillQuiz[];
  skillQuizAttempts: SkillQuizAttempt[];
  getSkillQuiz: (categoryId?: string, resourceId?: string, quizId?: string) => Promise<SkillQuiz | null>;
  saveSkillQuiz: (data: {
    id?: string;
    category_id?: string;
    resource_id?: string;
    title: string;
    description?: string;
    passing_score: number;
    is_published?: boolean;
    questions: SkillQuizQuestion[];
  }) => Promise<boolean>;
  deleteSkillQuiz: (quizId: string) => Promise<boolean>;
  submitSkillQuiz: (
    quizId: string,
    categoryId: string | undefined,
    answers: Record<string, number>
  ) => Promise<{
    success: boolean;
    score?: number;
    total_questions?: number;
    percentage?: number;
    passed?: boolean;
    passing_score?: number;
    breakdown?: Array<{
      question_id: string;
      question_text: string;
      selected_index: number | null;
      correct_index: number;
      is_correct: boolean;
      explanation: string;
    }>;
    attempt?: SkillQuizAttempt;
    message?: string;
  }>;
  getSkillQuizAttempts: (categoryId?: string, quizId?: string) => Promise<SkillQuizAttempt[]>;

  // Company Bulletin mutations
  createBulletin: (data: Omit<CompanyBulletinItem, 'id' | 'created_at' | 'updated_at'>) => Promise<CompanyBulletinItem | null>;
  updateBulletin: (id: string, updates: Partial<CompanyBulletinItem>) => Promise<boolean>;
  deleteBulletin: (id: string) => Promise<boolean>;

  // Data reload
  refreshData: () => Promise<void>;
}

type ChapterCompletionState = {
  status: ChapterStatus;
  materials_completed: boolean;
  quiz_passed: boolean;
  highest_quiz_score: number;
};

type QuizResult = {
  success: boolean;
  score?: number;
  total_questions?: number;
  percentage?: number;
  passed?: boolean;
  passing_score?: number;
  breakdown?: Array<{
    question_id: string;
    question_text: string;
    selected_index: number | null;
    correct_index: number;
    is_correct: boolean;
    explanation: string;
  }>;
  next_chapter_unlocked?: boolean;
  next_chapter_title?: string;
  overall_completed?: boolean;
  attempt?: any;
  message?: string;
};

// Placeholder used while nobody is signed in. Never persisted anywhere.
const GUEST_PROFILE: Profile = {
  id: '',
  full_name: 'Guest',
  email: '',
  role: 'user',
  account_status: 'pending',
  created_at: '',
  updated_at: '',
};

const EMPTY_HOD_MOTTO: HodMotto = {
  id: 'hod_motto_001',
  motto_text: '',
  is_published: false,
  updated_at: '',
};

const isActiveStatus = (status?: AccountStatus) => status === 'active' || status === 'approved';

const errorMessage = (err: unknown): string => {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message;
  const anyErr = err as { message?: string; details?: string };
  return anyErr.message || anyErr.details || JSON.stringify(err);
};

// Foreign-key columns: an empty string from a form select must be stored as NULL.
const NULLABLE_FK_COLUMNS = ['course_id', 'channel_id', 'chapter_id', 'lesson_id', 'category_id', 'resource_id', 'author_id'];
const cleanRow = (row: Record<string, any>): Record<string, any> => {
  const out: Record<string, any> = {};
  Object.entries(row).forEach(([key, value]) => {
    if (value === undefined) return;
    out[key] = NULLABLE_FK_COLUMNS.includes(key) && value === '' ? null : value;
  });
  return out;
};

const shortId = (prefix: string) => `${prefix}_${generateUuid().replace(/-/g, '').slice(0, 12)}`;

function normalizeQuestions<Q extends { id: string; quiz_id: string; display_order: number }>(
  questions: Q[],
  quizId: string
): Q[] {
  return questions.map((q, idx) => ({
    ...q,
    id: q.id && q.id.trim() ? q.id : shortId('q'),
    quiz_id: quizId,
    display_order: idx + 1,
  }));
}

function toLessonProgress(row: any): LessonProgressInfo {
  return {
    lesson_id: row.lesson_id,
    content_type: row.content_type || undefined,
    progress_percentage: row.progress_percentage ?? 0,
    completion_status: row.completion_status || 'not_started',
    watched_seconds: Number(row.watched_seconds ?? 0),
    total_duration_seconds: Number(row.total_duration_seconds ?? 0),
    watched_intervals: Array.isArray(row.watched_intervals) ? row.watched_intervals : [],
    last_position: Number(row.last_position ?? 0),
    viewed_pages: Array.isArray(row.viewed_pages) ? row.viewed_pages : [],
    total_pages: row.total_pages ?? 0,
    last_page: row.last_page ?? 1,
    quiz_score: row.quiz_score ?? undefined,
    quiz_passed: row.quiz_passed ?? undefined,
    quiz_attempts_count: row.quiz_attempts_count ?? 0,
    quiz_completed_at: row.quiz_completed_at ?? undefined,
    overall_completed: Boolean(row.overall_completed),
    updated_at: row.updated_at,
  };
}

/** Page that password-reset emails link to (rewritten to index.html by Vercel). */
export const RESET_PASSWORD_PATH = '/reset-password';

const leaveResetPasswordUrl = () => {
  if (typeof window !== 'undefined' && window.location.pathname.replace(/\/+$/, '') === RESET_PASSWORD_PATH) {
    window.history.replaceState(null, '', '/');
  }
};

const LmsContext = createContext<LmsContextType | undefined>(undefined);

export const LmsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // -------------------------------------------------------------
  // STATE (in-memory only; Supabase is the source of truth)
  // -------------------------------------------------------------
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [courseEnrollments, setCourseEnrollments] = useState<CourseEnrollment[]>([]);
  const [channelAccesses, setChannelAccesses] = useState<ChannelAccess[]>([]);
  const [companyNews, setCompanyNews] = useState<CompanyNewsArticle[]>([]);
  const [companyVideos, setCompanyVideos] = useState<CompanyVideoItem[]>([]);
  const [topPerformers, setTopPerformers] = useState<TopPerformerEntry[]>([]);
  const [hodMotto, setHodMotto] = useState<HodMotto>(EMPTY_HOD_MOTTO);
  const [teamMembers, setTeamMembers] = useState<LdTeamMember[]>([]);
  const [licenseTrainingLessons, setLicenseTrainingLessons] = useState<LicenseTrainingLesson[]>([]);
  const [skillCategories, setSkillCategories] = useState<SkillCategory[]>([]);
  const [skillDevelopmentResources, setSkillDevelopmentResources] = useState<SkillDevelopmentResource[]>([]);
  const [learningProgress, setLearningProgress] = useState<LearningProgress[]>([]);
  const [licenseVideoProgress, setLicenseVideoProgress] = useState<Record<string, LessonProgressInfo>>({});
  const [licenseChapters, setLicenseChapters] = useState<LicenseChapter[]>([]);
  const [licenseQuizzes, setLicenseQuizzes] = useState<LicenseQuiz[]>([]);
  const [licenseQuizAttempts, setLicenseQuizAttempts] = useState<LicenseQuizAttempt[]>([]);
  const [chapterCompletions, setChapterCompletions] = useState<Record<string, ChapterCompletionState>>({});
  const [products, setProducts] = useState<ProductKnowledgeItem[]>([]);
  const [productQuizzes, setProductQuizzes] = useState<ProductQuiz[]>([]);
  const [productQuizAttempts, setProductQuizAttempts] = useState<ProductQuizAttempt[]>([]);
  const [skillQuizzes, setSkillQuizzes] = useState<SkillQuiz[]>([]);
  const [skillQuizAttempts, setSkillQuizAttempts] = useState<SkillQuizAttempt[]>([]);
  const [companyBulletins, setCompanyBulletins] = useState<CompanyBulletinItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLogEntry[]>([]);

  // Auth: the Supabase session decides who is signed in.
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState<boolean>(!isSupabaseConfigured());
  // undefined = still loading, null = no profile row
  const [myProfile, setMyProfile] = useState<Profile | null | undefined>(undefined);
  // Recovery mode is detected from the URL too, so it works even if the
  // PASSWORD_RECOVERY auth event fires before the app starts listening.
  const [isPasswordRecovery, setIsPasswordRecovery] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.location.pathname.replace(/\/+$/, '') === RESET_PASSWORD_PATH ||
      /(^|[#&?])type=recovery(&|$)/.test(window.location.hash + window.location.search)
    );
  });
  const authUserIdRef = useRef<string | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSupabaseLive, setIsSupabaseLive] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Theme is a per-device display preference, so it stays in localStorage.
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('kbz_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
    } catch {}
    return 'light';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem('kbz_theme', theme);
    } catch {}
  }, [theme]);

  const toggleTheme = useCallback(() => setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark')), []);
  const setTheme = useCallback((t: 'light' | 'dark') => setThemeState(t), []);

  const showToast = useCallback(
    (type: ToastMessage['type'], title: string, message?: string, durationMs: number = 4500) => {
      const id = 'toast_' + Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, type, title, message }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), durationMs);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const currentUser: Profile =
    (authUserId && profiles.find((p) => p.id === authUserId)) || myProfile || GUEST_PROFILE;
  const isAuthenticated = Boolean(authUserId && myProfile);
  const isAuthReady = authChecked && (!authUserId || myProfile !== undefined);
  const isAdmin = currentUser.role === 'admin' && isActiveStatus(currentUser.account_status);

  // -------------------------------------------------------------
  // DB HELPERS — every write is checked; failures surface as toasts
  // -------------------------------------------------------------
  const db = useCallback((): SupabaseClient => {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error('Supabase is not configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).');
    }
    return client;
  }, []);

  const reportError = useCallback(
    (title: string, err: unknown) => {
      console.error(`[KBZLife LMS] ${title}:`, err);
      showToast('error', title, errorMessage(err));
    },
    [showToast]
  );

  const dbInsert = useCallback(
    async <T,>(table: string, row: Record<string, any>, errorTitle: string): Promise<T | null> => {
      try {
        const { data, error } = await db().from(table).insert(cleanRow(row)).select().single();
        if (error) throw error;
        return data as T;
      } catch (err) {
        reportError(errorTitle, err);
        return null;
      }
    },
    [db, reportError]
  );

  const dbUpdate = useCallback(
    async <T,>(table: string, id: string, patch: Record<string, any>, errorTitle: string): Promise<T | null> => {
      try {
        const { id: _ignore, created_at: _c, ...rest } = patch;
        const { data, error } = await db().from(table).update(cleanRow(rest)).eq('id', id).select().maybeSingle();
        if (error) throw error;
        if (!data) throw new Error('Record not found, or you do not have permission to change it.');
        return data as T;
      } catch (err) {
        reportError(errorTitle, err);
        return null;
      }
    },
    [db, reportError]
  );

  const dbDelete = useCallback(
    async (table: string, id: string, errorTitle: string): Promise<boolean> => {
      try {
        const { data, error } = await db().from(table).delete().eq('id', id).select('id');
        if (error) throw error;
        if (!data || data.length === 0) throw new Error('Record not found, or you do not have permission to delete it.');
        return true;
      } catch (err) {
        reportError(errorTitle, err);
        return false;
      }
    },
    [db, reportError]
  );

  const requireAdmin = useCallback(
    (action: string): boolean => {
      if (!isAdmin) {
        showToast('error', 'Access Denied', `Only administrators can ${action}.`);
        return false;
      }
      return true;
    },
    [isAdmin, showToast]
  );

  const authHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const client = getSupabaseClient();
    const token = client ? (await client.auth.getSession()).data.session?.access_token : undefined;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const logAuditAction = useCallback(
    async (
      action: AdminAuditLog['action'],
      entity_type: AdminAuditLog['entity_type'],
      entity_id: string | null,
      details: string,
      target_user_id?: string | null,
      target_user_name?: string | null
    ) => {
      // Audit logs are admin-only in RLS; learner actions are not logged here.
      if (!isAdmin) return;
      try {
        const { data, error } = await db()
          .from('admin_audit_logs')
          .insert({
            admin_user_id: currentUser.id,
            admin_name: currentUser.full_name,
            target_user_id: target_user_id || null,
            target_user_name: target_user_name || null,
            action,
            entity_type,
            entity_id: entity_id || null,
            details,
          })
          .select()
          .single();
        if (error) throw error;
        setAuditLogs((prev) => [data as AdminAuditLog, ...prev]);
      } catch (err) {
        console.warn('[KBZLife LMS] Could not write audit log:', errorMessage(err));
      }
    },
    [isAdmin, currentUser.id, currentUser.full_name, db]
  );

  // -------------------------------------------------------------
  // LOADING DATA FROM SUPABASE
  // -------------------------------------------------------------
  const clearAllState = useCallback(() => {
    setProfiles([]);
    setCourses([]);
    setChannels([]);
    setCourseEnrollments([]);
    setChannelAccesses([]);
    setCompanyNews([]);
    setCompanyVideos([]);
    setTopPerformers([]);
    setHodMotto(EMPTY_HOD_MOTTO);
    setTeamMembers([]);
    setLicenseTrainingLessons([]);
    setSkillCategories([]);
    setSkillDevelopmentResources([]);
    setLearningProgress([]);
    setLicenseVideoProgress({});
    setLicenseChapters([]);
    setLicenseQuizzes([]);
    setLicenseQuizAttempts([]);
    setChapterCompletions({});
    setProducts([]);
    setProductQuizzes([]);
    setProductQuizAttempts([]);
    setSkillQuizzes([]);
    setSkillQuizAttempts([]);
    setCompanyBulletins([]);
    setAuditLogs([]);
    setEmailLogs([]);
  }, []);

  const refreshData = useCallback(async () => {
    const client = getSupabaseClient();
    const uid = authUserIdRef.current;
    if (!client) {
      setIsSupabaseLive(false);
      return;
    }
    if (!uid) return;

    setIsLoading(true);
    try {
      const { data: existingMe, error: meError } = await client.from('profiles').select('*').eq('id', uid).maybeSingle();
      if (meError) throw meError;
      let me = existingMe;
      if (!me) {
        // Self-heal accounts created before the sign-up trigger existed
        const { data: created } = await client.rpc('ensure_my_profile');
        me = created && (created as Profile).id ? created : null;
      }
      if (authUserIdRef.current !== uid) return; // signed out meanwhile
      setMyProfile((me as Profile) || null);
      if (!me) {
        showToast(
          'error',
          'Profile Missing',
          'No profile row exists for this account. Make sure every file in supabase/migrations (including 20261101_backfill_profiles.sql) has been applied.'
        );
        return;
      }

      const admin = me.role === 'admin' && isActiveStatus(me.account_status);
      const failed: string[] = [];
      const load = async (label: string, query: PromiseLike<{ data: any; error: any }>): Promise<any[]> => {
        const { data, error } = await query;
        if (error) {
          console.warn(`[KBZLife LMS] Failed to load ${label}:`, error.message);
          failed.push(label);
          return [];
        }
        return Array.isArray(data) ? data : data ? [data] : [];
      };

      const [
        dbProfiles,
        dbCourses,
        dbChannels,
        dbEnrollments,
        dbChannelAccess,
        dbProgress,
        dbNews,
        dbVideos,
        dbPerformers,
        dbHodMotto,
        dbTeam,
        dbChapters,
        dbLessons,
        dbLessonProgress,
        dbLicenseQuizzes,
        dbLicenseAttempts,
        dbChapterCompletions,
        dbSkillCategories,
        dbSkillResources,
        dbSkillQuizzes,
        dbSkillAttempts,
        dbProducts,
        dbProductQuizzes,
        dbProductAttempts,
        dbBulletins,
        dbAudit,
        dbEmailLogs,
      ] = await Promise.all([
        load('profiles', client.from('profiles').select('*').order('created_at', { ascending: false })),
        load('courses', client.from('courses').select('*').order('created_at', { ascending: false })),
        load('channels', client.from('channels').select('*').order('order_index', { ascending: true })),
        load('course_enrollments', client.from('course_enrollments').select('*')),
        load('channel_access', client.from('channel_access').select('*')),
        load('learning_progress', client.from('learning_progress').select('*')),
        load('company_news', client.from('company_news').select('*').order('published_at', { ascending: false })),
        load('company_videos', client.from('company_videos').select('*').order('display_order', { ascending: true })),
        load('top_performers', client.from('top_performers').select('*')),
        load('hod_motto', client.from('hod_motto').select('*').limit(1)),
        load('ld_team_members', client.from('ld_team_members').select('*').order('display_order', { ascending: true })),
        load('license_chapters', client.from('license_chapters').select('*').order('display_order', { ascending: true })),
        load(
          'license_training_lessons',
          client.from('license_training_lessons').select('*').order('display_order', { ascending: true })
        ),
        load('license_lesson_progress', client.from('license_lesson_progress').select('*').eq('user_id', uid)),
        load(
          'license_quizzes',
          admin ? client.from('license_quizzes').select('*') : client.from('license_quizzes_learner').select('*')
        ),
        load(
          'license_quiz_attempts',
          client.from('license_quiz_attempts').select('*').order('created_at', { ascending: false })
        ),
        load('chapter_completions', client.from('chapter_completions').select('*').eq('user_id', uid)),
        load('skill_categories', client.from('skill_categories').select('*').order('display_order', { ascending: true })),
        load(
          'skill_development_resources',
          client.from('skill_development_resources').select('*').order('display_order', { ascending: true })
        ),
        load(
          'skill_quizzes',
          admin ? client.from('skill_quizzes').select('*') : client.from('skill_quizzes_learner').select('*')
        ),
        load('skill_quiz_attempts', client.from('skill_quiz_attempts').select('*').order('created_at', { ascending: false })),
        load(
          'product_knowledge_items',
          client.from('product_knowledge_items').select('*').order('display_order', { ascending: true })
        ),
        load(
          'product_quizzes',
          admin ? client.from('product_quizzes').select('*') : client.from('product_quizzes_learner').select('*')
        ),
        load(
          'product_quiz_attempts',
          client.from('product_quiz_attempts').select('*').order('created_at', { ascending: false })
        ),
        load('company_bulletins', client.from('company_bulletins').select('*').order('published_at', { ascending: false })),
        admin
          ? load('admin_audit_logs', client.from('admin_audit_logs').select('*').order('created_at', { ascending: false }).limit(500))
          : Promise.resolve([]),
        admin
          ? load('email_logs', client.from('email_logs').select('*').order('created_at', { ascending: false }).limit(200))
          : Promise.resolve([]),
      ]);

      if (authUserIdRef.current !== uid) return;

      setProfiles(dbProfiles as Profile[]);
      setCourses(dbCourses as Course[]);
      setChannels(dbChannels as Channel[]);
      setCourseEnrollments(dbEnrollments as CourseEnrollment[]);
      setChannelAccesses(dbChannelAccess as ChannelAccess[]);
      setLearningProgress(dbProgress as LearningProgress[]);
      setCompanyNews(dbNews as CompanyNewsArticle[]);
      setCompanyVideos(dbVideos as CompanyVideoItem[]);
      setTopPerformers(dbPerformers as TopPerformerEntry[]);
      setHodMotto((dbHodMotto[0] as HodMotto) || EMPTY_HOD_MOTTO);
      setTeamMembers(dbTeam as LdTeamMember[]);
      setLicenseChapters(dbChapters as LicenseChapter[]);
      setLicenseTrainingLessons(dbLessons as LicenseTrainingLesson[]);
      setLicenseVideoProgress(
        Object.fromEntries(dbLessonProgress.map((row: any) => [row.lesson_id, toLessonProgress(row)]))
      );
      setLicenseQuizzes(dbLicenseQuizzes as LicenseQuiz[]);
      setLicenseQuizAttempts(dbLicenseAttempts as LicenseQuizAttempt[]);
      setChapterCompletions(
        Object.fromEntries(
          dbChapterCompletions.map((row: any) => [
            row.chapter_id,
            {
              status: row.status,
              materials_completed: Boolean(row.materials_completed),
              quiz_passed: Boolean(row.quiz_passed),
              highest_quiz_score: row.highest_quiz_score ?? 0,
            },
          ])
        )
      );
      setSkillCategories(dbSkillCategories as SkillCategory[]);
      setSkillDevelopmentResources(dbSkillResources as SkillDevelopmentResource[]);
      setSkillQuizzes(dbSkillQuizzes as SkillQuiz[]);
      setSkillQuizAttempts(dbSkillAttempts as SkillQuizAttempt[]);
      setProducts(dbProducts as ProductKnowledgeItem[]);
      setProductQuizzes(dbProductQuizzes as ProductQuiz[]);
      setProductQuizAttempts(dbProductAttempts as ProductQuizAttempt[]);
      setCompanyBulletins(dbBulletins as CompanyBulletinItem[]);
      setAuditLogs(dbAudit as AdminAuditLog[]);
      setEmailLogs(dbEmailLogs as EmailLogEntry[]);

      setIsSupabaseLive(failed.length === 0);
      if (failed.length > 0) {
        showToast(
          'warning',
          'Some data could not be loaded',
          `Failed: ${failed.join(', ')}. Check that every file in supabase/migrations has been applied.`
        );
      }
    } catch (err) {
      setIsSupabaseLive(false);
      reportError('Could not load data from Supabase', err);
    } finally {
      setIsLoading(false);
    }
  }, [showToast, reportError]);

  // Auth session bootstrap
  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) {
      setAuthChecked(true);
      return;
    }

    let cancelled = false;
    client.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setAuthUserId(data.session?.user.id ?? null);
      setAuthChecked(true);
    });

    // Note: no Supabase calls inside this callback (supabase-js deadlock caveat).
    const { data: sub } = client.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true);
      setAuthUserId(session?.user.id ?? null);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Load (or clear) everything whenever the signed-in user changes
  useEffect(() => {
    authUserIdRef.current = authUserId;
    if (authUserId) {
      setMyProfile(undefined);
      refreshData();
    } else {
      setMyProfile(undefined);
      clearAllState();
    }
  }, [authUserId, refreshData, clearAllState]);

  // Realtime: refresh when shared content changes (debounced)
  useEffect(() => {
    const client = getSupabaseClient();
    if (!client || !authUserId) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => refreshData(), 600);
    };

    const tables = [
      'profiles',
      'courses',
      'channels',
      'course_enrollments',
      'channel_access',
      'company_news',
      'company_videos',
      'top_performers',
      'hod_motto',
      'ld_team_members',
      'license_chapters',
      'license_training_lessons',
      'license_quizzes',
      'skill_categories',
      'skill_development_resources',
      'skill_quizzes',
      'product_knowledge_items',
      'product_quizzes',
      'company_bulletins',
    ];

    const channel = client.channel(`lms-sync-${authUserId}`);
    tables.forEach((table) => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, scheduleRefresh);
    });
    channel.subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      client.removeChannel(channel);
    };
  }, [authUserId, refreshData]);

  // -------------------------------------------------------------
  // AUTHENTICATION (Supabase Auth)
  // -------------------------------------------------------------
  const loginWithCredentials = async (
    identifier: string,
    password: string
  ): Promise<{ success: boolean; message: string; mustChangePassword?: boolean; account_status?: AccountStatus; role?: UserRole }> => {
    try {
      const client = db();
      const trimmed = identifier.trim();
      let email = trimmed.toLowerCase();

      if (!trimmed.includes('@')) {
        const { data, error } = await client.rpc('get_login_email', { p_identifier: trimmed });
        if (error) throw error;
        if (!data) {
          return { success: false, message: 'Account not found. Please register or contact the LMS Administrator.' };
        }
        email = data as string;
      }

      const { data: signIn, error: signInError } = await client.auth.signInWithPassword({ email, password });
      if (signInError || !signIn.user) {
        return { success: false, message: signInError?.message || 'Invalid username or password.' };
      }

      const { data: existingProfile, error: profileError } = await client
        .from('profiles')
        .select('*')
        .eq('id', signIn.user.id)
        .maybeSingle();
      if (profileError) throw profileError;
      // Accounts created before the sign-up trigger existed have no profile yet: create it.
      let profile = existingProfile;
      if (!profile) {
        const { data: created, error: ensureError } = await client.rpc('ensure_my_profile');
        if (ensureError) console.warn('[KBZLife LMS] ensure_my_profile failed:', ensureError.message);
        profile = created && (created as Profile).id ? created : null;
      }
      if (!profile) {
        await client.auth.signOut();
        return { success: false, message: 'No profile exists for this account. Please contact the LMS Administrator.' };
      }

      setMyProfile(profile as Profile);
      return {
        success: true,
        message: 'Successfully authenticated.',
        mustChangePassword: Boolean(profile.must_change_password),
        account_status: profile.account_status,
        role: profile.role,
      };
    } catch (err) {
      return { success: false, message: errorMessage(err) };
    }
  };

  const registerUser = async (data: {
    full_name: string;
    username: string;
    email: string;
    password: string;
    department?: string;
    employee_id?: string;
  }): Promise<{ success: boolean; user?: Profile; message: string; needsEmailConfirmation?: boolean }> => {
    try {
      const client = db();
      const username = data.username.trim().toLowerCase();

      const { data: available, error: availError } = await client.rpc('is_username_available', { p_username: username });
      if (availError) throw availError;
      if (available === false) {
        return { success: false, message: 'That username is already taken. Please choose another.' };
      }

      const { data: signUp, error } = await client.auth.signUp({
        email: data.email.trim().toLowerCase(),
        password: data.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            username,
            full_name: data.full_name.trim(),
            department: data.department?.trim() || undefined,
            employee_id: data.employee_id?.trim() || undefined,
          },
        },
      });
      if (error) return { success: false, message: error.message };

      // Supabase returns a user with no identities when the email is already registered
      if (signUp.user && Array.isArray(signUp.user.identities) && signUp.user.identities.length === 0) {
        return { success: false, message: 'An account with this email already exists.' };
      }

      if (!signUp.session) {
        return {
          success: true,
          needsEmailConfirmation: true,
          message: 'Registration received! Please confirm your email address. Your account will then be reviewed by an administrator.',
        };
      }

      return {
        success: true,
        needsEmailConfirmation: false,
        message: 'Registration submitted successfully! Your account is pending administrator review.',
      };
    } catch (err) {
      return { success: false, message: errorMessage(err) };
    }
  };

  const checkUserApprovalStatus = async (userId?: string): Promise<AccountStatus> => {
    const targetId = userId || authUserId;
    if (!targetId) return 'pending';
    try {
      const { data, error } = await db().from('profiles').select('*').eq('id', targetId).maybeSingle();
      if (error) throw error;
      if (data) {
        setProfiles((prev) => (prev.some((p) => p.id === targetId) ? prev.map((p) => (p.id === targetId ? data : p)) : prev));
        if (targetId === authUserId) setMyProfile(data as Profile);
        return data.account_status as AccountStatus;
      }
    } catch (err) {
      console.warn('[KBZLife LMS] Could not check approval status:', errorMessage(err));
    }
    return currentUser.account_status;
  };

  const changePassword = async (
    oldPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const client = db();
      // Re-authenticate to verify the current password
      const { error: verifyError } = await client.auth.signInWithPassword({
        email: currentUser.email,
        password: oldPassword,
      });
      if (verifyError) return { success: false, message: 'Your current password is incorrect.' };

      const { error } = await client.auth.updateUser({ password: newPassword });
      if (error) return { success: false, message: error.message };

      if (currentUser.must_change_password) {
        await client.from('profiles').update({ must_change_password: false }).eq('id', currentUser.id);
        const cleared = { ...currentUser, must_change_password: false };
        setMyProfile(cleared);
        setProfiles((prev) => prev.map((p) => (p.id === currentUser.id ? cleared : p)));
      }

      await logAuditAction('password_changed', 'user', currentUser.id, 'User password changed successfully.');
      showToast('success', 'Password Updated', 'Your new password has been saved.');
      return { success: true, message: 'Password updated successfully.' };
    } catch (err) {
      return { success: false, message: errorMessage(err) };
    }
  };

  const requestPasswordReset = async (
    email: string
  ): Promise<{ success: boolean; message: string; isConfigured?: boolean }> => {
    try {
      const { error } = await db().auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        // The email link opens the dedicated "Set a new password" page
        redirectTo: `${window.location.origin}${RESET_PASSWORD_PATH}`,
      });
      if (error) return { success: false, message: error.message, isConfigured: true };
      const message = `If an account exists for ${email}, a password reset link has been sent.`;
      showToast('success', 'Email Sent', message);
      return { success: true, message, isConfigured: true };
    } catch (err) {
      return { success: false, message: errorMessage(err) };
    }
  };

  const completePasswordRecovery = async (newPassword: string): Promise<{ success: boolean; message: string }> => {
    try {
      const { error } = await db().auth.updateUser({ password: newPassword });
      if (error) return { success: false, message: error.message };
      setIsPasswordRecovery(false);
      leaveResetPasswordUrl();
      showToast('success', 'Password Updated', 'Your new password has been saved.');
      return { success: true, message: 'Password updated.' };
    } catch (err) {
      return { success: false, message: errorMessage(err) };
    }
  };

  const exitPasswordRecovery = () => {
    setIsPasswordRecovery(false);
    leaveResetPasswordUrl();
  };

  const signOut = () => {
    const client = getSupabaseClient();
    setIsPasswordRecovery(false);
    leaveResetPasswordUrl();
    if (client) {
      client.auth.signOut().catch((err) => console.warn('[KBZLife LMS] Sign out error:', err));
    }
    setAuthUserId(null);
    window.location.hash = '';
    showToast('info', 'Signed Out', 'You have been securely signed out of KBZLife LMS.');
  };

  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await db().from('profiles').select('*').eq('id', userId).maybeSingle();
      if (error) throw error;
      if (data) {
        setProfiles((prev) => (prev.some((p) => p.id === userId) ? prev.map((p) => (p.id === userId ? data : p)) : [data, ...prev]));
        if (userId === authUserId) setMyProfile(data as Profile);
        return data as Profile;
      }
    } catch (err) {
      console.warn('[KBZLife LMS] fetchProfile error:', errorMessage(err));
    }
    return profiles.find((p) => p.id === userId) || null;
  };

  const updateProfile = async (
    userId: string,
    updates: Partial<Profile>
  ): Promise<{ success: boolean; message: string; profile?: Profile }> => {
    const isSelf = userId === currentUser.id;
    if (!isSelf && !isAdmin) {
      showToast('error', 'Access Denied', 'You can only edit your own profile.');
      return { success: false, message: 'Access denied.' };
    }

    // Whitelist editable fields. role / account_status are changed via updateUserRole / updateUserStatus.
    const safeUpdates: Record<string, any> = {};
    if (updates.full_name !== undefined) safeUpdates.full_name = updates.full_name.trim();
    if (updates.username !== undefined) safeUpdates.username = updates.username.trim().toLowerCase() || null;
    if (updates.department !== undefined) safeUpdates.department = updates.department.trim();
    if (updates.avatar_url !== undefined) safeUpdates.avatar_url = updates.avatar_url.trim();
    if (updates.employee_id !== undefined && isAdmin) safeUpdates.employee_id = updates.employee_id.trim();

    const target = profiles.find((p) => p.id === userId) || (isSelf ? currentUser : undefined);
    const newEmail = updates.email?.trim().toLowerCase();
    const emailChanged = Boolean(newEmail && target && newEmail !== target.email.toLowerCase());
    let emailNote = '';

    try {
      const client = db();
      if (emailChanged && isSelf) {
        // Login email lives in Supabase Auth; profiles.email syncs after confirmation.
        const { error } = await client.auth.updateUser({ email: newEmail });
        if (error) throw error;
        emailNote = ' A confirmation link was sent to your new email address.';
      } else if (emailChanged && isAdmin) {
        safeUpdates.email = newEmail;
      }

      let updatedProfile: Profile | undefined = target;
      if (Object.keys(safeUpdates).length > 0) {
        const { data, error } = await client.from('profiles').update(safeUpdates).eq('id', userId).select().single();
        if (error) throw error;
        updatedProfile = data as Profile;
        setProfiles((prev) => prev.map((p) => (p.id === userId ? updatedProfile! : p)));
        if (isSelf) setMyProfile(updatedProfile);
      }

      await logAuditAction('profile_updated', 'user', userId, `Profile details updated for ${updatedProfile?.full_name || userId}.`);
      showToast('success', 'Profile Saved', `Profile changes saved.${emailNote}`);
      return { success: true, message: `Profile updated.${emailNote}`, profile: updatedProfile };
    } catch (err) {
      reportError('Profile Update Failed', err);
      return { success: false, message: errorMessage(err) };
    }
  };

  const updateAdminProfile = async (updates: Partial<Profile>): Promise<boolean> => {
    const res = await updateProfile(currentUser.id, updates);
    return res.success;
  };

  // -------------------------------------------------------------
  // USER INVITATIONS & EMAIL (server routes that need the service-role key)
  // -------------------------------------------------------------
  const inviteUser = async (data: {
    email: string;
    full_name: string;
    role: UserRole;
    department: string;
    employee_id?: string;
  }): Promise<boolean> => {
    if (!requireAdmin('invite users')) return false;
    try {
      const res = await fetch('/api/admin/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ ...data, redirectTo: window.location.origin }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        showToast('error', 'Invitation Failed', json.message || `Server responded with ${res.status}.`);
        return false;
      }
      if (json.profile) {
        setProfiles((prev) => [json.profile as Profile, ...prev.filter((p) => p.id !== json.profile.id)]);
      }
      await logAuditAction(
        'user_invited',
        'user',
        json.profile?.id || null,
        `Invited new ${data.role.toUpperCase()} account for ${data.full_name} (${data.email})`,
        json.profile?.id || null,
        data.full_name
      );
      showToast('success', 'User Invited', `An invitation email was sent to ${data.email}.`);
      return true;
    } catch (err) {
      reportError('Invitation Failed', err);
      return false;
    }
  };

  const sendCustomEmail = async (
    to: string,
    subject: string,
    html: string,
    template?: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ to, subject, html, template }),
      });
      const json = await res.json().catch(() => ({ success: false, message: `Server responded with ${res.status}.` }));
      if (json.log) setEmailLogs((prev) => [json.log as EmailLogEntry, ...prev]);
      return json;
    } catch (err) {
      return { success: false, message: errorMessage(err) };
    }
  };

  // -------------------------------------------------------------
  // USER STATUS & ROLE
  // -------------------------------------------------------------
  const updateUserStatus = async (userId: string, newStatus: AccountStatus, reason?: string): Promise<boolean> => {
    if (!requireAdmin('modify user account statuses')) return false;
    const targetUser = profiles.find((p) => p.id === userId);
    if (!targetUser) return false;

    const updated = await dbUpdate<Profile>('profiles', userId, { account_status: newStatus }, 'Status Update Failed');
    if (!updated) return false;
    setProfiles((prev) => prev.map((p) => (p.id === userId ? updated : p)));

    await logAuditAction(
      'user_status_changed',
      'user',
      userId,
      `Account status changed from ${targetUser.account_status.toUpperCase()} to ${newStatus.toUpperCase()}${reason ? `. Reason: ${reason}` : ''}`,
      targetUser.id,
      targetUser.full_name
    );
    showToast('success', 'Status Updated', `${targetUser.full_name}'s status is now ${newStatus.toUpperCase()}.`);
    return true;
  };

  const approveUser = async (userId: string): Promise<boolean> =>
    updateUserStatus(userId, 'approved', 'Administrative approval granted');

  const rejectUser = async (userId: string, reason: string): Promise<boolean> =>
    updateUserStatus(userId, 'rejected', reason || 'Registration declined');

  const updateUserRole = async (userId: string, newRole: UserRole, reason?: string): Promise<boolean> => {
    if (!requireAdmin('promote or demote user roles')) return false;
    const targetUser = profiles.find((p) => p.id === userId);
    if (!targetUser) return false;

    const updated = await dbUpdate<Profile>('profiles', userId, { role: newRole }, 'Role Update Failed');
    if (!updated) return false;
    setProfiles((prev) => prev.map((p) => (p.id === userId ? updated : p)));

    await logAuditAction(
      'user_role_changed',
      'user',
      userId,
      `Role changed from ${targetUser.role.toUpperCase()} to ${newRole.toUpperCase()}${reason ? `. Reason: ${reason}` : ''}`,
      targetUser.id,
      targetUser.full_name
    );
    showToast('success', 'User Role Updated', `${targetUser.full_name} is now an ${newRole.toUpperCase()}.`);
    return true;
  };

  // -------------------------------------------------------------
  // COURSE & CHANNEL PERMISSIONS
  // -------------------------------------------------------------
  const assignCourse = async (userId: string, courseId: string, expiresAt?: string | null, note?: string): Promise<boolean> => {
    if (!requireAdmin('assign courses')) return false;
    const targetUser = profiles.find((p) => p.id === userId);
    const targetCourse = courses.find((c) => c.id === courseId);
    if (!targetUser || !targetCourse) return false;

    try {
      const { data, error } = await db()
        .from('course_enrollments')
        .upsert(
          {
            user_id: userId,
            course_id: courseId,
            status: 'enrolled',
            assigned_by: currentUser.id,
            assigned_at: new Date().toISOString(),
            expires_at: expiresAt || null,
            restriction_note: note || null,
          },
          { onConflict: 'user_id,course_id' }
        )
        .select()
        .single();
      if (error) throw error;
      setCourseEnrollments((prev) => [...prev.filter((e) => e.id !== data.id), data as CourseEnrollment]);
    } catch (err) {
      reportError('Course Assignment Failed', err);
      return false;
    }

    await logAuditAction('course_assigned', 'course', courseId, `Assigned course "${targetCourse.title}" to ${targetUser.full_name}`, targetUser.id, targetUser.full_name);
    showToast('success', 'Course Assigned', `"${targetCourse.title}" is now available to ${targetUser.full_name}.`);
    return true;
  };

  const revokeCourse = async (userId: string, courseId: string, reason?: string): Promise<boolean> => {
    if (!requireAdmin('revoke courses')) return false;
    const targetUser = profiles.find((p) => p.id === userId);
    const targetCourse = courses.find((c) => c.id === courseId);
    const enrollment = courseEnrollments.find((e) => e.user_id === userId && e.course_id === courseId);
    if (!targetUser || !targetCourse || !enrollment) return false;

    const updated = await dbUpdate<CourseEnrollment>(
      'course_enrollments',
      enrollment.id,
      { status: 'revoked', restriction_note: reason || 'Access revoked by administrator' },
      'Revoke Failed'
    );
    if (!updated) return false;
    setCourseEnrollments((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));

    await logAuditAction('course_revoked', 'course', courseId, `Revoked course "${targetCourse.title}" access for ${targetUser.full_name}`, targetUser.id, targetUser.full_name);
    showToast('info', 'Access Revoked', `Revoked course "${targetCourse.title}" from ${targetUser.full_name}.`);
    return true;
  };

  const assignChannel = async (userId: string, channelId: string, expiresAt?: string | null, note?: string): Promise<boolean> => {
    if (!requireAdmin('grant channel access')) return false;
    const targetUser = profiles.find((p) => p.id === userId);
    const targetChannel = channels.find((c) => c.id === channelId);
    if (!targetUser || !targetChannel) return false;

    try {
      const { data, error } = await db()
        .from('channel_access')
        .upsert(
          {
            user_id: userId,
            channel_id: channelId,
            status: 'granted',
            assigned_by: currentUser.id,
            assigned_at: new Date().toISOString(),
            expires_at: expiresAt || null,
            restriction_note: note || null,
          },
          { onConflict: 'user_id,channel_id' }
        )
        .select()
        .single();
      if (error) throw error;
      setChannelAccesses((prev) => [...prev.filter((ca) => ca.id !== data.id), data as ChannelAccess]);
    } catch (err) {
      reportError('Channel Access Failed', err);
      return false;
    }

    await logAuditAction('channel_granted', 'channel', channelId, `Granted channel access "${targetChannel.title}" to ${targetUser.full_name}`, targetUser.id, targetUser.full_name);
    showToast('success', 'Channel Granted', `Channel "${targetChannel.title}" granted to ${targetUser.full_name}.`);
    return true;
  };

  const revokeChannel = async (userId: string, channelId: string, reason?: string): Promise<boolean> => {
    if (!requireAdmin('revoke channel access')) return false;
    const targetUser = profiles.find((p) => p.id === userId);
    const targetChannel = channels.find((c) => c.id === channelId);
    const access = channelAccesses.find((ca) => ca.user_id === userId && ca.channel_id === channelId);
    if (!targetUser || !targetChannel || !access) return false;

    const updated = await dbUpdate<ChannelAccess>(
      'channel_access',
      access.id,
      { status: 'revoked', restriction_note: reason || 'Access revoked by administrator' },
      'Revoke Failed'
    );
    if (!updated) return false;
    setChannelAccesses((prev) => prev.map((ca) => (ca.id === updated.id ? updated : ca)));

    await logAuditAction('channel_revoked', 'channel', channelId, `Revoked channel "${targetChannel.title}" access for ${targetUser.full_name}`, targetUser.id, targetUser.full_name);
    showToast('info', 'Channel Revoked', `Revoked channel "${targetChannel.title}" from ${targetUser.full_name}.`);
    return true;
  };

  // -------------------------------------------------------------
  // COURSES & CHANNELS
  // -------------------------------------------------------------
  const createCourse = async (input: Omit<Course, 'id' | 'created_at' | 'updated_at'>): Promise<Course | null> => {
    if (!requireAdmin('create courses')) return null;
    const created = await dbInsert<Course>('courses', input, 'Course Not Saved');
    if (!created) return null;
    setCourses((prev) => [created, ...prev]);
    await logAuditAction('course_created', 'course', created.id, `Created new course "${created.title}"`);
    showToast('success', 'Course Created', `Course "${created.title}" saved to database.`);
    return created;
  };

  const updateCourse = async (courseId: string, updates: Partial<Course>): Promise<boolean> => {
    if (!requireAdmin('edit courses')) return false;
    const updated = await dbUpdate<Course>('courses', courseId, updates, 'Course Not Updated');
    if (!updated) return false;
    setCourses((prev) => prev.map((c) => (c.id === courseId ? updated : c)));
    await logAuditAction('course_updated', 'course', courseId, `Updated course details for ${updated.title}`);
    showToast('success', 'Course Updated', 'Course changes saved to database.');
    return true;
  };

  const deleteCourse = async (courseId: string): Promise<boolean> => {
    if (!requireAdmin('delete courses')) return false;
    const course = courses.find((c) => c.id === courseId);
    if (!course || !(await dbDelete('courses', courseId, 'Course Not Deleted'))) return false;
    setCourses((prev) => prev.filter((c) => c.id !== courseId));
    setCourseEnrollments((prev) => prev.filter((e) => e.course_id !== courseId));
    await logAuditAction('course_deleted', 'course', courseId, `Deleted course "${course.title}"`);
    showToast('info', 'Course Deleted', `Course "${course.title}" removed from catalog.`);
    return true;
  };

  const createChannel = async (input: Omit<Channel, 'id' | 'created_at' | 'updated_at'>): Promise<Channel | null> => {
    if (!requireAdmin('create channels')) return null;
    const created = await dbInsert<Channel>('channels', input, 'Channel Not Saved');
    if (!created) return null;
    setChannels((prev) => [created, ...prev]);
    await logAuditAction('channel_created', 'channel', created.id, `Created new channel "${created.title}"`);
    showToast('success', 'Channel Created', `Channel "${created.title}" saved to database.`);
    return created;
  };

  const updateChannel = async (channelId: string, updates: Partial<Channel>): Promise<boolean> => {
    if (!requireAdmin('edit channels')) return false;
    const updated = await dbUpdate<Channel>('channels', channelId, updates, 'Channel Not Updated');
    if (!updated) return false;
    setChannels((prev) => prev.map((c) => (c.id === channelId ? updated : c)));
    await logAuditAction('channel_updated', 'channel', channelId, `Updated channel details for ${updated.title}`);
    showToast('success', 'Channel Updated', 'Channel changes saved to database.');
    return true;
  };

  const deleteChannel = async (channelId: string): Promise<boolean> => {
    if (!requireAdmin('delete channels')) return false;
    const channel = channels.find((c) => c.id === channelId);
    if (!channel || !(await dbDelete('channels', channelId, 'Channel Not Deleted'))) return false;
    setChannels((prev) => prev.filter((c) => c.id !== channelId));
    setChannelAccesses((prev) => prev.filter((ca) => ca.channel_id !== channelId));
    await logAuditAction('channel_deleted', 'channel', channelId, `Deleted channel "${channel.title}"`);
    showToast('info', 'Channel Deleted', `Channel "${channel.title}" removed.`);
    return true;
  };

  // -------------------------------------------------------------
  // COMPANY NEWS / VIDEOS / TOP PERFORMERS
  // -------------------------------------------------------------
  const createNews = async (input: Omit<CompanyNewsArticle, 'id' | 'created_at' | 'updated_at'>): Promise<CompanyNewsArticle | null> => {
    if (!requireAdmin('publish news')) return null;
    const created = await dbInsert<CompanyNewsArticle>('company_news', { ...input, author_id: currentUser.id }, 'Article Not Saved');
    if (!created) return null;
    setCompanyNews((prev) => [created, ...prev]);
    await logAuditAction('news_created', 'news', created.id, `Created news article "${created.title}"`);
    showToast('success', 'Article Saved', `"${created.title}" saved to database.`);
    return created;
  };

  const updateNews = async (id: string, updates: Partial<CompanyNewsArticle>): Promise<boolean> => {
    if (!requireAdmin('edit news')) return false;
    const updated = await dbUpdate<CompanyNewsArticle>('company_news', id, updates, 'Article Not Updated');
    if (!updated) return false;
    setCompanyNews((prev) => prev.map((n) => (n.id === id ? updated : n)));
    await logAuditAction('news_updated', 'news', id, `Updated news article "${updated.title}"`);
    showToast('success', 'Article Updated', 'Changes saved to database.');
    return true;
  };

  const deleteNews = async (id: string): Promise<boolean> => {
    if (!requireAdmin('delete news')) return false;
    const article = companyNews.find((n) => n.id === id);
    if (!article || !(await dbDelete('company_news', id, 'Article Not Deleted'))) return false;
    setCompanyNews((prev) => prev.filter((n) => n.id !== id));
    await logAuditAction('news_deleted', 'news', id, `Deleted news article "${article.title}"`);
    showToast('info', 'Article Deleted', `"${article.title}" removed.`);
    return true;
  };

  const createVideo = async (input: Omit<CompanyVideoItem, 'id' | 'created_at' | 'updated_at'>): Promise<CompanyVideoItem | null> => {
    if (!requireAdmin('publish videos')) return null;
    const created = await dbInsert<CompanyVideoItem>('company_videos', { ...input, author_id: currentUser.id }, 'Video Not Saved');
    if (!created) return null;
    setCompanyVideos((prev) => [...prev, created].sort((a, b) => a.display_order - b.display_order));
    await logAuditAction('video_created', 'video', created.id, `Created video "${created.title}"`);
    showToast('success', 'Video Saved', `"${created.title}" saved to database.`);
    return created;
  };

  const updateVideo = async (id: string, updates: Partial<CompanyVideoItem>): Promise<boolean> => {
    if (!requireAdmin('edit videos')) return false;
    const updated = await dbUpdate<CompanyVideoItem>('company_videos', id, updates, 'Video Not Updated');
    if (!updated) return false;
    setCompanyVideos((prev) => prev.map((v) => (v.id === id ? updated : v)));
    await logAuditAction('video_updated', 'video', id, `Updated video "${updated.title}"`);
    showToast('success', 'Video Updated', 'Changes saved to database.');
    return true;
  };

  const deleteVideo = async (id: string): Promise<boolean> => {
    if (!requireAdmin('delete videos')) return false;
    const video = companyVideos.find((v) => v.id === id);
    if (!video || !(await dbDelete('company_videos', id, 'Video Not Deleted'))) return false;
    setCompanyVideos((prev) => prev.filter((v) => v.id !== id));
    await logAuditAction('video_deleted', 'video', id, `Deleted video "${video.title}"`);
    showToast('info', 'Video Deleted', `"${video.title}" removed.`);
    return true;
  };

  const createTopPerformer = async (input: Omit<TopPerformerEntry, 'id' | 'created_at' | 'updated_at'>): Promise<TopPerformerEntry | null> => {
    if (!requireAdmin('add top performers')) return null;
    const created = await dbInsert<TopPerformerEntry>('top_performers', { ...input, author_id: currentUser.id }, 'Top Performer Not Saved');
    if (!created) return null;
    setTopPerformers((prev) => [created, ...prev]);
    await logAuditAction('top_performer_created', 'top_performer', created.id, `Added Top Performer entry for ${created.employee_name}`);
    showToast('success', 'Top Performer Added', `${created.employee_name} saved to database.`);
    return created;
  };

  const updateTopPerformer = async (id: string, updates: Partial<TopPerformerEntry>): Promise<boolean> => {
    if (!requireAdmin('edit top performers')) return false;
    const updated = await dbUpdate<TopPerformerEntry>('top_performers', id, updates, 'Top Performer Not Updated');
    if (!updated) return false;
    setTopPerformers((prev) => prev.map((tp) => (tp.id === id ? updated : tp)));
    await logAuditAction('top_performer_updated', 'top_performer', id, `Updated Top Performer entry for ${updated.employee_name}`);
    showToast('success', 'Top Performer Updated', 'Changes saved to database.');
    return true;
  };

  const deleteTopPerformer = async (id: string): Promise<boolean> => {
    if (!requireAdmin('delete top performers')) return false;
    const performer = topPerformers.find((tp) => tp.id === id);
    if (!performer || !(await dbDelete('top_performers', id, 'Top Performer Not Deleted'))) return false;
    setTopPerformers((prev) => prev.filter((tp) => tp.id !== id));
    await logAuditAction('top_performer_deleted', 'top_performer', id, `Deleted Top Performer entry for ${performer.employee_name}`);
    showToast('info', 'Top Performer Removed', `${performer.employee_name} entry removed.`);
    return true;
  };

  // -------------------------------------------------------------
  // LICENSE TRAINING LESSONS
  // -------------------------------------------------------------
  const normalizeLessonPublishing = (
    input: Partial<LicenseTrainingLesson>,
    existing?: LicenseTrainingLesson
  ): Partial<LicenseTrainingLesson> => {
    const out: Partial<LicenseTrainingLesson> = { ...input };
    const type = input.content_type || input.lesson_type;
    if (type) {
      out.content_type = type;
      out.lesson_type = type;
    }
    if (input.is_published !== undefined) {
      out.status = input.is_published ? 'published' : 'draft';
    } else if (input.status !== undefined) {
      out.is_published = input.status === 'published';
    } else if (!existing) {
      out.is_published = true;
      out.status = 'published';
    }
    return out;
  };

  const createLicenseLesson = async (
    input: Omit<LicenseTrainingLesson, 'id' | 'created_at' | 'updated_at'>
  ): Promise<LicenseTrainingLesson | null> => {
    if (!requireAdmin('create license training lessons')) return null;
    const row = {
      ...normalizeLessonPublishing(input),
      content_type: input.content_type || input.lesson_type || 'video',
      lesson_type: input.content_type || input.lesson_type || 'video',
      category: input.category || 'Regulatory Accreditation',
      author_id: currentUser.id,
    };
    const created = await dbInsert<LicenseTrainingLesson>('license_training_lessons', row, 'Lesson Not Saved');
    if (!created) return null;
    setLicenseTrainingLessons((prev) => [...prev, created]);
    await logAuditAction('course_created', 'license_lesson', created.id, `Created license training lesson: "${created.title}" (${(created.content_type || 'video').toUpperCase()})`);
    showToast('success', 'Lesson Saved', `"${created.title}" has been saved.`);
    return created;
  };

  const updateLicenseLesson = async (id: string, updates: Partial<LicenseTrainingLesson>): Promise<boolean> => {
    if (!requireAdmin('modify license training lessons')) return false;
    const existing = licenseTrainingLessons.find((l) => l.id === id);
    const updated = await dbUpdate<LicenseTrainingLesson>(
      'license_training_lessons',
      id,
      normalizeLessonPublishing(updates, existing),
      'Lesson Not Updated'
    );
    if (!updated) return false;
    setLicenseTrainingLessons((prev) => prev.map((l) => (l.id === id ? updated : l)));
    await logAuditAction('course_updated', 'license_lesson', id, `Updated license training lesson: "${updated.title}"`);
    showToast('success', 'Lesson Updated', 'Changes saved successfully.');
    return true;
  };

  const deleteLicenseLesson = async (id: string): Promise<boolean> => {
    if (!requireAdmin('delete license training lessons')) return false;
    const lesson = licenseTrainingLessons.find((l) => l.id === id);
    if (!lesson || !(await dbDelete('license_training_lessons', id, 'Lesson Not Deleted'))) return false;
    setLicenseTrainingLessons((prev) => prev.filter((l) => l.id !== id));
    await logAuditAction('course_deleted', 'license_lesson', id, `Deleted license training lesson: "${lesson.title}"`);
    showToast('info', 'Lesson Removed', `"${lesson.title}" has been deleted.`);
    return true;
  };

  // -------------------------------------------------------------
  // SKILL CATEGORIES & RESOURCES
  // -------------------------------------------------------------
  const createSkillCategory = async (input: Omit<SkillCategory, 'id' | 'created_at' | 'updated_at'>): Promise<SkillCategory | null> => {
    if (!requireAdmin('create skill categories')) return null;
    const created = await dbInsert<SkillCategory>(
      'skill_categories',
      {
        ...input,
        name: input.name.trim(),
        is_published: input.is_published ?? true,
        display_order: input.display_order || skillCategories.length + 1,
      },
      'Category Not Saved'
    );
    if (!created) return null;
    setSkillCategories((prev) => [...prev, created]);
    await logAuditAction('skill_category_created', 'skill_category', created.id, `Created skill category: "${created.name}"`);
    showToast('success', 'Category Created', `"${created.name}" added successfully.`);
    return created;
  };

  const updateSkillCategory = async (id: string, updates: Partial<SkillCategory>): Promise<boolean> => {
    if (!requireAdmin('modify skill categories')) return false;
    const existing = skillCategories.find((c) => c.id === id);
    if (!existing) return false;
    const newName = updates.name ? updates.name.trim() : existing.name;

    const updated = await dbUpdate<SkillCategory>('skill_categories', id, { ...updates, name: newName }, 'Category Not Updated');
    if (!updated) return false;
    setSkillCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));

    if (newName !== existing.name) {
      const { data, error } = await db()
        .from('skill_development_resources')
        .update({ category: newName, topic: newName })
        .eq('category_id', id)
        .select();
      if (error) {
        reportError('Resources Not Re-labelled', error);
      } else if (data) {
        const byId = new Map((data as SkillDevelopmentResource[]).map((r) => [r.id, r]));
        setSkillDevelopmentResources((prev) => prev.map((r) => byId.get(r.id) || r));
      }
    }

    await logAuditAction('skill_category_updated', 'skill_category', id, `Updated skill category: "${newName}"`);
    showToast('success', 'Category Updated', 'Changes saved successfully.');
    return true;
  };

  const deleteSkillCategory = async (id: string): Promise<boolean> => {
    if (!requireAdmin('delete skill categories')) return false;
    const category = skillCategories.find((c) => c.id === id);
    if (!category || !(await dbDelete('skill_categories', id, 'Category Not Deleted'))) return false;
    setSkillCategories((prev) => prev.filter((c) => c.id !== id));
    setSkillQuizzes((prev) => prev.filter((q) => q.category_id !== id));
    await logAuditAction('skill_category_deleted', 'skill_category', id, `Deleted skill category: "${category.name}"`);
    showToast('info', 'Category Removed', `"${category.name}" has been deleted.`);
    return true;
  };

  const createSkillResource = async (
    input: Omit<SkillDevelopmentResource, 'id' | 'created_at' | 'updated_at'>
  ): Promise<SkillDevelopmentResource | null> => {
    if (!requireAdmin('create skill development resources')) return null;
    const categoryName = input.category || input.topic || 'General';
    const isPub = input.is_published ?? input.status !== 'draft';
    const created = await dbInsert<SkillDevelopmentResource>(
      'skill_development_resources',
      {
        ...input,
        category: categoryName,
        topic: categoryName,
        is_published: isPub,
        status: isPub ? 'published' : 'draft',
        author_id: currentUser.id,
      },
      'Resource Not Saved'
    );
    if (!created) return null;
    setSkillDevelopmentResources((prev) => [created, ...prev]);
    await logAuditAction('course_created', 'skill_resource', created.id, `Created skill resource: "${created.title}" [${created.category}]`);
    showToast('success', 'Resource Created', `"${created.title}" saved to ${created.category}.`);
    return created;
  };

  const updateSkillResource = async (id: string, updates: Partial<SkillDevelopmentResource>): Promise<boolean> => {
    if (!requireAdmin('modify skill resources')) return false;
    const clean: Partial<SkillDevelopmentResource> = { ...updates };
    if (updates.category && !updates.topic) clean.topic = updates.category;
    if (updates.topic && !updates.category) clean.category = updates.topic;
    if (updates.is_published !== undefined) clean.status = updates.is_published ? 'published' : 'draft';
    else if (updates.status !== undefined) clean.is_published = updates.status === 'published';

    const updated = await dbUpdate<SkillDevelopmentResource>('skill_development_resources', id, clean, 'Resource Not Updated');
    if (!updated) return false;
    setSkillDevelopmentResources((prev) => prev.map((r) => (r.id === id ? updated : r)));
    await logAuditAction('course_updated', 'skill_resource', id, `Updated skill resource: "${updated.title}"`);
    showToast('success', 'Resource Updated', 'Changes saved successfully.');
    return true;
  };

  const deleteSkillResource = async (id: string): Promise<boolean> => {
    if (!requireAdmin('delete skill resources')) return false;
    const resource = skillDevelopmentResources.find((r) => r.id === id);
    if (!resource || !(await dbDelete('skill_development_resources', id, 'Resource Not Deleted'))) return false;
    setSkillDevelopmentResources((prev) => prev.filter((r) => r.id !== id));
    await logAuditAction('course_deleted', 'skill_resource', id, `Deleted skill resource: "${resource.title}"`);
    showToast('info', 'Resource Removed', `"${resource.title}" has been deleted.`);
    return true;
  };

  // -------------------------------------------------------------
  // HOD MOTTO & L&D TEAM
  // -------------------------------------------------------------
  const updateHodMotto = async (updates: Partial<HodMotto>): Promise<boolean> => {
    if (!requireAdmin('update the HOD motto')) return false;
    try {
      const { updated_at: _u, ...current } = hodMotto;
      const { data, error } = await db()
        .from('hod_motto')
        .upsert({ ...current, ...updates, id: hodMotto.id || 'hod_motto_001' })
        .select()
        .single();
      if (error) throw error;
      setHodMotto(data as HodMotto);
    } catch (err) {
      reportError('HOD Motto Not Saved', err);
      return false;
    }
    await logAuditAction('hod_motto_updated', 'hod_motto', hodMotto.id, 'Updated Head of Department (HOD) motto and guidance statement.');
    showToast('success', 'HOD Motto Saved', 'Head of Department leadership motto has been updated.');
    return true;
  };

  const createTeamMember = async (member: Omit<LdTeamMember, 'id' | 'created_at' | 'updated_at'>): Promise<LdTeamMember | null> => {
    if (!requireAdmin('add team members')) return null;
    const created = await dbInsert<LdTeamMember>(
      'ld_team_members',
      { ...member, display_order: member.display_order || teamMembers.length + 1 },
      'Team Member Not Saved'
    );
    if (!created) return null;
    setTeamMembers((prev) => [...prev, created].sort((a, b) => a.display_order - b.display_order));
    await logAuditAction('team_member_created', 'team_member', created.id, `Added L&D team member: ${created.full_name} (${created.position})`);
    showToast('success', 'Member Added', `${created.full_name} has been added.`);
    return created;
  };

  const updateTeamMember = async (id: string, updates: Partial<LdTeamMember>): Promise<boolean> => {
    if (!requireAdmin('edit team members')) return false;
    const updated = await dbUpdate<LdTeamMember>('ld_team_members', id, updates, 'Team Member Not Updated');
    if (!updated) return false;
    setTeamMembers((prev) => prev.map((m) => (m.id === id ? updated : m)));
    await logAuditAction('team_member_updated', 'team_member', id, `Updated L&D team member: ${updated.full_name}`);
    showToast('success', 'Member Updated', `${updated.full_name}'s details saved.`);
    return true;
  };

  const deleteTeamMember = async (id: string): Promise<boolean> => {
    if (!requireAdmin('remove team members')) return false;
    const member = teamMembers.find((m) => m.id === id);
    if (!member || !(await dbDelete('ld_team_members', id, 'Team Member Not Deleted'))) return false;
    setTeamMembers((prev) => prev.filter((m) => m.id !== id));
    await logAuditAction('team_member_deleted', 'team_member', id, `Deleted L&D team member: ${member.full_name}`);
    showToast('info', 'Member Removed', `${member.full_name} has been removed.`);
    return true;
  };

  const reorderRows = async (table: string, orderedIds: string[]): Promise<boolean> => {
    try {
      const client = db();
      const results = await Promise.all(
        orderedIds.map((id, idx) => client.from(table).update({ display_order: idx + 1 }).eq('id', id))
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
      return true;
    } catch (err) {
      reportError('Order Not Saved', err);
      return false;
    }
  };

  const applyOrder = <T extends { id: string; display_order: number }>(list: T[], orderedIds: string[]): T[] => {
    const position = new Map(orderedIds.map((id, idx) => [id, idx + 1]));
    return list
      .map((item) => (position.has(item.id) ? { ...item, display_order: position.get(item.id)! } : item))
      .sort((a, b) => a.display_order - b.display_order);
  };

  const reorderTeamMembers = async (orderedIds: string[]): Promise<boolean> => {
    if (!requireAdmin('reorder team members')) return false;
    if (!(await reorderRows('ld_team_members', orderedIds))) {
      await refreshData();
      return false;
    }
    setTeamMembers((prev) => applyOrder(prev, orderedIds));
    await logAuditAction('team_members_reordered', 'team_member', null, 'Reordered L&D team display sequence.');
    showToast('success', 'Order Saved', 'Team display order updated successfully.');
    return true;
  };

  // -------------------------------------------------------------
  // COURSE / CHANNEL LEARNING PROGRESS
  // -------------------------------------------------------------
  const recordProgress = async (
    courseId?: string,
    channelId?: string,
    percentage: number = 25,
    completionStatus: ProgressCompletionStatus = 'in_progress',
    completedModule?: string
  ): Promise<boolean> => {
    if (!isActiveStatus(currentUser.account_status)) {
      showToast('error', 'Account Restricted', 'Your account cannot record learning progress right now.');
      return false;
    }

    const existing = learningProgress.find(
      (p) =>
        p.user_id === currentUser.id &&
        ((courseId && p.course_id === courseId) || (channelId && p.channel_id === channelId))
    );
    const prevModules = existing?.completed_modules || [];
    const pct = Math.min(100, Math.max(0, percentage));
    const now = new Date().toISOString();
    const row = {
      user_id: currentUser.id,
      course_id: courseId || null,
      channel_id: channelId || null,
      progress_percentage: pct,
      completion_status: pct >= 100 ? 'completed' : completionStatus,
      last_accessed_at: now,
      updated_at: now,
      completed_modules:
        completedModule && !prevModules.includes(completedModule) ? [...prevModules, completedModule] : prevModules,
    };

    const saved = existing
      ? await dbUpdate<LearningProgress>('learning_progress', existing.id, row, 'Progress Not Saved')
      : await dbInsert<LearningProgress>('learning_progress', row, 'Progress Not Saved');
    if (!saved) return false;

    setLearningProgress((prev) => [...prev.filter((p) => p.id !== saved.id), saved]);
    showToast('info', 'Progress Saved', `Progress updated to ${saved.progress_percentage}%.`);
    return true;
  };

  // -------------------------------------------------------------
  // LICENSE LESSON PROGRESS (video heartbeat / PDF pages via RPC)
  // -------------------------------------------------------------
  const getLessonProgress = useCallback(
    (lessonId: string): LessonProgressInfo =>
      licenseVideoProgress[lessonId] || {
        lesson_id: lessonId,
        progress_percentage: 0,
        completion_status: 'not_started',
        watched_seconds: 0,
        total_duration_seconds: 0,
        watched_intervals: [],
        last_position: 0,
        viewed_pages: [],
        total_pages: 0,
        last_page: 1,
        updated_at: new Date().toISOString(),
      },
    [licenseVideoProgress]
  );

  const recordVideoHeartbeat = useCallback(
    async (
      lessonId: string,
      segment: { start: number; end: number },
      duration: number,
      playbackRate: number = 1.0,
      lastPosition: number = 0
    ): Promise<LessonProgressInfo | null> => {
      if (!isActiveStatus(currentUser.account_status)) return null;
      const client = getSupabaseClient();
      if (!client) return null;

      const { data, error } = await client.rpc('record_video_heartbeat', {
        p_lesson_id: lessonId,
        p_start: segment?.start ?? null,
        p_end: segment?.end ?? null,
        p_duration: duration,
        p_playback_rate: playbackRate,
        p_last_position: lastPosition,
      });
      if (error || !data) {
        console.warn('[KBZLife LMS] Video progress not saved:', error?.message);
        return null;
      }
      const prog = toLessonProgress(data);
      setLicenseVideoProgress((prev) => ({ ...prev, [lessonId]: prog }));
      return prog;
    },
    [currentUser.account_status]
  );

  const recordPdfPageProgress = useCallback(
    async (lessonId: string, page: number, totalPages: number): Promise<LessonProgressInfo | null> => {
      if (!isActiveStatus(currentUser.account_status)) return null;
      const client = getSupabaseClient();
      if (!client) return null;

      const { data, error } = await client.rpc('record_pdf_page', {
        p_lesson_id: lessonId,
        p_page: page,
        p_total_pages: totalPages > 0 ? totalPages : 1,
      });
      if (error || !data) {
        console.warn('[KBZLife LMS] PDF progress not saved:', error?.message);
        return null;
      }
      const prog = toLessonProgress(data);
      setLicenseVideoProgress((prev) => ({ ...prev, [lessonId]: prog }));
      return prog;
    },
    [currentUser.account_status]
  );

  // -------------------------------------------------------------
  // CHAPTER-BASED SEQUENTIAL WORKFLOW
  // -------------------------------------------------------------
  const isLessonComplete = useCallback(
    (lesson: LicenseTrainingLesson): boolean => {
      const prog = getLessonProgress(lesson.id);
      if ((lesson.lesson_type || lesson.content_type) === 'pdf') {
        return (
          prog.completion_status === 'completed' ||
          Boolean(prog.total_pages && prog.total_pages > 0 && (prog.viewed_pages?.length || 0) >= prog.total_pages) ||
          prog.progress_percentage >= 100
        );
      }
      return prog.completion_status === 'completed' || prog.progress_percentage >= 95;
    },
    [getLessonProgress]
  );

  const publishedChapterLessons = useCallback(
    (chapterId: string) =>
      licenseTrainingLessons.filter((l) => l.chapter_id === chapterId && (l.is_published ?? l.status === 'published')),
    [licenseTrainingLessons]
  );

  const getChapterStatus = useCallback(
    (chapterId: string): ChapterStatus => {
      const comp = chapterCompletions[chapterId];
      if (currentUser.role === 'admin') {
        if (comp?.quiz_passed) return 'completed';
        if (comp?.materials_completed) return 'quiz_available';
        return 'in_progress';
      }

      const sorted = [...licenseChapters].sort((a, b) => a.display_order - b.display_order || a.chapter_number - b.chapter_number);
      const index = sorted.findIndex((c) => c.id === chapterId);
      if (index === -1) return 'locked';

      // Chapter N unlocks only after the quiz of chapter N-1 is passed
      if (index > 0) {
        const prevComp = chapterCompletions[sorted[index - 1].id];
        const prevPassed = prevComp?.quiz_passed || prevComp?.status === 'completed' || prevComp?.status === 'passed';
        if (!prevPassed) return 'locked';
      }

      if (comp?.quiz_passed || comp?.status === 'completed' || comp?.status === 'passed') return 'completed';

      const lessons = publishedChapterLessons(chapterId);
      if (lessons.length === 0 || lessons.every(isLessonComplete)) return 'quiz_available';
      return 'in_progress';
    },
    [currentUser.role, licenseChapters, chapterCompletions, publishedChapterLessons, isLessonComplete]
  );

  const getChapterMaterialsProgress = useCallback(
    (chapterId: string) => {
      const lessons = publishedChapterLessons(chapterId);
      if (lessons.length === 0) return { isComplete: true, completedCount: 0, totalCount: 0, percentage: 100 };
      const completedCount = lessons.filter(isLessonComplete).length;
      return {
        isComplete: completedCount === lessons.length,
        completedCount,
        totalCount: lessons.length,
        percentage: Math.round((completedCount / lessons.length) * 100),
      };
    },
    [publishedChapterLessons, isLessonComplete]
  );

  const getOverallLicenseProgress = useCallback(() => {
    const published = licenseChapters.filter((c) => c.is_published);
    if (published.length === 0) return { totalChapters: 0, completedChapters: 0, overallPercentage: 0, isCourseCompleted: false };
    const completed = published.filter((ch) => {
      const s = getChapterStatus(ch.id);
      return s === 'completed' || s === 'passed';
    }).length;
    return {
      totalChapters: published.length,
      completedChapters: completed,
      overallPercentage: Math.round((completed / published.length) * 100),
      isCourseCompleted: completed === published.length,
    };
  }, [licenseChapters, getChapterStatus]);

  const createLicenseChapter = async (data: {
    title: string;
    chapter_number?: number;
    description?: string;
    passing_score?: number;
    display_order?: number;
    is_published?: boolean;
  }): Promise<boolean> => {
    if (!requireAdmin('create chapters')) return false;
    const nextNumber = licenseChapters.reduce((max, c) => Math.max(max, c.chapter_number), 0) + 1;
    const created = await dbInsert<LicenseChapter>(
      'license_chapters',
      {
        title: data.title.trim(),
        description: data.description || '',
        chapter_number: data.chapter_number ?? nextNumber,
        passing_score: data.passing_score ?? 80,
        display_order: data.display_order ?? licenseChapters.length + 1,
        is_published: data.is_published ?? true,
        author_id: currentUser.id,
      },
      'Chapter Not Saved'
    );
    if (!created) return false;
    setLicenseChapters((prev) => [...prev, created].sort((a, b) => a.display_order - b.display_order));
    await logAuditAction('license_chapter_created', 'license_chapter', created.id, `Created license chapter: ${created.title}`);
    showToast('success', 'Chapter Created', `Created ${created.title}`);
    return true;
  };

  const updateLicenseChapter = async (id: string, updates: Partial<LicenseChapter>): Promise<boolean> => {
    if (!requireAdmin('update chapters')) return false;
    const updated = await dbUpdate<LicenseChapter>('license_chapters', id, updates, 'Chapter Not Updated');
    if (!updated) return false;
    setLicenseChapters((prev) => prev.map((c) => (c.id === id ? updated : c)).sort((a, b) => a.display_order - b.display_order));
    await logAuditAction('license_chapter_updated', 'license_chapter', id, `Updated license chapter: ${updated.title}`);
    showToast('success', 'Chapter Updated', `Saved changes for ${updated.title}`);
    return true;
  };

  const deleteLicenseChapter = async (id: string): Promise<boolean> => {
    if (!requireAdmin('delete chapters')) return false;
    const target = licenseChapters.find((c) => c.id === id);
    if (!(await dbDelete('license_chapters', id, 'Chapter Not Deleted'))) return false;
    setLicenseChapters((prev) => prev.filter((c) => c.id !== id));
    setLicenseQuizzes((prev) => prev.filter((q) => q.chapter_id !== id));
    setLicenseTrainingLessons((prev) => prev.map((l) => (l.chapter_id === id ? { ...l, chapter_id: undefined } : l)));
    if (target) await logAuditAction('license_chapter_deleted', 'license_chapter', id, `Deleted license chapter: ${target.title}`);
    showToast('success', 'Chapter Deleted', 'The chapter has been removed.');
    return true;
  };

  const reorderLicenseChapters = async (orderedIds: string[]): Promise<boolean> => {
    if (!requireAdmin('reorder chapters')) return false;
    if (!(await reorderRows('license_chapters', orderedIds))) {
      await refreshData();
      return false;
    }
    setLicenseChapters((prev) => applyOrder(prev, orderedIds));
    await logAuditAction('license_chapter_reordered', 'license_chapter', null, 'Reordered license chapters.');
    return true;
  };

  // -------------------------------------------------------------
  // QUIZ HELPERS
  // Admins read the full quiz tables; learners read *_learner views,
  // which strip correct_option_index. Grading happens in Postgres.
  // -------------------------------------------------------------
  const fetchQuiz = useCallback(
    async <T,>(table: string, filter: Record<string, string>): Promise<T | null> => {
      const client = getSupabaseClient();
      if (!client) return null;
      let query = client.from(isAdmin ? table : `${table}_learner`).select('*');
      Object.entries(filter).forEach(([col, val]) => {
        query = query.eq(col, val);
      });
      const { data, error } = await query.limit(1).maybeSingle();
      if (error) {
        console.warn(`[KBZLife LMS] Could not load quiz from ${table}:`, error.message);
        return null;
      }
      return (data as T) || null;
    },
    [isAdmin]
  );

  const upsertQuizRow = async <T extends { id: string }>(
    table: string,
    existingId: string | undefined,
    row: Record<string, any>,
    idPrefix: string
  ): Promise<T | null> => {
    if (existingId) return dbUpdate<T>(table, existingId, row, 'Quiz Not Saved');
    return dbInsert<T>(table, { id: row.id || shortId(idPrefix), ...row }, 'Quiz Not Saved');
  };

  const runQuizRpc = async (fn: string, args: Record<string, any>): Promise<QuizResult> => {
    if (!isActiveStatus(currentUser.account_status)) {
      showToast('error', 'Account Restricted', 'Your account cannot submit assessments right now.');
      return { success: false, message: 'Account is not active.' };
    }
    try {
      const { data, error } = await db().rpc(fn, args);
      if (error) throw error;
      const result = data as QuizResult;
      if (!result?.success) {
        showToast('error', 'Quiz Error', result?.message || 'Submission failed.');
      }
      return result || { success: false, message: 'Empty response.' };
    } catch (err) {
      reportError('Quiz Submission Failed', err);
      return { success: false, message: errorMessage(err) };
    }
  };

  // -------------------------------------------------------------
  // LICENSE QUIZZES
  // -------------------------------------------------------------
  const getChapterQuiz = useCallback(
    async (chapterId: string): Promise<LicenseQuiz | null> =>
      (await fetchQuiz<LicenseQuiz>('license_quizzes', { chapter_id: chapterId })) ||
      licenseQuizzes.find((q) => q.chapter_id === chapterId) ||
      null,
    [fetchQuiz, licenseQuizzes]
  );

  const saveLicenseQuiz = async (
    match: { chapter_id?: string; lesson_id?: string },
    data: { title: string; description?: string; passingScore: number; questions: LicenseQuizQuestion[] }
  ): Promise<boolean> => {
    if (!requireAdmin('configure quizzes')) return false;
    const existing = licenseQuizzes.find((q) =>
      match.chapter_id ? q.chapter_id === match.chapter_id : q.lesson_id === match.lesson_id
    );
    const quizId = existing?.id || shortId('lic_quiz');
    const saved = await upsertQuizRow<LicenseQuiz>(
      'license_quizzes',
      existing?.id,
      {
        id: quizId,
        ...match,
        title: data.title,
        description: data.description || '',
        passing_score: data.passingScore,
        is_published: true,
        questions: normalizeQuestions(data.questions, quizId),
      },
      'lic_quiz'
    );
    if (!saved) return false;
    setLicenseQuizzes((prev) => [...prev.filter((q) => q.id !== saved.id), saved]);
    await logAuditAction('license_quiz_saved', 'license_quiz', saved.id, `Saved license quiz: ${saved.title}`);
    showToast('success', 'Quiz Saved', 'Assessment questions saved successfully.');
    return true;
  };

  const saveChapterQuiz = async (
    chapterId: string,
    data: { title: string; description?: string; passingScore: number; questions: LicenseQuizQuestion[] }
  ): Promise<boolean> => saveLicenseQuiz({ chapter_id: chapterId }, data);

  const saveQuiz = async (
    lessonId: string,
    title: string,
    description: string,
    passingScore: number,
    questions: LicenseQuizQuestion[]
  ): Promise<boolean> => saveLicenseQuiz({ lesson_id: lessonId }, { title, description, passingScore, questions });

  const submitChapterQuiz = async (chapterId: string, quizId: string, answers: Record<string, number>) => {
    const result = await runQuizRpc('submit_license_quiz', {
      p_quiz_id: quizId || null,
      p_answers: answers,
      p_chapter_id: chapterId,
      p_lesson_id: null,
    });
    if (result.success) {
      setChapterCompletions((prev) => {
        const prevComp = prev[chapterId];
        const passedEver = Boolean(result.passed || prevComp?.quiz_passed);
        return {
          ...prev,
          [chapterId]: {
            status: passedEver ? 'completed' : 'quiz_available',
            materials_completed: true,
            quiz_passed: passedEver,
            highest_quiz_score: Math.max(prevComp?.highest_quiz_score || 0, result.percentage || 0),
          },
        };
      });
      if (result.attempt) setLicenseQuizAttempts((prev) => [result.attempt as LicenseQuizAttempt, ...prev]);
      showToast(result.passed ? 'success' : 'warning', result.passed ? 'Assessment Passed!' : 'Retake Available', result.message);
    }
    return result;
  };

  const getLessonQuiz = useCallback(
    async (lessonId: string): Promise<LicenseQuiz | null> =>
      (await fetchQuiz<LicenseQuiz>('license_quizzes', { lesson_id: lessonId })) ||
      licenseQuizzes.find((q) => q.lesson_id === lessonId) ||
      null,
    [fetchQuiz, licenseQuizzes]
  );

  const submitQuizAttempt = async (lessonId: string, quizId: string, answers: Record<string, number>) => {
    const result = await runQuizRpc('submit_license_quiz', {
      p_quiz_id: quizId || null,
      p_answers: answers,
      p_chapter_id: null,
      p_lesson_id: lessonId,
    });
    if (result.success) {
      setLicenseVideoProgress((prev) => {
        const current = prev[lessonId] || getLessonProgress(lessonId);
        return {
          ...prev,
          [lessonId]: {
            ...current,
            quiz_score: result.percentage,
            quiz_passed: result.passed,
            quiz_attempts_count: (current.quiz_attempts_count || 0) + 1,
            quiz_completed_at: new Date().toISOString(),
            overall_completed: result.overall_completed,
          },
        };
      });
      if (result.attempt) setLicenseQuizAttempts((prev) => [result.attempt as LicenseQuizAttempt, ...prev]);
      showToast(result.passed ? 'success' : 'warning', result.passed ? 'Assessment Passed!' : 'Assessment Needs Retake', result.message);
    }
    return result;
  };

  const getQuizAttempts = useCallback(
    async (lessonId?: string, chapterId?: string): Promise<LicenseQuizAttempt[]> => {
      const client = getSupabaseClient();
      if (client) {
        let query = client.from('license_quiz_attempts').select('*').order('created_at', { ascending: false });
        if (chapterId) query = query.eq('chapter_id', chapterId);
        if (lessonId) query = query.eq('lesson_id', lessonId);
        const { data, error } = await query;
        if (!error && data) return data as LicenseQuizAttempt[];
      }
      return licenseQuizAttempts.filter(
        (a) => (!chapterId || a.chapter_id === chapterId) && (!lessonId || a.lesson_id === lessonId)
      );
    },
    [licenseQuizAttempts]
  );

  // -------------------------------------------------------------
  // PRODUCT KNOWLEDGE HUB
  // -------------------------------------------------------------
  // Columns added by later migrations. If the database doesn't have them yet,
  // the product is still saved without them and the admin is told which SQL to run.
  const OPTIONAL_PRODUCT_COLUMNS: Record<string, { label: string; sql: string }> = {
    pamphlet_cover_url: {
      label: 'pamphlet cover',
      sql: 'alter table public.product_knowledge_items add column if not exists pamphlet_cover_url text;',
    },
    icon_key: {
      label: 'product icon',
      sql: 'alter table public.product_knowledge_items add column if not exists icon_key text;',
    },
  };

  const saveProductRow = async (
    row: Record<string, any>,
    errorTitle: string,
    id?: string
  ): Promise<ProductKnowledgeItem | null> => {
    const attempt = (r: Record<string, any>) =>
      id
        ? db().from('product_knowledge_items').update(cleanRow(r)).eq('id', id).select().maybeSingle()
        : db().from('product_knowledge_items').insert(cleanRow(r)).select().single();

    try {
      let current = { ...row };
      if (id) {
        delete current.id;
        delete current.created_at;
      }
      const skipped: string[] = [];
      let { data, error } = await attempt(current);

      // e.g. PGRST204: Could not find the 'pamphlet_cover_url' column of 'product_knowledge_items' in the schema cache
      while (error) {
        const message = `${error.message || ''} ${(error as { details?: string }).details || ''}`;
        const missing = Object.keys(OPTIONAL_PRODUCT_COLUMNS).find(
          (col) => col in current && !skipped.includes(col) && message.includes(col)
        );
        if (!missing) break;
        skipped.push(missing);
        const { [missing]: _dropped, ...rest } = current;
        current = rest;
        ({ data, error } = await attempt(current));
      }

      if (error) throw error;
      if (!data) throw new Error('Record not found, or you do not have permission to change it.');

      if (skipped.length > 0) {
        const labels = skipped.map((c) => OPTIONAL_PRODUCT_COLUMNS[c].label).join(' and ');
        const sql = skipped.map((c) => OPTIONAL_PRODUCT_COLUMNS[c].sql).join(' ');
        showToast(
          'warning',
          `Product saved, but the ${labels} was not`,
          `Your database is missing a column. Run this once in the Supabase SQL Editor, then open the product and set the ${labels} again: ${sql}`,
          20000
        );
      }
      return data as ProductKnowledgeItem;
    } catch (err) {
      reportError(errorTitle, err);
      return null;
    }
  };

  const createProduct = async (
    productData: Omit<ProductKnowledgeItem, 'id' | 'created_at' | 'updated_at'>
  ): Promise<ProductKnowledgeItem | null> => {
    if (!requireAdmin('create products')) return null;
    const isPub = productData.is_published ?? productData.status === 'published';
    const created = await saveProductRow(
      {
        ...productData,
        is_published: isPub,
        status: isPub ? 'published' : 'draft',
        display_order: productData.display_order ?? products.length + 1,
        author_id: currentUser.id,
      },
      'Product Not Saved'
    );
    if (!created) return null;
    setProducts((prev) => [...prev, created]);
    await logAuditAction('product_created', 'product', created.id, `Added new product: ${created.title}`);
    showToast('success', 'Product Created', `"${created.title}" has been saved.`);
    return created;
  };

  const updateProduct = async (id: string, updates: Partial<ProductKnowledgeItem>): Promise<boolean> => {
    if (!requireAdmin('edit products')) return false;
    const clean: Partial<ProductKnowledgeItem> = { ...updates };
    if (updates.is_published !== undefined) clean.status = updates.is_published ? 'published' : 'draft';
    else if (updates.status !== undefined) clean.is_published = updates.status === 'published';

    const updated = await saveProductRow(clean, 'Product Not Updated', id);
    if (!updated) return false;
    setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
    await logAuditAction('product_updated', 'product', id, `Updated product details: ${updated.title}`);
    showToast('success', 'Product Updated', 'Product changes saved successfully.');
    return true;
  };

  const deleteProduct = async (id: string): Promise<boolean> => {
    if (!requireAdmin('delete products')) return false;
    const target = products.find((p) => p.id === id);
    // product_quizzes and product_quiz_attempts cascade on delete
    if (!(await dbDelete('product_knowledge_items', id, 'Product Not Deleted'))) return false;
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setProductQuizzes((prev) => prev.filter((q) => q.product_id !== id));
    setProductQuizAttempts((prev) => prev.filter((a) => a.product_id !== id));
    await logAuditAction('product_deleted', 'product', id, `Deleted product: ${target?.title || id}`);
    showToast('info', 'Product Deleted', `"${target?.title || 'Product'}" has been removed.`);
    return true;
  };

  const getProductQuiz = useCallback(
    async (productId: string): Promise<ProductQuiz | null> =>
      (await fetchQuiz<ProductQuiz>('product_quizzes', { product_id: productId })) ||
      productQuizzes.find((q) => q.product_id === productId) ||
      null,
    [fetchQuiz, productQuizzes]
  );

  const saveProductQuiz = async (
    productId: string,
    data: {
      title: string;
      description?: string;
      passing_score: number;
      max_attempts?: number;
      is_published: boolean;
      questions: ProductQuizQuestion[];
    }
  ): Promise<boolean> => {
    if (!requireAdmin('configure product quizzes')) return false;
    const existing = productQuizzes.find((q) => q.product_id === productId);
    const quizId = existing?.id || shortId('prod_quiz');
    const saved = await upsertQuizRow<ProductQuiz>(
      'product_quizzes',
      existing?.id,
      {
        id: quizId,
        product_id: productId,
        title: data.title,
        description: data.description || '',
        passing_score: data.passing_score,
        max_attempts: data.max_attempts ?? 0,
        is_published: data.is_published,
        questions: normalizeQuestions(data.questions, quizId),
      },
      'prod_quiz'
    );
    if (!saved) return false;
    setProductQuizzes((prev) => [...prev.filter((q) => q.id !== saved.id), saved]);
    await logAuditAction('product_quiz_saved', 'product_quiz', saved.id, `Saved quiz for product: ${productId}`);
    showToast('success', 'Quiz Saved', 'Product quiz and questions saved successfully.');
    return true;
  };

  const submitProductQuizAttempt = async (productId: string, quizId: string, answers: Record<string, number>) => {
    const result = await runQuizRpc('submit_product_quiz', {
      p_product_id: productId,
      p_quiz_id: quizId || null,
      p_answers: answers,
    });
    if (result.success && result.attempt) {
      setProductQuizAttempts((prev) => [result.attempt as ProductQuizAttempt, ...prev]);
    }
    return result;
  };

  const getUserProductAttempts = useCallback(
    async (productId?: string): Promise<ProductQuizAttempt[]> => {
      const client = getSupabaseClient();
      if (client && authUserId) {
        let query = client
          .from('product_quiz_attempts')
          .select('*')
          .eq('user_id', authUserId)
          .order('created_at', { ascending: false });
        if (productId) query = query.eq('product_id', productId);
        const { data, error } = await query;
        if (!error && data) return data as ProductQuizAttempt[];
      }
      return productQuizAttempts.filter((a) => a.user_id === authUserId && (!productId || a.product_id === productId));
    },
    [authUserId, productQuizAttempts]
  );

  // AI quiz generation stays on the server (needs GEMINI_API_KEY)
  const generateQuizFromPdf = useCallback(
    async (data: { fileUrl?: string; base64?: string; fileName?: string; count?: number; topic?: string }) => {
      try {
        const res = await fetch('/api/quiz/generate-from-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
          body: JSON.stringify(data),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          const err = json.error || json.message || 'Failed to extract or generate quiz from PDF.';
          showToast('error', 'Quiz Generation Notice', err);
          return { success: false, error: err, isScanned: Boolean(json.isScanned) };
        }
        showToast(
          'success',
          'Quiz Questions Generated',
          `Successfully generated ${json.questions?.length || 0} questions from ${data.fileName || 'PDF'}. You can now review and adjust before publishing.`
        );
        return {
          success: true,
          questions: json.questions || [],
          page_count: json.page_count,
          extracted_preview: json.extracted_preview,
          message: json.message,
        };
      } catch (err) {
        const msg = errorMessage(err);
        showToast('error', 'Generation Error', msg);
        return { success: false, error: msg };
      }
    },
    [authHeaders, showToast]
  );

  // -------------------------------------------------------------
  // SKILL QUIZZES
  // -------------------------------------------------------------
  const getSkillQuiz = useCallback(
    async (categoryId?: string, resourceId?: string, quizId?: string): Promise<SkillQuiz | null> => {
      const filter: Record<string, string> = quizId
        ? { id: quizId }
        : categoryId
        ? { category_id: categoryId }
        : resourceId
        ? { resource_id: resourceId }
        : {};
      if (Object.keys(filter).length === 0) return null;
      return (
        (await fetchQuiz<SkillQuiz>('skill_quizzes', filter)) ||
        skillQuizzes.find(
          (q) =>
            (quizId && q.id === quizId) ||
            (categoryId && q.category_id === categoryId) ||
            (resourceId && q.resource_id === resourceId)
        ) ||
        null
      );
    },
    [fetchQuiz, skillQuizzes]
  );

  const saveSkillQuiz = async (data: {
    id?: string;
    category_id?: string;
    resource_id?: string;
    title: string;
    description?: string;
    passing_score: number;
    is_published?: boolean;
    questions: SkillQuizQuestion[];
  }): Promise<boolean> => {
    if (!requireAdmin('configure skill quizzes')) return false;
    const existing = skillQuizzes.find(
      (q) => (data.id && q.id === data.id) || (!data.id && data.category_id && q.category_id === data.category_id && !data.resource_id)
    );
    const quizId = existing?.id || data.id || shortId('skill_quiz');
    const saved = await upsertQuizRow<SkillQuiz>(
      'skill_quizzes',
      existing?.id,
      {
        id: quizId,
        category_id: data.category_id || null,
        resource_id: data.resource_id || null,
        title: data.title,
        description: data.description || '',
        passing_score: data.passing_score,
        is_published: data.is_published ?? true,
        questions: normalizeQuestions(data.questions, quizId),
      },
      'skill_quiz'
    );
    if (!saved) return false;
    setSkillQuizzes((prev) => [...prev.filter((q) => q.id !== saved.id), saved]);
    await logAuditAction('skill_quiz_saved', 'skill_quiz', saved.id, `Saved skill assessment quiz: ${saved.title}`);
    showToast('success', 'Skill Quiz Saved', 'Assessment quiz has been saved successfully.');
    return true;
  };

  const deleteSkillQuiz = async (quizId: string): Promise<boolean> => {
    if (!requireAdmin('delete skill quizzes')) return false;
    if (!(await dbDelete('skill_quizzes', quizId, 'Skill Quiz Not Deleted'))) return false;
    setSkillQuizzes((prev) => prev.filter((q) => q.id !== quizId));
    setSkillQuizAttempts((prev) => prev.filter((a) => a.quiz_id !== quizId));
    await logAuditAction('skill_quiz_deleted', 'skill_quiz', quizId, `Deleted skill quiz: ${quizId}`);
    showToast('info', 'Skill Quiz Deleted', 'Assessment quiz removed.');
    return true;
  };

  const submitSkillQuiz = async (quizId: string, categoryId: string | undefined, answers: Record<string, number>) => {
    let targetId = quizId;
    if (!targetId && categoryId) targetId = skillQuizzes.find((q) => q.category_id === categoryId)?.id || '';
    const result = await runQuizRpc('submit_skill_quiz', { p_quiz_id: targetId, p_answers: answers });
    if (result.success) {
      if (result.attempt) setSkillQuizAttempts((prev) => [result.attempt as SkillQuizAttempt, ...prev]);
      showToast(result.passed ? 'success' : 'warning', result.passed ? 'Assessment Passed!' : 'Retake Needed', result.message);
    }
    return result;
  };

  const getSkillQuizAttempts = useCallback(
    async (categoryId?: string, quizId?: string): Promise<SkillQuizAttempt[]> => {
      const client = getSupabaseClient();
      if (client && authUserId) {
        let query = client
          .from('skill_quiz_attempts')
          .select('*')
          .eq('user_id', authUserId)
          .order('created_at', { ascending: false });
        if (categoryId) query = query.eq('category_id', categoryId);
        if (quizId) query = query.eq('quiz_id', quizId);
        const { data, error } = await query;
        if (!error && data) return data as SkillQuizAttempt[];
      }
      return skillQuizAttempts.filter(
        (a) => a.user_id === authUserId && (!categoryId || a.category_id === categoryId) && (!quizId || a.quiz_id === quizId)
      );
    },
    [authUserId, skillQuizAttempts]
  );

  // -------------------------------------------------------------
  // COMPANY BULLETIN
  // -------------------------------------------------------------
  const createBulletin = async (
    data: Omit<CompanyBulletinItem, 'id' | 'created_at' | 'updated_at'>
  ): Promise<CompanyBulletinItem | null> => {
    if (!requireAdmin('publish announcements')) return null;
    const published = data.published ?? data.status === 'published';
    const created = await dbInsert<CompanyBulletinItem>(
      'company_bulletins',
      {
        ...data,
        published,
        status: published ? 'published' : 'draft',
        published_at: data.published_at || new Date().toISOString(),
        author_id: currentUser.id,
        author_name: data.author_name || currentUser.full_name,
      },
      'Announcement Not Saved'
    );
    if (!created) return null;
    setCompanyBulletins((prev) => [created, ...prev]);
    await logAuditAction('bulletin_created', 'bulletin', created.id, `Created announcement: ${created.title}`);
    showToast('success', 'Announcement Published', `"${created.title}" is now available in Company Bulletin.`);
    return created;
  };

  const updateBulletin = async (id: string, updates: Partial<CompanyBulletinItem>): Promise<boolean> => {
    if (!requireAdmin('edit announcements')) return false;
    const clean: Partial<CompanyBulletinItem> = { ...updates };
    if (updates.published !== undefined && updates.status === undefined) clean.status = updates.published ? 'published' : 'draft';
    if (updates.status !== undefined && updates.published === undefined) clean.published = updates.status === 'published';

    const updated = await dbUpdate<CompanyBulletinItem>('company_bulletins', id, clean, 'Announcement Not Updated');
    if (!updated) return false;
    setCompanyBulletins((prev) => prev.map((b) => (b.id === id ? updated : b)));
    await logAuditAction('bulletin_updated', 'bulletin', id, `Updated announcement: ${updated.title}`);
    showToast('success', 'Announcement Updated', 'Changes saved successfully.');
    return true;
  };

  const deleteBulletin = async (id: string): Promise<boolean> => {
    if (!requireAdmin('delete announcements')) return false;
    const target = companyBulletins.find((b) => b.id === id);
    if (!(await dbDelete('company_bulletins', id, 'Announcement Not Deleted'))) return false;
    setCompanyBulletins((prev) => prev.filter((b) => b.id !== id));
    await logAuditAction('bulletin_deleted', 'bulletin', id, `Deleted announcement: ${target?.title || id}`);
    showToast('info', 'Announcement Deleted', `"${target?.title || 'Announcement'}" has been removed.`);
    return true;
  };

  // -------------------------------------------------------------
  // COMPUTED / QUERIES
  // -------------------------------------------------------------
  const getStats = (): AdminStats => ({
    totalUsers: profiles.length,
    activeUsers: profiles.filter((p) => isActiveStatus(p.account_status)).length,
    inactiveOrSuspendedUsers: profiles.filter((p) => !isActiveStatus(p.account_status)).length,
    totalCourses: courses.length,
    totalChannels: channels.length,
    totalEnrollments: courseEnrollments.filter((e) => e.status === 'enrolled').length,
    totalNews: companyNews.length,
    totalVideos: companyVideos.length,
    totalTopPerformers: topPerformers.length,
    totalTeamMembers: teamMembers.length,
    totalLicenseLessons: licenseTrainingLessons.length,
    totalSkillCategories: skillCategories.length,
    totalSkillResources: skillDevelopmentResources.length,
    totalProducts: products.length,
  });

  const getUserEnrollments = (userId: string) => courseEnrollments.filter((e) => e.user_id === userId);
  const getUserChannelAccesses = (userId: string) => channelAccesses.filter((ca) => ca.user_id === userId);

  const getUserAccessibleCourses = (userId: string): Course[] => {
    const user = profiles.find((p) => p.id === userId);
    if (!user || !isActiveStatus(user.account_status)) return [];
    if (user.role === 'admin') return courses.filter((c) => c.published);
    const validIds = courseEnrollments
      .filter((e) => e.user_id === userId && e.status === 'enrolled' && !(e.expires_at && new Date(e.expires_at) < new Date()))
      .map((e) => e.course_id);
    return courses.filter((c) => c.published && validIds.includes(c.id));
  };

  const getUserAccessibleChannels = (userId: string): Channel[] => {
    const user = profiles.find((p) => p.id === userId);
    if (!user || !isActiveStatus(user.account_status)) return [];
    if (user.role === 'admin') return channels.filter((c) => c.published);
    const validIds = channelAccesses
      .filter((ca) => ca.user_id === userId && ca.status === 'granted' && !(ca.expires_at && new Date(ca.expires_at) < new Date()))
      .map((ca) => ca.channel_id);
    return channels.filter((c) => c.published && validIds.includes(c.id));
  };

  const getUserProgress = (userId: string, courseId?: string, channelId?: string) =>
    learningProgress.find(
      (p) => p.user_id === userId && ((courseId && p.course_id === courseId) || (channelId && p.channel_id === channelId))
    );

  const byOrder = <T extends { display_order: number }>(a: T, b: T) => a.display_order - b.display_order;

  const getPublishedNews = () => companyNews.filter((n) => n.status === 'published');
  const getPublishedVideos = () => companyVideos.filter((v) => v.status === 'published').sort(byOrder);
  const getPublishedTopPerformers = () => topPerformers.filter((tp) => tp.status === 'published');
  const getPublishedTeamMembers = () => teamMembers.filter((m) => m.is_published).sort(byOrder);
  const getPublishedHodMotto = (): HodMotto | null =>
    hodMotto.is_published && hodMotto.motto_text?.trim() ? hodMotto : null;
  const getPublishedLicenseLessons = () =>
    licenseTrainingLessons.filter((l) => l.is_published === true || l.status === 'published').sort(byOrder);
  const getPublishedSkillCategories = () => skillCategories.filter((c) => c.is_published).sort(byOrder);
  const getPublishedSkillResources = () =>
    skillDevelopmentResources.filter((r) => r.is_published === true || r.status === 'published').sort(byOrder);
  const getPublishedProducts = () =>
    products.filter((p) => p.is_published === true || p.status === 'published').sort(byOrder);
  const getProduct = (id: string) => products.find((p) => p.id === id);

  return (
    <LmsContext.Provider
      value={{
        currentUser,
        profiles,
        courses,
        channels,
        courseEnrollments,
        channelAccesses,
        learningProgress,
        companyNews,
        companyVideos,
        topPerformers,
        hodMotto,
        teamMembers,
        licenseTrainingLessons,
        skillDevelopmentResources,
        auditLogs,
        emailLogs,
        isLoading,
        isSupabaseLive,
        toasts,
        dismissToast,
        showToast,
        theme,
        toggleTheme,
        setTheme,
        isAuthenticated,
        isAuthReady,
        isPasswordRecovery,
        completePasswordRecovery,
        exitPasswordRecovery,
        loginWithCredentials,
        registerUser,
        checkUserApprovalStatus,
        approveUser,
        rejectUser,
        changePassword,
        requestPasswordReset,
        updateAdminProfile,
        updateProfile,
        fetchProfile,
        signOut,
        getStats,
        getUserEnrollments,
        getUserChannelAccesses,
        getUserAccessibleCourses,
        getUserAccessibleChannels,
        getUserProgress,
        getPublishedNews,
        getPublishedVideos,
        getPublishedTopPerformers,
        getPublishedTeamMembers,
        getPublishedHodMotto,
        getPublishedLicenseLessons,
        skillCategories,
        getPublishedSkillCategories,
        getPublishedSkillResources,
        createSkillCategory,
        updateSkillCategory,
        deleteSkillCategory,
        updateUserStatus,
        updateUserRole,
        assignCourse,
        revokeCourse,
        assignChannel,
        revokeChannel,
        createCourse,
        updateCourse,
        deleteCourse,
        createChannel,
        updateChannel,
        deleteChannel,
        createNews,
        updateNews,
        deleteNews,
        createVideo,
        updateVideo,
        deleteVideo,
        createTopPerformer,
        updateTopPerformer,
        deleteTopPerformer,
        createLicenseLesson,
        updateLicenseLesson,
        deleteLicenseLesson,
        createSkillResource,
        updateSkillResource,
        deleteSkillResource,
        updateHodMotto,
        createTeamMember,
        updateTeamMember,
        deleteTeamMember,
        reorderTeamMembers,
        inviteUser,
        sendCustomEmail,
        recordProgress,
        licenseVideoProgress,
        getLessonProgress,
        recordVideoHeartbeat,
        recordPdfPageProgress,
        licenseChapters,
        chapterCompletions,
        getChapterStatus,
        getChapterMaterialsProgress,
        getOverallLicenseProgress,
        createLicenseChapter,
        updateLicenseChapter,
        deleteLicenseChapter,
        reorderLicenseChapters,
        getChapterQuiz,
        saveChapterQuiz,
        submitChapterQuiz,
        licenseQuizzes,
        licenseQuizAttempts,
        getLessonQuiz,
        submitQuizAttempt,
        saveQuiz,
        getQuizAttempts,
        products,
        productQuizzes,
        productQuizAttempts,
        getPublishedProducts,
        getProduct,
        createProduct,
        updateProduct,
        deleteProduct,
        getProductQuiz,
        saveProductQuiz,
        submitProductQuizAttempt,
        getUserProductAttempts,
        generateQuizFromPdf,
        skillQuizzes,
        skillQuizAttempts,
        getSkillQuiz,
        saveSkillQuiz,
        deleteSkillQuiz,
        submitSkillQuiz,
        getSkillQuizAttempts,
        companyBulletins,
        createBulletin,
        updateBulletin,
        deleteBulletin,
        refreshData,
      }}
    >
      {children}

      {/* Global Toast Notifications Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-xl shadow-lg border text-sm flex items-start justify-between gap-3 transition-all transform translate-y-0 ${
              toast.type === 'success'
                ? 'bg-emerald-900/95 text-white border-emerald-700'
                : toast.type === 'error'
                ? 'bg-red-900/95 text-white border-red-700'
                : toast.type === 'warning'
                ? 'bg-amber-900/95 text-white border-amber-700'
                : 'bg-[#003366]/95 text-white border-sky-600'
            }`}
          >
            <div>
              <p className="font-semibold">{toast.title}</p>
              {toast.message && <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">{toast.message}</p>}
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="text-white/60 hover:text-white text-xs font-bold px-1.5 py-0.5 cursor-pointer"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </LmsContext.Provider>
  );
};

export const useLms = (): LmsContextType => {
  const context = useContext(LmsContext);
  if (!context) {
    throw new Error('useLms must be used within an LmsProvider');
  }
  return context;
};
