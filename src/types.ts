export type PriorityLevel = "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type Category = "Work" | "Study" | "Coding" | "Testing" | "Personal" | "Exercise" | "Break" | "Health" | "Other";
export type TimelineType = "ACTIVITY" | "TASK" | "CAPTURE" | "CHECKIN" | "JOURNAL" | "DOSE" | "VITAL" | "APPOINTMENT" | "HEALTH";

export interface Task {
  id: number;
  title: string;
  description: string;
  priority: PriorityLevel;
  status: TaskStatus;
  isPriorityPin: boolean;
  category: Category | string;
  dueDateMillis?: number | null;
  estimatedDurationMinutes?: number | null;
  createdAtMillis: number;
  completedAtMillis?: number | null;
  safetyWarning?: string | null;
}

export interface ActivityLog {
  id: number;
  activityName: string;
  category: Category | string;
  startTimeMillis: number;
  endTimeMillis?: number | null;
  durationSeconds: number;
  isRunning: boolean;
  isPaused: boolean;
  pauseStartTimeMillis?: number | null;
  accumulatedPausedDurationSeconds: number;
  note?: string | null;
}

export interface TimelineEntry {
  id: number;
  title: string;
  category: Category | string;
  timestampMillis: number;
  durationMinutes?: number | null;
  note?: string | null;
  type: TimelineType;
}

export interface QuickCapture {
  id: number;
  text: string;
  category: Category | string;
  tags: string;
  createdAtMillis: number;
}

export interface MorningCheckIn {
  dateString: string; // YYYY-MM-DD
  sleepHours: number;
  sleepQuality: number; // 1-10
  energy: number; // 1-10
  mood: number; // 1-10
  mainGoal: string;
  priority1: string;
  priority2: string;
  priority3: string;
  createdAtMillis: number;
}

export interface EveningReview {
  id?: number;
  dateString: string; // YYYY-MM-DD
  activeTimeFormatted: string;
  workTimeFormatted: string;
  studyTimeFormatted: string;
  tasksCompletedText: string;
  wentWell: string;
  didntGoWell: string;
  learnedText: string;
  doDifferently: string;
  rating: number; // 1-10
  createdAtMillis: number;
}

export interface JournalEntry {
  id: number;
  title: string;
  content: string;
  tags: string;
  createdAtMillis: number;
  updatedAtMillis: number;
  category?: string;
  moodScore?: number;
}

export interface StudyCard {
  id: number;
  topic: string;
  question: string;
  answer: string;
  confidence: number; // 1 to 10
  lastReviewedMillis?: number | null;
  reviewCount: number;
  easeFactor: number;
}

export interface DoctorContact {
  id: string;
  name: string;
  specialty: string;
  clinicName: string;
  phone: string;
  emergencyPhone: string;
  email?: string;
  address?: string;
}

export interface Appointment {
  id: string;
  doctorId: string;
  doctorName: string;
  scheduledTimeMillis: number;
  scheduledDateString: string; // 'YYYY-MM-DD'
  scheduledTimeString: string; // '10:30'
  reason: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  createdAtMillis: number;
}

// Health & Medication Management Interfaces
export interface Medication {
  id: string;
  genericName: string;
  brandName: string;
  dosageStrength: number;
  dosageUnit: string; // mg, mcg, mL
  form: string; // tablet, capsule, sustained_release_tablet, liquid
  route: string; // oral, sublingual
  status: 'active' | 'historical' | 'discontinued';
  rxNormCui?: string;
  instructions: string;
  scheduleTimes: string[]; // ['08:00', '22:00']
  foodRelation?: 'before_meals' | 'with_meals' | 'after_meals' | 'empty_stomach' | 'no_restriction';
  createdAtMillis: number;
  prescribingDoctor?: string;
}

export type DoseStatus = 'SCHEDULED' | 'TAKEN' | 'TAKEN_LATE' | 'SKIPPED' | 'MISSED';

export interface DoseEvent {
  id: string;
  medicationId: string;
  medicationName: string;
  dosage: string;
  scheduledTime: string; // '08:00', '21:00'
  scheduledDateString: string; // 'YYYY-MM-DD'
  status: DoseStatus;
  actualTakenTimeMillis?: number | null;
  note?: string | null;
}

