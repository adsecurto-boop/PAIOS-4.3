import {
  Task,
  ActivityLog,
  TimelineEntry,
  QuickCapture,
  MorningCheckIn,
  EveningReview,
  JournalEntry,
  StudyCard,
  AIMessage,
  UserSettings,
  SearchResults,
  Medication,
  DoseEvent,
  DoseStatus,
  RefillInventory,
  VitalSign,
  DoctorContact,
  Appointment,
  AdaptiveTimetableBlock,
  AdaptiveTimetableResponse,
  TimetableStatus,
} from './types';
import { ConflictResolver } from './core/sync/ConflictResolver';
import { OfflineSyncManager } from './core/sync/OfflineSyncManager';

const STORAGE_KEYS = {
  TASKS: 'paios_tasks_v1',
  ACTIVITIES: 'paios_activities_v1',
  ACTIVE_ACTIVITY: 'paios_active_activity_v1',
  TIMELINE: 'paios_timeline_v1',
  TIMETABLE: 'paios_timetable_v1',
  CAPTURES: 'paios_captures_v1',
  CHECKIN: 'paios_checkin_v1',
  REVIEW: 'paios_review_v1',
  JOURNAL: 'paios_journal_v1',
  STUDY_CARDS: 'paios_study_cards_v1',
  AI_MESSAGES: 'paios_ai_messages_v1',
  SETTINGS: 'paios_settings_v1',
  MEDICATIONS: 'paios_medications_v1',
  DOSE_EVENTS: 'paios_dose_events_v1',
  REFILLS: 'paios_refills_v1',
  VITALS: 'paios_vitals_v1',
  DOCTORS: 'paios_doctors_v1',
  APPOINTMENTS: 'paios_appointments_v1',
};

export function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getStartOfDayMillis(): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.getTime();
}

// Initial Sample Doctors & Clinicians
const initialDoctors: DoctorContact[] = [
  {
    id: 'doc_1',
    name: 'Dr Devendra Ratnani',
    specialty: 'Neuropsychiatry & Mind Care Specialist',
    clinicName: 'Ratnani Mind & Care Clinic',
    phone: '+91 98260 12345',
    emergencyPhone: '+91 98260 99999',
    email: 'dr.ratnani@ratnaniclinic.org',
    address: 'Suite 402, Medical Enclave, City Healthcare Center',
  },
  {
    id: 'doc_2',
    name: 'Dr. Robert Vance',
    specialty: 'Cardiology Specialist',
    clinicName: 'Vance Heart Institute',
    phone: '+1 (555) 392-1002',
    emergencyPhone: '+1 (555) 911-CARD',
    email: 'contact@vanceheart.com',
    address: 'Building B, Metro Hospital Complex',
  },
];

const initialAppointments: Appointment[] = [
  {
    id: 'apt_1',
    doctorId: 'doc_1',
    doctorName: 'Dr Devendra Ratnani',
    scheduledTimeMillis: Date.now() + 86400000 * 3, // 3 days from now
    scheduledDateString: getTodayDateString(),
    scheduledTimeString: '10:30',
    reason: 'Routine Medication Review & Adherence Check',
    status: 'SCHEDULED',
    notes: 'Bring 30-day vitals summary and refill status.',
    createdAtMillis: Date.now() - 86400000,
  },
];

// Initial Sample Medications (Clinical Standard Sample Regimen)
const initialMedications: Medication[] = [
  {
    id: 'med_1',
    genericName: 'Sertraline HCl',
    brandName: 'Zoloft',
    dosageStrength: 50,
    dosageUnit: 'mg',
    form: 'tablet',
    route: 'oral',
    status: 'active',
    rxNormCui: '312940',
    instructions: 'Take 1 tablet every morning with food.',
    scheduleTimes: ['08:00'],
    foodRelation: 'with_meals',
    createdAtMillis: Date.now() - 86400000 * 30,
    prescribingDoctor: 'Dr Devendra Ratnani',
  },
  {
    id: 'med_2',
    genericName: 'Propranolol HCl SR',
    brandName: 'Inderal LA',
    dosageStrength: 40,
    dosageUnit: 'mg',
    form: 'sustained_release_tablet',
    route: 'oral',
    status: 'active',
    rxNormCui: '854854',
    instructions: 'Take 1 sustained-release capsule every morning.',
    scheduleTimes: ['08:00'],
    foodRelation: 'no_restriction',
    createdAtMillis: Date.now() - 86400000 * 30,
    prescribingDoctor: 'Dr. Robert Vance',
  },
  {
    id: 'med_3',
    genericName: 'Clomipramine HCl',
    brandName: 'Anafranil',
    dosageStrength: 25,
    dosageUnit: 'mg',
    form: 'capsule',
    route: 'oral',
    status: 'active',
    rxNormCui: '197517',
    instructions: 'Take 1 capsule in the evening at 9:00 PM.',
    scheduleTimes: ['21:00'],
    foodRelation: 'after_meals',
    createdAtMillis: Date.now() - 86400000 * 20,
    prescribingDoctor: 'Dr Devendra Ratnani',
  },
  {
    id: 'med_4',
    genericName: 'Quetiapine',
    brandName: 'Seroquel',
    dosageStrength: 100,
    dosageUnit: 'mg',
    form: 'tablet',
    route: 'oral',
    status: 'active',
    rxNormCui: '284205',
    instructions: 'Take 1 tablet at bedtime (10:00 PM). May cause sedation.',
    scheduleTimes: ['22:00'],
    foodRelation: 'no_restriction',
    createdAtMillis: Date.now() - 86400000 * 45,
    prescribingDoctor: 'Dr Devendra Ratnani',
  },
  {
    id: 'med_5',
    genericName: 'Clonazepam',
    brandName: 'Klonopin',
    dosageStrength: 0.5,
    dosageUnit: 'mg',
    form: 'tablet',
    route: 'oral',
    status: 'active',
    rxNormCui: '197524',
    instructions: 'Take 1 tablet at bedtime (10:00 PM) as directed.',
    scheduleTimes: ['22:00'],
    foodRelation: 'no_restriction',
    createdAtMillis: Date.now() - 86400000 * 15,
    prescribingDoctor: 'Dr Devendra Ratnani',
  },
];

const initialRefills: RefillInventory[] = [
  {
    id: 'refill_1',
    medicationId: 'med_1',
    medicationName: 'Sertraline HCl 50 mg',
    quantityRemaining: 15,
    unit: 'tablets',
    dailyBurnRate: 1,
    minimumThresholdDays: 7,
    pharmacyName: 'CVS Pharmacy #4821',
    pharmacyPhone: '(555) 019-2831',
    refillsRemaining: 3,
    lastRefillDateString: '2026-08-01',
    purchaseDateString: '2026-08-01',
    daysSupplied: 30,
    dosesPerDay: 1,
    timingSlots: ['Morning'],
  },
  {
    id: 'refill_2',
    medicationId: 'med_2',
    medicationName: 'Propranolol HCl SR 40 mg',
    quantityRemaining: 38,
    unit: 'capsules',
    dailyBurnRate: 2,
    minimumThresholdDays: 7,
    pharmacyName: 'CVS Pharmacy #4821',
    pharmacyPhone: '(555) 019-2831',
    refillsRemaining: 2,
    lastRefillDateString: '2026-08-05',
    purchaseDateString: '2026-08-05',
    daysSupplied: 30,
    dosesPerDay: 2,
    timingSlots: ['Morning', 'Night'],
  },
  {
    id: 'refill_3',
    medicationId: 'med_3',
    medicationName: 'Clomipramine HCl 25 mg',
    quantityRemaining: 24,
    unit: 'capsules',
    dailyBurnRate: 1,
    minimumThresholdDays: 7,
    pharmacyName: 'CVS Pharmacy #4821',
    pharmacyPhone: '(555) 019-2831',
    refillsRemaining: 1,
    lastRefillDateString: '2026-08-10',
    purchaseDateString: '2026-08-10',
    daysSupplied: 30,
    dosesPerDay: 1,
    timingSlots: ['Night'],
  },
  {
    id: 'refill_4',
    medicationId: 'med_4',
    medicationName: 'Quetiapine 100 mg',
    quantityRemaining: 5, // Low stock warning
    unit: 'tablets',
    dailyBurnRate: 1,
    minimumThresholdDays: 7,
    pharmacyName: 'CVS Pharmacy #4821',
    pharmacyPhone: '(555) 019-2831',
    refillsRemaining: 1,
    lastRefillDateString: '2026-07-20',
    purchaseDateString: '2026-07-20',
    daysSupplied: 30,
    dosesPerDay: 1,
    timingSlots: ['Night'],
  },
  {
    id: 'refill_5',
    medicationId: 'med_5',
    medicationName: 'Clonazepam 0.5 mg',
    quantityRemaining: 13,
    unit: 'tablets',
    dailyBurnRate: 1,
    minimumThresholdDays: 7,
    pharmacyName: 'CVS Pharmacy #4821',
    pharmacyPhone: '(555) 019-2831',
    refillsRemaining: 2,
    lastRefillDateString: '2026-08-14',
    purchaseDateString: '2026-08-14',
    daysSupplied: 15,
    dosesPerDay: 1,
    timingSlots: ['Night'],
  },
];

const initialVitals: VitalSign[] = [
  {
    id: 'vital_1',
    timestampMillis: Date.now() - 3600000 * 4,
    systolicBp: 116,
    diastolicBp: 74,
    restingHeartRate: 66,
    weightKg: 72.5,
    dizzinessSeverity: 1,
    sedationSeverity: 2,
    symptoms: 'Mild morning grogginess upon waking.',
    note: 'Routine morning vital check.',
  },
];

// Initial Seeds
const initialSettings: UserSettings = {
  id: 1,
  userName: 'Alex',
  aiProvider: 'GEMINI',
  aiModel: 'gemini-3.6-flash',
  customApiKey: '',
  themeMode: 'DARK',
  morningNotificationEnabled: true,
  eveningNotificationEnabled: true,
  dailySummaryEnabled: true,
  dailySummaryTime: '21:00',
  morningCheckInTime: '08:00',
  eveningReviewTime: '21:30',
  officeStartTime: '13:00',
  officeEndTime: '22:00',
  bedtime: '00:00',
  wakeTime: '07:30',
  isWorkday: true,
  goals: [
    'Become an SDET / improve software testing career prospects',
    'Complete ISTQB certification/study',
    'Build and improve PAIOS',
    'Improve Playwright/Python automation skills where relevant',
  ],
};

const initialTasks: Task[] = [
  {
    id: 101,
    title: 'Complete PAIOS system testing & validation',
    description: 'Verify all modules including timers, timeline, study cards, and AI actions.',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    isPriorityPin: true,
    category: 'Testing',
    createdAtMillis: Date.now() - 3600000 * 5,
  },
  {
    id: 102,
    title: 'Review ISTQB certification flashcards',
    description: 'Focus on boundary value analysis and equivalence partitioning.',
    priority: 'NORMAL',
    status: 'TODO',
    isPriorityPin: true,
    category: 'Study',
    createdAtMillis: Date.now() - 3600000 * 4,
  },
  {
    id: 103,
    title: 'Prepare weekly status update for team',
    description: 'Highlight key milestones achieved in current sprint.',
    priority: 'NORMAL',
    status: 'TODO',
    isPriorityPin: true,
    category: 'Work',
    createdAtMillis: Date.now() - 3600000 * 3,
  },
  {
    id: 104,
    title: 'Morning 30-minute cardio session',
    description: 'Light jog and stretching.',
    priority: 'LOW',
    status: 'COMPLETED',
    isPriorityPin: false,
    category: 'Exercise',
    createdAtMillis: Date.now() - 3600000 * 8,
    completedAtMillis: Date.now() - 3600000 * 7,
  },
];

const initialTimeline: TimelineEntry[] = [
  {
    id: 201,
    title: 'Morning Check-In Completed',
    category: 'Personal',
    timestampMillis: getStartOfDayMillis() + 3600000 * 7,
    note: 'Goal: Master automated test patterns and deep focus',
    type: 'CHECKIN',
  },
  {
    id: 202,
    title: 'Deep Focus Coding Session',
    category: 'Coding',
    timestampMillis: getStartOfDayMillis() + 3600000 * 9,
    durationMinutes: 45,
    note: 'Implemented core state management and UI components',
    type: 'ACTIVITY',
  },
  {
    id: 203,
    title: 'Task Created: Review ISTQB certification flashcards',
    category: 'Study',
    timestampMillis: getStartOfDayMillis() + 3600000 * 10,
    type: 'TASK',
  },
  {
    id: 204,
    title: 'Note: Remember to test API timeout fallback handling',
    category: 'Testing',
    timestampMillis: getStartOfDayMillis() + 3600000 * 11,
    type: 'CAPTURE',
  },
];

const initialMorningCheckIn: MorningCheckIn = {
  dateString: getTodayDateString(),
  sleepHours: 7.5,
  sleepQuality: 8,
  energy: 8,
  mood: 8,
  mainGoal: 'Master automated test patterns and maintain deep focus throughout the day.',
  priority1: 'Complete PAIOS testing',
  priority2: 'Review ISTQB study cards',
  priority3: 'Prepare team update',
  createdAtMillis: getStartOfDayMillis() + 3600000 * 7,
};

const initialJournal: JournalEntry[] = [
  {
    id: 301,
    title: 'Building the Personal AI Operating System',
    content:
      'Today I brought PAIOS to life with automated time tracking, timeline logging, flashcard study drills, and intelligent AI prompt action execution. The key to high performance is lowering friction between thought and action.',
    tags: 'Productivity, AI, Systems',
    createdAtMillis: Date.now() - 86400000,
    updatedAtMillis: Date.now() - 86400000,
  },
];

const initialStudyCards: StudyCard[] = [
  {
    id: 401,
    topic: 'Software Testing',
    question: 'What is the key difference between Verification and Validation?',
    answer:
      "Verification checks if the product is built according to technical specifications ('Are we building the product right?'). Validation checks if the product meets customer needs and requirements ('Are we building the right product?').",
    confidence: 8,
    reviewCount: 4,
    easeFactor: 2.5,
    lastReviewedMillis: Date.now() - 3600000 * 12,
  },
  {
    id: 402,
    topic: 'Software Testing',
    question: 'What are the 7 Principles of Software Testing?',
    answer:
      '1. Testing shows presence of defects, not absence.\n2. Exhaustive testing is impossible.\n3. Early testing saves time and money.\n4. Defect clustering (80/20 rule).\n5. Pesticide paradox (tests must be regularly updated).\n6. Testing is context dependent.\n7. Absence-of-errors fallacy.',
    confidence: 7,
    reviewCount: 3,
    easeFactor: 2.4,
    lastReviewedMillis: Date.now() - 3600000 * 24,
  },
  {
    id: 403,
    topic: 'System Design',
    question: 'What is Idempotency in REST API Design?',
    answer:
      'An API operation is idempotent if executing it multiple times produces the exact same side-effects as executing it a single time (e.g., GET, PUT, DELETE operations).',
    confidence: 9,
    reviewCount: 6,
    easeFactor: 2.6,
    lastReviewedMillis: Date.now() - 3600000 * 6,
  },
];