export interface RefillInventory {
  id: string;
  medicationId: string;
  medicationName: string;
  quantityRemaining: number;
  unit: string;
  dailyBurnRate: number;
  minimumThresholdDays: number;
  pharmacyName?: string;
  pharmacyPhone?: string;
  refillsRemaining: number;
  lastRefillDateString?: string;
  purchaseDateString?: string; // Date prescription was bought (e.g. '2026-08-01')
  daysSupplied?: number; // Days of medication supplied (e.g. 30, 60, 90)
  dosesPerDay?: number; // Times per day to take (e.g. 1, 2, 3)
  timingSlots?: ('Morning' | 'Afternoon' | 'Night')[]; // Slots e.g. ['Morning', 'Night']
}

export interface VitalSign {
  id: string;
  timestampMillis: number;
  systolicBp?: number | null;
  diastolicBp?: number | null;
  restingHeartRate?: number | null;
  weightKg?: number | null;
  dizzinessSeverity?: number | null; // 1-10
  sedationSeverity?: number | null; // 1-10
  symptoms?: string | null;
  note?: string | null;
}

export interface AIMessage {
  id: number;
  sender?: "USER" | "AI";
  isUser?: boolean;
  text: string;
  actionType?: "ADD_TASK" | "START_ACTIVITY" | "SAVE_NOTE" | "LOG_DOSE" | "LOG_SYMPTOM" | "BOOK_APPOINTMENT" | null;
  actionPayloadJson?: string | null;
  isActionConfirmed?: boolean | null;
  timestampMillis: number;
}

export type AiChatMessage = AIMessage;

export interface UserSettings {
  id: number;
  userName: string;
  aiProvider: string;
  aiModel: string;
  customApiKey: string;
  themeMode: "SYSTEM" | "DARK" | "LIGHT";
  morningNotificationEnabled: boolean;
  eveningNotificationEnabled: boolean;
  dailySummaryEnabled?: boolean;
  dailySummaryTime?: string; // e.g. "21:00"
  morningCheckInTime?: string; // e.g. "08:00"
  eveningReviewTime?: string; // e.g. "21:30"
  preferredModel?: string;
  officeStartTime?: string; // e.g. "13:00"
  officeEndTime?: string;   // e.g. "22:00"
  bedtime?: string;         // e.g. "00:00"
  wakeTime?: string;        // e.g. "07:30"
  isWorkday?: boolean;      // true for workday shift, false for week-off
  goals?: string[];         // User long-term goals
  onboardingCompleted?: boolean; // Has user completed the initial setup tour?
  autoUpdateOnCommit?: boolean;  // Automatically sync/update when git commits occur
  gitCommitVersion?: string;    // Current Git commit hash/timestamp version
}

export type TimetablePriority = "FIXED" | "HIGH" | "FLEXIBLE" | "OPTIONAL" | "RECOVERY";
export type TimetableStatus = "planned" | "in_progress" | "completed" | "skipped" | "delayed" | "rescheduled" | "deferred";

export interface AdaptiveTimetableBlock {
  id: string;
  start: string;            // "10:15"
  end: string;              // "10:30"
  duration_minutes: number;
  activity: string;
  category: Category | string;
  goal?: string;
  priority: TimetablePriority;
  reason?: string;
  status: TimetableStatus;
  isAiGenerated?: boolean;
}

export interface AdaptiveTimetableResponse {
  dateString: string;
  generatedAtTimeStr: string;
  explanation: string;
  blocks: AdaptiveTimetableBlock[];
}

export interface SearchResults {
  tasks: Task[];
  timeline: TimelineEntry[];
  captures: QuickCapture[];
  journal: JournalEntry[];
  studyCards: StudyCard[];
  medications?: Medication[];
}

export enum NavTab {
  TODAY = "TODAY",
  TIMELINE = "TIMELINE",
  TASKS = "TASKS",
  HEALTH = "HEALTH",
  LEARN = "LEARN",
  INSIGHTS = "INSIGHTS",
  AI = "AI",
  JOURNAL = "JOURNAL",
  SETTINGS = "SETTINGS",
}