const initialAiMessages: AIMessage[] = [
  {
    id: 501,
    sender: 'AI',
    text: "Hello Alex! I am PAIOS, your Personal AI Operating System. I have live access to your active timer, today's goals, timeline, and task board. Ask me anything or tell me to log an activity, save a note, or add a task!",
    timestampMillis: Date.now() - 3600000,
  },
];

// Local-First High Performance In-Memory Cache & Offline Sync Ledger
const memoryCache = new Map<string, { value: any; timestamp: number }>();
const PENDING_SYNC_KEY = 'paios_pending_sync_v1';

export interface PendingSyncMutation {
  id: string;
  key: string;
  timestamp: number;
  action: 'SAVE' | 'DELETE';
}

let isOnlineState = typeof navigator !== 'undefined' ? navigator.onLine : true;

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    isOnlineState = true;
    window.dispatchEvent(new CustomEvent('paios_network_status_change', { detail: { online: true } }));
  });
  window.addEventListener('offline', () => {
    isOnlineState = false;
    window.dispatchEvent(new CustomEvent('paios_network_status_change', { detail: { online: false } }));
  });
}

function load<T>(key: string, fallback: T): T {
  // 1. Try returning from instant in-memory cache
  const cached = memoryCache.get(key);
  if (cached !== undefined) {
    return cached.value as T;
  }

  // 2. Read from LocalStorage fallback
  try {
    if (typeof localStorage !== 'undefined') {
      const data = localStorage.getItem(key);
      if (data !== null && data !== undefined) {
        const parsed = JSON.parse(data);
        memoryCache.set(key, { value: parsed, timestamp: Date.now() });
        return parsed as T;
      }
    }
  } catch (e) {
    console.warn(`[PAIOSCache] Error loading key ${key} from localStorage:`, e);
  }

  // 3. Fallback to default initial state and cache it
  if (fallback !== null && fallback !== undefined) {
    memoryCache.set(key, { value: fallback, timestamp: Date.now() });
  }
  return fallback;
}

function getAuthToken(): string | null {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem('paios_auth_token');
  }
  return null;
}

function setAuthToken(token: string | null): void {
  if (typeof localStorage !== 'undefined') {
    if (token) {
      localStorage.setItem('paios_auth_token', token);
    } else {
      localStorage.removeItem('paios_auth_token');
    }
  }
}

function save<T>(key: string, value: T): void {
  const now = Date.now();
  let oldValue: any = null;

  if (memoryCache.has(key)) {
    oldValue = memoryCache.get(key)?.value ?? null;
  } else if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(key);
      if (raw) oldValue = JSON.parse(raw);
    } catch {}
  }

  // 1. Synchronously populate in-memory cache
  memoryCache.set(key, { value, timestamp: now });

  // 2. Persist to LocalStorage
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (e) {
    console.error(`[PAIOSCache] LocalStorage quota/write exception for key ${key}:`, e);
  }

  // 3. Queue offline mutation ledger if network is unstable/offline
  if (key !== PENDING_SYNC_KEY) {
    try {
      const queue = load<PendingSyncMutation[]>(PENDING_SYNC_KEY, []);
      const updatedQueue = queue.filter((q) => q.key !== key);
      updatedQueue.push({
        id: `mut_${key}_${now}`,
        key,
        timestamp: now,
        action: 'SAVE',
      });
      memoryCache.set(PENDING_SYNC_KEY, { value: updatedQueue, timestamp: now });
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(updatedQueue));
      }
    } catch (e) {}
  }

  // 4. Dispatch storage event for UI reactivity & listeners
  if (typeof window !== 'undefined') {
    const changeEvent = new CustomEvent('paios_storage_change', {
      detail: {
        key,
        value,
        oldValue,
        action: 'set',
        timestamp: now,
      },
    });
    window.dispatchEvent(changeEvent);
    window.dispatchEvent(new CustomEvent('paios_cache_updated', { detail: { key, timestamp: now } }));
  }

  // 5. Non-blocking background sync push if authenticated session exists
  if (ConflictResolver.isApplyingRemoteUpdate() || OfflineSyncManager.isRemoteLockActive()) {
    return;
  }

  if (typeof window !== 'undefined') {
    const token = getAuthToken();
    if (
      token &&
      key !== PENDING_SYNC_KEY &&
      key !== 'paios_offline_sync_queue' &&
      !key.startsWith('paios_auth_') &&
      !key.startsWith('paios_offline_') &&
      !key.startsWith('paios_pending_')
    ) {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        OfflineSyncManager.enqueueMutation(key, value, 'SAVE');
        return;
      }

      if (typeof fetch !== 'undefined') {
        fetch('/api/sync/push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            key,
            payload: value,
          }),
        }).catch((err) => {
          console.warn('[PAIOSStorage] Background sync push failed:', err);
          if (typeof navigator !== 'undefined' && !navigator.onLine) {
            OfflineSyncManager.enqueueMutation(key, value, 'SAVE');
          }
        });
      }
    }
  }
}

function remove(key: string): void {
  const existed = memoryCache.has(key) || (typeof localStorage !== 'undefined' && localStorage.getItem(key) !== null);
  memoryCache.delete(key);
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(key);
  }

  if (existed && typeof window !== 'undefined') {
    const changeEvent = new CustomEvent('paios_storage_change', {
      detail: {
        key,
        value: null,
        action: 'remove',
        timestamp: Date.now(),
      },
    });
    window.dispatchEvent(changeEvent);

    if (ConflictResolver.isApplyingRemoteUpdate() || OfflineSyncManager.isRemoteLockActive()) {
      return;
    }

    const token = getAuthToken();
    if (
      token &&
      key !== PENDING_SYNC_KEY &&
      key !== 'paios_offline_sync_queue' &&
      !key.startsWith('paios_auth_') &&
      !key.startsWith('paios_offline_') &&
      !key.startsWith('paios_pending_')
    ) {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        OfflineSyncManager.enqueueMutation(key, null, 'DELETE');
        return;
      }

      if (typeof fetch !== 'undefined') {
        fetch(`/api/sync/data?key=${encodeURIComponent(key)}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }).catch(() => {
          if (typeof navigator !== 'undefined' && !navigator.onLine) {
            OfflineSyncManager.enqueueMutation(key, null, 'DELETE');
          }
        });
      }
    }
  }
}

export interface PAIOSStorageAdapter {
  getItem<T = any>(key: string, fallback?: T): T | null;
  setItem<T = any>(key: string, value: T): void;
  removeItem(key: string): void;
  clear(): void;
  getAuthToken(): string | null;
  setAuthToken(token: string | null): void;
}

// Storage Manager Instance
export const storage = {
  // --- ADAPTER / LOW-LEVEL CRUD CONTRACT METHODS ---
  getItem<T = any>(key: string, fallback: T | null = null): T | null {
    return load(key, fallback);
  },
  setItem<T = any>(key: string, value: T): void {
    save(key, value);
  },
  removeItem(key: string): void {
    remove(key);
  },
  clear(): void {
    memoryCache.clear();
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('paios_storage_change', {
          detail: { key: '*', value: null, action: 'clear', timestamp: Date.now() },
        })
      );
    }
  },
  getAuthToken(): string | null {
    return getAuthToken();
  },
  setAuthToken(token: string | null): void {
    setAuthToken(token);
  },
  // --- SETTINGS ---
  getSettings(): UserSettings {
    return load(STORAGE_KEYS.SETTINGS, initialSettings);
  },
  saveSettings(settings: UserSettings): void {
    save(STORAGE_KEYS.SETTINGS, settings);
  },

  // --- TASKS ---
  getTasks(): Task[] {
    return load(STORAGE_KEYS.TASKS, initialTasks);
  },
  getTodayPriorities(): Task[] {
    return this.getTasks().filter((t) => t.isPriorityPin && t.status !== 'COMPLETED').slice(0, 3);
  },
  addTask(title: string, category: string = 'Work', isPriority: boolean = false, description: string = ''): Task {
    const tasks = this.getTasks();
    const newTask: Task = {
      id: Date.now(),
      title,
      description,
      priority: isPriority ? 'HIGH' : 'NORMAL',
      status: 'TODO',
      isPriorityPin: isPriority,
      category,
      createdAtMillis: Date.now(),
    };
    tasks.unshift(newTask);
    save(STORAGE_KEYS.TASKS, tasks);

    this.addTimelineEntry({
      title: `Task Created: ${title}`,
      category,
      timestampMillis: Date.now(),
      type: 'TASK',
    });

    return newTask;
  },
  updateTask(updated: Task): void {
    const tasks = this.getTasks().map((t) => (t.id === updated.id ? updated : t));
    save(STORAGE_KEYS.TASKS, tasks);
  },
  toggleTaskStatus(taskId: number): void {
    const tasks = this.getTasks().map((t) => {
      if (t.id === taskId) {
        const nextStatus = t.status === 'COMPLETED' ? ('TODO' as const) : ('COMPLETED' as const);
        return {
          ...t,
          status: nextStatus,
          completedAtMillis: nextStatus === 'COMPLETED' ? Date.now() : null,
        };
      }
      return t;
    });
    save(STORAGE_KEYS.TASKS, tasks);
  },
  toggleTaskPriorityPin(taskId: number): void {
    const tasks = this.getTasks().map((t) => (t.id === taskId ? { ...t, isPriorityPin: !t.isPriorityPin } : t));
    save(STORAGE_KEYS.TASKS, tasks);
  },
  deleteTask(taskId: number): void {
    const tasks = this.getTasks().filter((t) => t.id !== taskId);
    save(STORAGE_KEYS.TASKS, tasks);
  },

  // --- ACTIVITY TIMER ---
  getActiveActivity(): ActivityLog | null {
    return load<ActivityLog | null>(STORAGE_KEYS.ACTIVE_ACTIVITY, null);
  },
  startActivity(name: string, category: string = 'Work', note?: string | null): ActivityLog {
    const current = this.getActiveActivity();
    if (current) {
      this.finishActivity(current.id);
    }

    const newActivity: ActivityLog = {
      id: Date.now(),
      activityName: name,
      category,
      startTimeMillis: Date.now(),
      durationSeconds: 0,
      isRunning: true,
      isPaused: false,
      accumulatedPausedDurationSeconds: 0,
      note: note || null,
    };

    save(STORAGE_KEYS.ACTIVE_ACTIVITY, newActivity);
    return newActivity;
  },
  pauseActivity(activityId?: number): void {
    const active = this.getActiveActivity();
    if (active && (!activityId || String(active.id) === String(activityId)) && active.isRunning && !active.isPaused) {
      const updated: ActivityLog = {
        ...active,
        isPaused: true,
        pauseStartTimeMillis: Date.now(),
      };
      save(STORAGE_KEYS.ACTIVE_ACTIVITY, updated);
    }
  },
  resumeActivity(activityId?: number): void {
    const active = this.getActiveActivity();
    if (active && (!activityId || String(active.id) === String(activityId)) && active.isPaused) {
      const now = Date.now();
      const pauseStart = active.pauseStartTimeMillis || now;
      const extraPausedSecs = Math.max(0, Math.floor((now - pauseStart) / 1000));
      const updated: ActivityLog = {
        ...active,
        isPaused: false,
        pauseStartTimeMillis: null,
        accumulatedPausedDurationSeconds: (active.accumulatedPausedDurationSeconds || 0) + extraPausedSecs,
      };
      save(STORAGE_KEYS.ACTIVE_ACTIVITY, updated);
    }
  },
  discardActivity(activityId?: number): void {
    const active = this.getActiveActivity();
    if (active && (!activityId || String(active.id) === String(activityId))) {
      save(STORAGE_KEYS.ACTIVE_ACTIVITY, null);
    }
  },
  finishActivity(activityId?: number, finalNote?: string | null, completedTaskId?: number | null): void {
    const active = this.getActiveActivity();
    if (active && (!activityId || String(active.id) === String(activityId))) {
      const now = Date.now();
      let extraPausedSecs = 0;
      if (active.isPaused && active.pauseStartTimeMillis) {
        extraPausedSecs = Math.max(0, Math.floor((now - active.pauseStartTimeMillis) / 1000));
      }
      const totalPausedSecs = (active.accumulatedPausedDurationSeconds || 0) + extraPausedSecs;
      const grossDurationSecs = Math.max(0, Math.floor((now - active.startTimeMillis) / 1000));
      const netDurationSecs = Math.max(0, grossDurationSecs - totalPausedSecs);
      const durationMins = netDurationSecs >= 60 ? Math.round(netDurationSecs / 60) : (netDurationSecs >= 10 ? 1 : 0);

      const noteToSave = finalNote !== undefined ? finalNote : (active.note || null);

      const finishedActivity: ActivityLog = {
        ...active,
        endTimeMillis: now,
        durationSeconds: netDurationSecs,
        isRunning: false,
        isPaused: false,
        accumulatedPausedDurationSeconds: totalPausedSecs,
        note: noteToSave,
      };

      // 1. Save to history list
      const activities = load<ActivityLog[]>(STORAGE_KEYS.ACTIVITIES, []);
      activities.unshift(finishedActivity);
      save(STORAGE_KEYS.ACTIVITIES, activities);

      // 2. Mark linked task as completed if requested
      if (completedTaskId) {
        this.toggleTaskStatus(completedTaskId);
      }

      // 3. Clear active timer
      save(STORAGE_KEYS.ACTIVE_ACTIVITY, null);

      // 4. Add to Timeline
      this.addTimelineEntry({
        title: finishedActivity.activityName,
        category: finishedActivity.category,
        timestampMillis: finishedActivity.startTimeMillis,
        durationMinutes: durationMins,
        note: finishedActivity.note || undefined,
        type: 'ACTIVITY',
      });
    }
  },
  getActivities(): ActivityLog[] {
    return this.getAllActivities();
  },
  getAllActivities(): ActivityLog[] {
    return load(STORAGE_KEYS.ACTIVITIES, []);
  },

  // --- TIMELINE ---
  getAllTimeline(): TimelineEntry[] {
    return load(STORAGE_KEYS.TIMELINE, initialTimeline);
  },
  getTodayTimeline(): TimelineEntry[] {
    const startOfDay = getStartOfDayMillis();
    return this.getAllTimeline().filter((e) => e.timestampMillis >= startOfDay);
  },
  addTimelineEntry(entry: Omit<TimelineEntry, 'id'>): TimelineEntry {
    const timeline = this.getAllTimeline();
    const newEntry: TimelineEntry = {
      ...entry,
      id: Date.now() + Math.floor(Math.random() * 1000),
    };
    timeline.unshift(newEntry);
    save(STORAGE_KEYS.TIMELINE, timeline);
    return newEntry;
  },
  deleteTimelineEntry(id: number): void {
    const timeline = this.getAllTimeline().filter((e) => e.id !== id);
    save(STORAGE_KEYS.TIMELINE, timeline);
  },

  // --- QUICK CAPTURE ---
  getAllCaptures(): QuickCapture[] {
    return load(STORAGE_KEYS.CAPTURES, []);
  },
  getTodayCaptures(): QuickCapture[] {
    const startOfDay = getStartOfDayMillis();
    return this.getAllCaptures().filter((c) => c.createdAtMillis >= startOfDay);
  },
  addQuickCapture(text: string, category: string = 'Personal'): QuickCapture {
    const captures = this.getAllCaptures();
    const newCapture: QuickCapture = {
      id: Date.now(),
      text,
      category,
      tags: '',
      createdAtMillis: Date.now(),
    };
    captures.unshift(newCapture);
    save(STORAGE_KEYS.CAPTURES, captures);

    this.addTimelineEntry({
      title: `Note: ${text}`,
      category,
      timestampMillis: Date.now(),
      type: 'CAPTURE',
    });

    return newCapture;
  },
  addQuickCaptureNote(text: string, category: string = 'Personal'): QuickCapture {
    return this.addQuickCapture(text, category);
  },
  deleteQuickCapture(id: number): void {
    const captures = this.getAllCaptures().filter((c) => c.id !== id);
    save(STORAGE_KEYS.CAPTURES, captures);
  },

  // --- CHECK-IN & REVIEW ---
  getMorningCheckIn(): MorningCheckIn | null {
    const checkIns = load<Record<string, MorningCheckIn>>(STORAGE_KEYS.CHECKIN, {
      [getTodayDateString()]: initialMorningCheckIn,
    });
    return checkIns[getTodayDateString()] || null;
  },
  getCheckIns(): MorningCheckIn[] {
    const map = load<Record<string, MorningCheckIn>>(STORAGE_KEYS.CHECKIN, {
      [getTodayDateString()]: initialMorningCheckIn,
    });
    return Object.values(map);
  },
  saveMorningCheckIn(checkIn: MorningCheckIn): void {
    const checkIns = load<Record<string, MorningCheckIn>>(STORAGE_KEYS.CHECKIN, {});
    checkIns[checkIn.dateString] = checkIn;
    save(STORAGE_KEYS.CHECKIN, checkIns);

    this.addTimelineEntry({
      title: 'Morning Check-In Completed',
      category: 'Personal',
      timestampMillis: Date.now(),
      note: `Goal: ${checkIn.mainGoal}`,
      type: 'CHECKIN',
    });
  },
  saveCheckIn(checkIn: MorningCheckIn): void {
    this.saveMorningCheckIn(checkIn);
  },
  getEveningReview(): EveningReview | null {
    const reviews = load<Record<string, EveningReview>>(STORAGE_KEYS.REVIEW, {});
    return reviews[getTodayDateString()] || null;
  },
  getReviews(): EveningReview[] {
    const map = load<Record<string, EveningReview>>(STORAGE_KEYS.REVIEW, {});
    return Object.values(map);
  },
  saveEveningReview(review: EveningReview): void {
    const reviews = load<Record<string, EveningReview>>(STORAGE_KEYS.REVIEW, {});
    reviews[review.dateString] = review;
    save(STORAGE_KEYS.REVIEW, reviews);

    this.addTimelineEntry({
      title: `Evening Review Completed (Rating: ${review.rating}/10)`,
      category: 'Personal',
      timestampMillis: Date.now(),
      note: review.wentWell,
      type: 'CHECKIN',
    });
  },
  saveReview(review: EveningReview): void {
    this.saveEveningReview(review);
  },

  // --- JOURNAL ---
  getJournalEntries(): JournalEntry[] {
    return load(STORAGE_KEYS.JOURNAL, initialJournal);
  },
  addJournalEntry(title: string, content: string, moodScore: number = 5, category: string = 'Personal', tags: string = ''): JournalEntry {
    const journal = this.getJournalEntries();
    const newEntry: JournalEntry = {
      id: Date.now(),
      title,
      content,
      tags,
      category,
      moodScore,
      createdAtMillis: Date.now(),
      updatedAtMillis: Date.now(),
    };
    journal.unshift(newEntry);
    save(STORAGE_KEYS.JOURNAL, journal);

    this.addTimelineEntry({
      title: `Journal: ${title}`,
      category,
      timestampMillis: Date.now(),
      type: 'JOURNAL',
    });

    return newEntry;
  },
  deleteJournalEntry(id: number): void {
    const journal = this.getJournalEntries().filter((j) => j.id !== id);
    save(STORAGE_KEYS.JOURNAL, journal);
  },

  // --- STUDY ---
  getStudyCards(): StudyCard[] {
    return load(STORAGE_KEYS.STUDY_CARDS, initialStudyCards);
  },
  addStudyCard(topic: string, question: string, answer: string): StudyCard {
    const cards = this.getStudyCards();
    const newCard: StudyCard = {
      id: Date.now(),
      topic,
      question,
      answer,
      confidence: 5,
      reviewCount: 0,
      easeFactor: 2.5,
    };
    cards.unshift(newCard);
    save(STORAGE_KEYS.STUDY_CARDS, cards);
    return newCard;
  },
  reviewStudyCard(cardId: number, rating: 'AGAIN' | 'HARD' | 'GOOD' | 'EASY'): void {
    const cards = this.getStudyCards().map((card) => {
      if (card.id === cardId) {
        let confidence = 5;
        if (rating === 'AGAIN') confidence = 2;
        if (rating === 'HARD') confidence = 5;
        if (rating === 'GOOD') confidence = 8;
        if (rating === 'EASY') confidence = 10;
        return {
          ...card,
          confidence,
          reviewCount: card.reviewCount + 1,
          lastReviewedMillis: Date.now(),
        };
      }
      return card;
    });
    save(STORAGE_KEYS.STUDY_CARDS, cards);
  },
  deleteStudyCard(id: number): void {
    const cards = this.getStudyCards().filter((c) => c.id !== id);
    save(STORAGE_KEYS.STUDY_CARDS, cards);
  },

  // --- AI CHAT ---
  getAiMessages(): AIMessage[] {
    return load(STORAGE_KEYS.AI_MESSAGES, initialAiMessages);
  },
  addAiMessage(senderOrMsg: 'USER' | 'AI' | AIMessage, text?: string, actionType?: any, actionPayloadJson?: any): AIMessage {
    const messages = this.getAiMessages();
    let newMsg: AIMessage;

    if (typeof senderOrMsg === 'object') {
      newMsg = {
        ...senderOrMsg,
        id: senderOrMsg.id || Date.now(),
        sender: senderOrMsg.sender || (senderOrMsg.isUser ? 'USER' : 'AI'),
        isUser: senderOrMsg.isUser ?? senderOrMsg.sender === 'USER',
        timestampMillis: senderOrMsg.timestampMillis || Date.now(),
      };
    } else {
      newMsg = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        sender: senderOrMsg,
        isUser: senderOrMsg === 'USER',
        text: text || '',
        actionType,
        actionPayloadJson,
        isActionConfirmed: null,
        timestampMillis: Date.now(),
      };
    }

    messages.push(newMsg);
    save(STORAGE_KEYS.AI_MESSAGES, messages);
    return newMsg;
  },
  confirmAiAction(messageId: number, actionType: string, payloadJson: string): void {
    // Execute action
    try {
      const payload = JSON.parse(payloadJson);
      if (actionType === 'ADD_TASK' || payload.type === 'ADD_TASK') {
        this.addTask(payload.title || 'New AI Task', payload.category || 'Work', true);
      } else if (actionType === 'START_ACTIVITY' || payload.type === 'START_ACTIVITY') {
        this.startActivity(payload.name || 'AI Activity', payload.category || 'Work');
      } else if (actionType === 'SAVE_NOTE' || payload.type === 'SAVE_NOTE') {
        this.addQuickCapture(payload.text || 'AI Note');
      }
    } catch (e) {
      console.error('Failed to parse payloadJson:', e);
    }

    // Mark message action as confirmed
    const messages = this.getAiMessages().map((m) => (m.id === messageId ? { ...m, isActionConfirmed: true } : m));
    save(STORAGE_KEYS.AI_MESSAGES, messages);
  },
  clearAiChat(): void {
    save(STORAGE_KEYS.AI_MESSAGES, []);
  },

  // --- GLOBAL SEARCH & EXTRA STORAGE HELPERS ---
  getTimelineEntries(): TimelineEntry[] {
    return this.getAllTimeline();
  },
  searchAll(query: string): SearchResults {
    return this.globalSearch(query);
  },
  // --- HEALTH & MEDICATION MANAGEMENT ENGINE ---
  getMedications(): Medication[] {
    return load(STORAGE_KEYS.MEDICATIONS, initialMedications);
  },
  saveMedication(med: Medication): Medication {
    const list = this.getMedications();
    const idx = list.findIndex((m) => m.id === med.id);
    if (idx >= 0) {
      list[idx] = med;
    } else {
      list.unshift(med);
    }
    save(STORAGE_KEYS.MEDICATIONS, list);
    return med;
  },
  deleteMedication(id: string): void {
    const list = this.getMedications().filter((m) => m.id !== id);
    save(STORAGE_KEYS.MEDICATIONS, list);
  },
  getRefillInventories(): RefillInventory[] {
    return load(STORAGE_KEYS.REFILLS, initialRefills);
  },
  saveRefillInventory(refill: RefillInventory): RefillInventory {
    const refills = this.getRefillInventories();
    const idx = refills.findIndex((r) => r.id === refill.id);
    if (idx >= 0) {
      refills[idx] = refill;
    } else {
      refills.unshift(refill);
    }
    save(STORAGE_KEYS.REFILLS, refills);
    return refill;
  },
  deleteRefillInventory(id: string): void {
    const list = this.getRefillInventories().filter((r) => r.id !== id);
    save(STORAGE_KEYS.REFILLS, list);
  },
  updateRefillQuantity(id: string, deltaOrAbsolute: number, isAbsolute: boolean = false): RefillInventory | null {
    const refills = this.getRefillInventories();
    const item = refills.find((r) => r.id === id || r.medicationId === id);
    if (!item) return null;
    if (isAbsolute) {
      item.quantityRemaining = Math.max(0, deltaOrAbsolute);
    } else {
      item.quantityRemaining = Math.max(0, item.quantityRemaining + deltaOrAbsolute);
    }
    save(STORAGE_KEYS.REFILLS, refills);
    return item;
  },
  getDoctors(): DoctorContact[] {
    return load(STORAGE_KEYS.DOCTORS, initialDoctors);
  },
  saveDoctor(doc: DoctorContact): DoctorContact {
    const list = this.getDoctors();
    const idx = list.findIndex((d) => d.id === doc.id);
    if (idx >= 0) {
      list[idx] = doc;
    } else {
      list.unshift(doc);
    }
    save(STORAGE_KEYS.DOCTORS, list);
    return doc;
  },
  deleteDoctor(id: string): void {
    const list = this.getDoctors().filter((d) => d.id !== id);
    save(STORAGE_KEYS.DOCTORS, list);
  },
  getAppointments(): Appointment[] {
    return load(STORAGE_KEYS.APPOINTMENTS, initialAppointments);
  },
  bookAppointment(aptData: Omit<Appointment, 'id' | 'createdAtMillis'>): Appointment {
    const list = this.getAppointments();
    const newApt: Appointment = {
      ...aptData,
      id: `apt_${Date.now()}`,
      createdAtMillis: Date.now(),
    };
    list.unshift(newApt);
    save(STORAGE_KEYS.APPOINTMENTS, list);

    this.addTimelineEntry({
      title: `Appointment Booked with ${aptData.doctorName}`,
      category: 'Health',
      timestampMillis: Date.now(),
      note: `Scheduled for ${aptData.scheduledDateString} at ${aptData.scheduledTimeString} | Reason: ${aptData.reason}`,
      type: 'HEALTH',
    });

    return newApt;
  },
  updateAppointmentStatus(id: string, status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'): void {
    const list = this.getAppointments();
    const apt = list.find((a) => a.id === id);
    if (apt) {
      apt.status = status;
      save(STORAGE_KEYS.APPOINTMENTS, list);
    }
  },
  deleteAppointment(id: string): void {
    const list = this.getAppointments().filter((a) => a.id !== id);
    save(STORAGE_KEYS.APPOINTMENTS, list);
  },
  getVitalSigns(): VitalSign[] {
    return load(STORAGE_KEYS.VITALS, initialVitals);
  },
  logVitalSign(vital: Omit<VitalSign, 'id' | 'timestampMillis'>): VitalSign {
    const list = this.getVitalSigns();
    const newVital: VitalSign = {
      ...vital,
      id: `vital_${Date.now()}`,
      timestampMillis: Date.now(),
    };
    list.unshift(newVital);
    save(STORAGE_KEYS.VITALS, list);

    this.addTimelineEntry({
      title: `Vitals & Symptoms Logged ${vital.symptoms ? `(${vital.symptoms})` : ''}`,
      category: 'Health',
      timestampMillis: Date.now(),
      note: `BP: ${vital.systolicBp || '--'}/${vital.diastolicBp || '--'} mmHg | HR: ${vital.restingHeartRate || '--'} bpm ${vital.dizzinessSeverity ? `| Dizziness: ${vital.dizzinessSeverity}/10` : ''}`,
      type: 'VITAL',
    });

    return newVital;
  },
  getDoseEvents(dateStr?: string): DoseEvent[] {
    const date = dateStr || getTodayDateString();
    const allEvents: Record<string, DoseEvent[]> = load(STORAGE_KEYS.DOSE_EVENTS, {});
    
    if (!allEvents[date]) {
      // Auto-generate dose events for active medications for this date
      const meds = this.getMedications().filter((m) => m.status === 'active');
      const generated: DoseEvent[] = [];
      meds.forEach((m) => {
        m.scheduleTimes.forEach((time) => {
          generated.push({
            id: `dose_${m.id}_${date}_${time.replace(':', '')}`,
            medicationId: m.id,
            medicationName: `${m.genericName} ${m.dosageStrength}${m.dosageUnit}`,
            dosage: `${m.dosageStrength} ${m.dosageUnit}`,
            scheduledTime: time,
            scheduledDateString: date,
            status: 'SCHEDULED',
            actualTakenTimeMillis: null,
            note: null,
          });
        });
      });
      allEvents[date] = generated;
      save(STORAGE_KEYS.DOSE_EVENTS, allEvents);
    }

    return allEvents[date] || [];
  },
  logDoseEvent(doseId: string, status: DoseStatus, note?: string): DoseEvent | null {
    const date = getTodayDateString();
    const allEvents: Record<string, DoseEvent[]> = load(STORAGE_KEYS.DOSE_EVENTS, {});
    const todayEvents = allEvents[date] || this.getDoseEvents(date);
    
    const dose = todayEvents.find((d) => d.id === doseId);
    if (!dose) return null;

    dose.status = status;
    dose.actualTakenTimeMillis = Date.now();
    if (note) dose.note = note;

    allEvents[date] = todayEvents;
    save(STORAGE_KEYS.DOSE_EVENTS, allEvents);

    // Update refill count if dose taken
    if (status === 'TAKEN' || status === 'TAKEN_LATE') {
      this.updateRefillQuantity(dose.medicationId, -1, false);
    }

    // Add to timeline ledger
    this.addTimelineEntry({
      title: `Medication Dose: ${dose.medicationName} marked ${status}`,
      category: 'Health',
      timestampMillis: Date.now(),
      note: `Scheduled for ${dose.scheduledTime} | Status: ${status} ${note ? `| Note: ${note}` : ''}`,
      type: 'DOSE',
    });

    return dose;
  },

  globalSearch(query: string): SearchResults {
    if (!query.trim()) {
      return { tasks: [], timeline: [], captures: [], journal: [], studyCards: [], medications: [] };
    }
    const q = query.toLowerCase();
    return {
      tasks: this.getTasks().filter((t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)),
      timeline: this.getAllTimeline().filter((tl) => tl.title.toLowerCase().includes(q) || (tl.note && tl.note.toLowerCase().includes(q))),
      captures: this.getAllCaptures().filter((c) => c.text.toLowerCase().includes(q)),
      journal: this.getJournalEntries().filter((j) => j.title.toLowerCase().includes(q) || j.content.toLowerCase().includes(q)),
      studyCards: this.getStudyCards().filter(
        (s) => s.topic.toLowerCase().includes(q) || s.question.toLowerCase().includes(q) || s.answer.toLowerCase().includes(q)
      ),
      medications: this.getMedications().filter(
        (m) => m.genericName.toLowerCase().includes(q) || m.brandName.toLowerCase().includes(q) || m.instructions.toLowerCase().includes(q)
      ),
    };
  },
  updateSettings(updated: Partial<UserSettings>): UserSettings {
    const current = this.getSettings();
    const merged = { ...current, ...updated };
    this.saveSettings(merged);
    return merged;
  },
  seedSampleData(): void {
    save(STORAGE_KEYS.TASKS, initialTasks);
    save(STORAGE_KEYS.TIMELINE, initialTimeline);
    save(STORAGE_KEYS.CAPTURES, []);
    save(STORAGE_KEYS.CHECKIN, { [initialMorningCheckIn.dateString]: initialMorningCheckIn });
    save(STORAGE_KEYS.JOURNAL, initialJournal);
    save(STORAGE_KEYS.STUDY_CARDS, initialStudyCards);
    save(STORAGE_KEYS.AI_MESSAGES, initialAiMessages);
    save(STORAGE_KEYS.SETTINGS, initialSettings);
    save(STORAGE_KEYS.MEDICATIONS, initialMedications);
    save(STORAGE_KEYS.REFILLS, initialRefills);
    save(STORAGE_KEYS.VITALS, initialVitals);
    save(STORAGE_KEYS.DOCTORS, initialDoctors);
    save(STORAGE_KEYS.APPOINTMENTS, initialAppointments);
    save(STORAGE_KEYS.DOSE_EVENTS, {});
  },
  clearAllData(): void {
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
  },
  exportBackupJson(): string {
    const backup: Record<string, any> = {};
    Object.entries(STORAGE_KEYS).forEach(([key, storageKey]) => {
      backup[key] = load(storageKey, null);
    });
    return JSON.stringify(backup, null, 2);
  },
  // Adaptive Timetable Vault Methods
  getAdaptiveTimetable(): AdaptiveTimetableResponse | null {
    return load(STORAGE_KEYS.TIMETABLE, null);
  },
  saveAdaptiveTimetable(timetable: AdaptiveTimetableResponse): void {
    save(STORAGE_KEYS.TIMETABLE, timetable);
  },
  updateTimetableBlockStatus(blockId: string, status: TimetableStatus): void {
    const current = this.getAdaptiveTimetable();
    if (!current) return;
    const targetBlock = current.blocks.find((b) => b.id === blockId);
    if (!targetBlock) return;

    targetBlock.status = status;
    save(STORAGE_KEYS.TIMETABLE, current);

    // If block completed, record an immutable log into TimelineEntry ledger
    if (status === 'completed') {
      this.addTimelineEntry({
        title: `Completed Timetable Task: ${targetBlock.activity}`,
        category: targetBlock.category || 'Work',
        timestampMillis: Date.now(),
        durationMinutes: targetBlock.duration_minutes,
        note: `Scheduled ${targetBlock.start} - ${targetBlock.end} | Priority: ${targetBlock.priority} ${targetBlock.goal ? `| Goal: ${targetBlock.goal}` : ''}`,
        type: 'ACTIVITY',
      });
    }
  },
  deleteTimetableBlock(blockId: string): void {
    const current = this.getAdaptiveTimetable();
    if (!current) return;
    current.blocks = current.blocks.filter((b) => b.id !== blockId);
    save(STORAGE_KEYS.TIMETABLE, current);
  },
  getUserContextString(): string {
    const now = new Date();
    const active = this.getActiveActivity();
    const tasks = this.getTasks();
    const timeline = this.getAllTimeline().slice(0, 10);
    const todayDateStr = getTodayDateString();
    const todayCheckIn = this.getMorningCheckIn();
    const todayReview = this.getEveningReview();
    const captures = this.getAllCaptures().slice(0, 5);
    const journal = this.getJournalEntries().slice(0, 3);
    const settings = this.getSettings();
    const timetable = this.getAdaptiveTimetable();
    
    // Health Context Data
    const medications = this.getMedications().filter((m) => m.status === 'active');
    const doseEvents = this.getDoseEvents(todayDateStr);
    const refills = this.getRefillInventories();
    const vitals = this.getVitalSigns().slice(0, 3);
    const doctors = this.getDoctors();
    const appointments = this.getAppointments().filter((a) => a.status === 'SCHEDULED');

    const lowSupplyRefills = refills.filter((r) => r.quantityRemaining / (r.dailyBurnRate || 1) <= r.minimumThresholdDays);

    const formatTime = (ms?: number | null) => {
      if (!ms) return 'N/A';
      const d = new Date(ms);
      return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    };

    return `
CURRENT LOCAL TIME & DATE METADATA:
- Current Date: ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} (${todayDateStr})
- Current Local Time: ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
- Day Mode: ${settings.isWorkday !== false ? 'WORKDAY' : 'WEEK-OFF / REST & STUDY DAY'}
- Configured Office Shift: ${settings.officeStartTime || '13:00'} - ${settings.officeEndTime || '22:00'}
- Bedtime Target: ${settings.bedtime || '00:00'} | Wake Time: ${settings.wakeTime || '07:30'}

USER LONG-TERM GOALS:
${(settings.goals || []).map((g, i) => `${i + 1}. ${g}`).join('\n') || '1. Become an SDET / software testing career\n2. Complete ISTQB certification\n3. Build and improve PAIOS\n4. Master Playwright & Python automation'}

ACTIVE SESSION / ACTIVITY:
${active ? `- Currently Active: "${active.activityName}" [Category: ${active.category}] | Started At: ${formatTime(active.startTimeMillis)} | Running Duration: ${Math.floor((now.getTime() - active.startTimeMillis) / 60000)} minutes` : '- No active session currently running.'}

CURRENT ADAPTIVE TIMETABLE (${timetable ? timetable.dateString : 'None generated'}):
${timetable && timetable.blocks.length > 0 ? timetable.blocks.map((b) => `  * [${b.start}–${b.end}] ${b.activity} (${b.category}) | Priority: ${b.priority} | Status: ${b.status} ${b.goal ? `| Goal: ${b.goal}` : ''}`).join('\n') : '  * No AI timetable generated for today yet.'}

HEALTH & CLINICIAN CONTEXT:
- Prescribing Doctors & Clinicians:
${doctors.map((d) => `  * ${d.name} (${d.specialty} - ${d.clinicName}) | Phone: ${d.phone} | Emergency Direct: ${d.emergencyPhone}`).join('\n') || '  * No doctor contacts saved.'}

- Upcoming Scheduled Appointments:
${appointments.map((a) => `  * [${a.scheduledDateString} at ${a.scheduledTimeString}] with ${a.doctorName} | Reason: ${a.reason}`).join('\n') || '  * No upcoming appointments.'}

HEALTH & MEDICATION REGIMEN STATUS (TODAY: ${todayDateStr}):
- Active Medications (${medications.length}):
${medications.map((m) => `  * ${m.genericName} (${m.brandName}) ${m.dosageStrength}${m.dosageUnit} [RxNorm CUI: ${m.rxNormCui || 'N/A'}] - Schedule: ${m.scheduleTimes.join(', ')} (${m.instructions})`).join('\n') || '  * No active medications.'}

- Today's Dose Ledger (${todayDateStr}):
${doseEvents.map((d) => `  * [${d.scheduledTime}] ${d.medicationName} -> Status: ${d.status} ${d.actualTakenTimeMillis ? `(Logged at ${formatTime(d.actualTakenTimeMillis)})` : ''}`).join('\n') || '  * No dose events generated yet.'}

- Refill Vault Inventory Warnings:
${lowSupplyRefills.map((r) => `  ⚠️ LOW SUPPLY ALERT: ${r.medicationName} has only ${r.quantityRemaining} ${r.unit} remaining (${r.quantityRemaining / (r.dailyBurnRate || 1)} days supply left). Threshold: ${r.minimumThresholdDays} days. Contact ${r.pharmacyName || 'Pharmacy'} ${r.pharmacyPhone ? `(${r.pharmacyPhone})` : ''}`).join('\n') || '  * All medication inventories are adequately supplied.'}

- Latest Vitals & Symptom Telemetry:
${vitals.map((v) => `  * [${formatTime(v.timestampMillis)}] BP: ${v.systolicBp || '--'}/${v.diastolicBp || '--'} mmHg | HR: ${v.restingHeartRate || '--'} bpm ${v.dizzinessSeverity ? `| Dizziness: ${v.dizzinessSeverity}/10` : ''} ${v.symptoms ? `| Symptoms: "${v.symptoms}"` : ''}`).join('\n') || '  * No vitals logged recently.'}

TODAY'S MORNING CHECK-IN (${todayDateStr}):
${todayCheckIn ? `- Goal: "${todayCheckIn.mainGoal}" | Top Priority: "${todayCheckIn.priority1}" | Energy Level: ${todayCheckIn.energy}/10 | Mood: ${todayCheckIn.mood}/10 | Logged At: ${formatTime(todayCheckIn.createdAtMillis)}` : '- Morning Check-in not yet recorded for today.'}

TODAY'S EVENING REVIEW (${todayDateStr}):
${todayReview ? `- Rating: ${todayReview.rating}/10 | What Went Well: "${todayReview.wentWell}" | What Didn't Go Well: "${todayReview.didntGoWell}" | Learned: "${todayReview.learnedText}" | Logged At: ${formatTime(todayReview.createdAtMillis)}` : '- Evening Review not yet recorded for today.'}

PENDING & IN-PROGRESS TASKS:
${tasks.filter((t) => t.status !== 'COMPLETED').map((t) => `- [${t.priority}] "${t.title}" (${t.category}) | Status: ${t.status} ${t.safetyWarning ? `⚠️ [${t.safetyWarning}]` : ''} | Created At: ${formatTime(t.createdAtMillis)}`).join('\n') || '- No pending tasks.'}

RECENTLY COMPLETED TASKS:
${tasks.filter((t) => t.status === 'COMPLETED').slice(0, 5).map((t) => `- "${t.title}" (${t.category}) | Completed At: ${formatTime(t.completedAtMillis)}`).join('\n') || '- No completed tasks recorded.'}

RECENT TIMELINE & ACTIVITY LOGS (Most Recent First):
${timeline.map((t) => `- [${formatTime(t.timestampMillis)}] ${t.title} (${t.category}) ${t.durationMinutes ? `| Duration: ${t.durationMinutes}m` : ''} ${t.note ? `| Note: ${t.note}` : ''}`).join('\n') || '- No timeline entries.'}

RECENT QUICK CAPTURES / NOTES:
${captures.map((c) => `- [${formatTime(c.createdAtMillis)}] "${c.text}"`).join('\n') || '- No quick captures.'}

RECENT JOURNAL ENTRIES:
${journal.map((j) => `- [${formatTime(j.createdAtMillis)}] "${j.title}" (Mood Score: ${j.moodScore || 5}/10) | Preview: "${j.content.slice(0, 80)}..."`).join('\n') || '- No journal entries.'}
    `.trim();
  },

  // --- LOCAL-FIRST CACHE & OFFLINE ENGINE HELPERS ---
  isOnline(): boolean {
    return isOnlineState;
  },
  getPendingSyncQueue(): PendingSyncMutation[] {
    return load<PendingSyncMutation[]>(PENDING_SYNC_KEY, []);
  },
  getPendingSyncCount(): number {
    return this.getPendingSyncQueue().length;
  },
  clearPendingSyncQueue(): void {
    save(PENDING_SYNC_KEY, []);
  },
  getCacheUsageKB(): number {
    try {
      let totalBytes = 0;
      memoryCache.forEach((entry) => {
        totalBytes += JSON.stringify(entry.value).length * 2;
      });
      return Math.round(totalBytes / 1024);
    } catch (e) {
      return 0;
    }
  },
  invalidateCacheKey(key: string): void {
    memoryCache.delete(key);
  },
  clearMemoryCache(): void {
    memoryCache.clear();
  },
};

export const PAIOSStorage = storage;
