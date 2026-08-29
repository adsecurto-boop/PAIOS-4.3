import React, { useState, useEffect } from 'react';
import {
  Sun,
  History,
  CheckCircle2,
  Brain,
  BarChart3,
  Cpu,
  BookOpen,
  Settings,
  Plus,
  Play,
  Zap,
} from 'lucide-react';
import { NavTab, ActivityLog, Task, TimelineEntry, StudyCard, JournalEntry, MorningCheckIn, EveningReview, AiChatMessage, UserSettings, SearchResults, Medication, DoseEvent, DoseStatus, RefillInventory, VitalSign, DoctorContact, Appointment, AdaptiveTimetableResponse, TimetableStatus } from './types';
import { PAIOSStorage, getTodayDateString, getStartOfDayMillis } from './storage';
import { TopHeaderBar } from './components/TopHeaderBar';
import { MiniTimerPlayer } from './components/MiniTimerPlayer';
import { StartActivityModal } from './components/StartActivityModal';
import { FinishActivityModal } from './components/FinishActivityModal';
import { QuickCaptureModal } from './components/QuickCaptureModal';
import { CheckInModal } from './components/CheckInModal';
import { ReviewModal } from './components/ReviewModal';
import { TaskModal } from './components/TaskModal';
import { StudyCardModal } from './components/StudyCardModal';
import { SearchModal } from './components/SearchModal';
import { AuthModal } from './components/AuthModal';

import { NotificationCenterModal } from './components/NotificationCenterModal';
import { SetupWizardModal } from './components/SetupWizardModal';
import { UpdatePromptModal } from './components/UpdatePromptModal';
import { dispatchNotification } from './utils/notifications';
import { initBackgroundVersionChecker, onVersionUpdateAvailable, VersionManifest } from './utils/versionCheck';

import { TodayScreen } from './screens/TodayScreen';
import { TimelineScreen } from './screens/TimelineScreen';
import { TasksScreen } from './screens/TasksScreen';
import { HealthScreen } from './screens/HealthScreen';
import { LearnScreen } from './screens/LearnScreen';
import { InsightsScreen } from './screens/InsightsScreen';
import { AiScreen } from './screens/AiScreen';
import { JournalScreen } from './screens/JournalScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { AuthScreen } from './screens/AuthScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';

import { onAuthChange, listenToCloudData, logOut, PaiosUser } from './firebase';
import { sendClientGeminiChat, sendClientGeminiTimetable } from './geminiClient';
import { exportAndShareBackup } from './utils/exportShare';
import { OfflineSyncManager } from './core/sync/OfflineSyncManager';

import { WindowsTitleBar } from './components/WindowsTitleBar';
import { WindowsTaskBar } from './components/WindowsTaskBar';
import { DesktopAppExportModal } from './components/DesktopAppExportModal';
import { MobileBottomNav } from './components/MobileBottomNav';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>(NavTab.TODAY);

  // Auth & Session State
  const [currentUser, setCurrentUser] = useState<PaiosUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);

  // Onboarding Flow State
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem('paios_onboarding_completed') === 'true';
      }
    } catch {}
    return false;
  });

  // Desktop Window Controls State
  const [isMaximized, setIsMaximized] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Storage State
  const [activeActivity, setActiveActivity] = useState<ActivityLog | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timelineEntries, setTimelineEntries] = useState<TimelineEntry[]>([]);
  const [studyCards, setStudyCards] = useState<StudyCard[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [checkIns, setCheckIns] = useState<MorningCheckIn[]>([]);
  const [reviews, setReviews] = useState<EveningReview[]>([]);
  const [aiMessages, setAiMessages] = useState<AiChatMessage[]>([]);
  const [settings, setSettings] = useState<UserSettings>(PAIOSStorage.getSettings());
  const [timetable, setTimetable] = useState<AdaptiveTimetableResponse | null>(PAIOSStorage.getAdaptiveTimetable());
  const [isGeneratingTimetable, setIsGeneratingTimetable] = useState(false);

  // Health State
  const [medications, setMedications] = useState<Medication[]>([]);
  const [doseEvents, setDoseEvents] = useState<DoseEvent[]>([]);
  const [refillInventories, setRefillInventories] = useState<RefillInventory[]>([]);
  const [vitalSigns, setVitalSigns] = useState<VitalSign[]>([]);
  const [doctors, setDoctors] = useState<DoctorContact[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  // Search
  const [searchResults, setSearchResults] = useState<SearchResults>({
    tasks: [],
    timeline: [],
    captures: [],
    journal: [],
    studyCards: [],
    medications: [],
  });

  // Modals
  const [showStartActivityModal, setShowStartActivityModal] = useState(false);
  const [showFinishActivityModal, setShowFinishActivityModal] = useState(false);
  const [showQuickCaptureModal, setShowQuickCaptureModal] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showStudyCardModal, setShowStudyCardModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showSetupWizardModal, setShowSetupWizardModal] = useState(false);
  const [showUpdatePromptModal, setShowUpdatePromptModal] = useState(false);
  const [latestServerManifest, setLatestServerManifest] = useState<VersionManifest | null>(null);

  // Live Timer State for MiniTimerPlayer
  const [elapsedTimerSeconds, setElapsedTimerSeconds] = useState(0);

  // Reload state helper
  const reloadState = () => {
    setActiveActivity(PAIOSStorage.getActiveActivity());
    setActivityLogs(PAIOSStorage.getActivities());
    setTasks(PAIOSStorage.getTasks());
    setTimelineEntries(PAIOSStorage.getTimelineEntries());
    setStudyCards(PAIOSStorage.getStudyCards());
    setJournalEntries(PAIOSStorage.getJournalEntries());
    setCheckIns(PAIOSStorage.getCheckIns());
    setReviews(PAIOSStorage.getReviews());
    setAiMessages(PAIOSStorage.getAiMessages());
    setSettings(PAIOSStorage.getSettings());
    setMedications(PAIOSStorage.getMedications());
    setDoseEvents(PAIOSStorage.getDoseEvents());
    setRefillInventories(PAIOSStorage.getRefillInventories());
    setVitalSigns(PAIOSStorage.getVitalSigns());
    setDoctors(PAIOSStorage.getDoctors());
    setAppointments(PAIOSStorage.getAppointments());
    setTimetable(PAIOSStorage.getAdaptiveTimetable());
  };

  useEffect(() => {
    reloadState();
    const handleStorageChange = () => {
      reloadState();
    };
    window.addEventListener('paios_storage_change', handleStorageChange);

    // Bootstrap OfflineSyncManager Reconnection Listeners & Service Worker
    OfflineSyncManager.init();
    initBackgroundVersionChecker();
    const unsubscribeUpdate = onVersionUpdateAvailable((manifest) => {
      setLatestServerManifest(manifest);
      setShowUpdatePromptModal(true);
    });

    return () => {
      window.removeEventListener('paios_storage_change', handleStorageChange);
      unsubscribeUpdate();
    };
  }, []);

  // Automated Schedule, Medication, Check-In & Daily Summary Notification Ticker (Every 60s)
  useEffect(() => {
    const firedNotifs = new Set<string>();

    const checkScheduledNotifs = () => {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const dateStr = getTodayDateString();

      // 1. Medication Schedule Check
      medications.forEach((med) => {
        if (med.status === 'active' && med.scheduleTimes?.includes(timeStr)) {
          const key = `med_${med.id}_${dateStr}_${timeStr}`;
          if (!firedNotifs.has(key)) {
            firedNotifs.add(key);
            dispatchNotification(
              `Medication Dose Due: ${med.brandName || med.genericName}`,
              `Time to take ${med.dosageStrength}${med.dosageUnit} (${med.instructions || 'Scheduled Dose'}).`,
              'MEDICATION'
            );
          }
        }
      });

      // 2. Scheduled AI Timetable Blocks & Timeline Reminders
      if (timetable && timetable.blocks) {
        timetable.blocks.forEach((block) => {
          if (block.start === timeStr && block.status !== 'completed') {
            const key = `block_${block.id}_${dateStr}_${timeStr}`;
            if (!firedNotifs.has(key)) {
              firedNotifs.add(key);
              dispatchNotification(
                `AI Schedule Reminder: ${block.activity}`,
                `Scheduled block (${block.category}) starting now (${block.start} - ${block.end}). ${block.goal ? 'Goal: ' + block.goal : ''}`,
                'SCHEDULE'
              );
            }
          }
        });
      }

      // 3. Morning Check-In Reminder
      const morningTargetTime = settings.morningCheckInTime || settings.wakeTime || '08:00';
      if (settings.morningNotificationEnabled !== false && timeStr === morningTargetTime) {
        const key = `checkin_morn_${dateStr}_${timeStr}`;
        const hasCheckedIn = checkIns.some((c) => c.dateString === dateStr);
        if (!firedNotifs.has(key) && !hasCheckedIn) {
          firedNotifs.add(key);
          dispatchNotification(
            `Morning Check-In Reminder`,
            `Good morning ${settings.userName || 'Alex'}! Set your top 3 goals, sleep score, and mindset for today.`,
            'CHECKIN'
          );
        }
      }

      // 4. Evening Review Reminder
      const eveningTargetTime = settings.eveningReviewTime || settings.bedtime || '21:30';
      if (settings.eveningNotificationEnabled !== false && timeStr === eveningTargetTime) {
        const key = `review_eve_${dateStr}_${timeStr}`;
        const hasReviewed = reviews.some((r) => r.dateString === dateStr);
        if (!firedNotifs.has(key) && !hasReviewed) {
          firedNotifs.add(key);
          dispatchNotification(
            `Evening Reflection & Review`,
            `Time for your daily review! Log what went well, blockers, and rate your overall day.`,
            'CHECKIN'
          );
        }
      }

      // 5. Daily Insights Top-Performance Summary Notification
      const summaryTime = settings.dailySummaryTime || '21:00';
      if (settings.dailySummaryEnabled !== false && timeStr === summaryTime) {
        const key = `daily_summary_${dateStr}_${timeStr}`;
        if (!firedNotifs.has(key)) {
          firedNotifs.add(key);

          // Calculate today's top performing categories
          const startOfToday = getStartOfDayMillis();
          const catSeconds: Record<string, number> = {};
          let totalSec = 0;

          const currentActivities = PAIOSStorage.getActivities();
          currentActivities.forEach((act) => {
            if (act.startTimeMillis >= startOfToday) {
              const sec = act.durationSeconds || 0;
              if (sec > 0) {
                const cat = act.category || 'Work';
                catSeconds[cat] = (catSeconds[cat] || 0) + sec;
                totalSec += sec;
              }
            }
          });

          const currentTimeline = PAIOSStorage.getTimelineEntries();
          currentTimeline.forEach((e) => {
            if (e.timestampMillis >= startOfToday && e.durationMinutes) {
              const sec = e.durationMinutes * 60;
              const cat = e.category || 'Work';
              catSeconds[cat] = (catSeconds[cat] || 0) + sec;
              totalSec += sec;
            }
          });

          const sortedCats = Object.entries(catSeconds)
            .map(([cat, sec]) => ({ cat, hrs: (sec / 3600).toFixed(1) }))
            .sort((a, b) => parseFloat(b.hrs) - parseFloat(a.hrs));

          const totalHrs = (totalSec / 3600).toFixed(1);
          let summaryMsg = `Total Focus Today: ${totalHrs} hrs.`;

          if (sortedCats.length > 0) {
            const topStr = sortedCats
              .slice(0, 2)
              .map((c) => `${c.cat} (${c.hrs}h)`)
              .join(', ');
            summaryMsg = `Today's Top Focus: ${topStr} | Total: ${totalHrs} hrs logged. Tap to view detailed insights!`;
          } else {
            summaryMsg = `No focus sessions logged today yet. Great time to complete your evening review!`;
          }

          dispatchNotification(
            `Daily Focus & Performance Summary`,
            summaryMsg,
            'SYSTEM'
          );
        }
      }
    };

    const notifInterval = setInterval(checkScheduledNotifs, 60000);
    checkScheduledNotifs();
    return () => clearInterval(notifInterval);
  }, [medications, timetable, settings, checkIns, reviews]);

  // Firebase Auth Session Listener & Realtime Cloud Sync
  useEffect(() => {
    let cloudUnsub: (() => void) | null = null;
    const cleanupOfflineSync = OfflineSyncManager.init(() => PAIOSStorage.getAuthToken());

    const unsubAuth = onAuthChange((user) => {
      if (user) {
        setCurrentUser(user);
        if (cloudUnsub) cloudUnsub();
        cloudUnsub = listenToCloudData(user.uid, () => {
          reloadState();
        });
      } else {
        const savedGuest = localStorage.getItem('paios_guest_session');
        if (savedGuest === 'true') {
          setCurrentUser({
            uid: 'paios_local_owner',
            email: 'owner@paios.local',
            displayName: 'PAIOS Owner',
          });
        } else {
          setCurrentUser(null);
        }
        if (cloudUnsub) {
          cloudUnsub();
          cloudUnsub = null;
        }
      }
      setIsAuthLoading(false);
    });

    return () => {
      cleanupOfflineSync();
      unsubAuth();
      if (cloudUnsub) cloudUnsub();
    };
  }, []);

  const handleAuthSuccess = (user: any) => {
    localStorage.setItem('paios_guest_session', 'true');
    const mappedUser: PaiosUser = {
      uid: user.id || user.uid || 'usr_active',
      email: user.email || 'user@paios.ai',
      displayName: user.displayName || 'PAIOS User',
    };
    setCurrentUser(mappedUser);
    setShowAuthModal(false);
    setActiveTab(NavTab.TODAY);
    reloadState();
  };

  const handleLogOut = async () => {
    try {
      localStorage.removeItem('paios_guest_session');
      await logOut();
      setCurrentUser(null);
    } catch (e) {
      console.error('Logout error:', e);
      localStorage.removeItem('paios_guest_session');
      setCurrentUser(null);
    }
  };

  const handleCompleteOnboarding = () => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('paios_onboarding_completed', 'true');
      }
    } catch {}
    setHasCompletedOnboarding(true);
    reloadState();
  };

  // Global Desktop Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        handleSearch('');
        setShowSearchModal(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setShowTaskModal(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'q') {
        e.preventDefault();
        setShowQuickCaptureModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Timer Ticker Loop
  useEffect(() => {
    let interval: any = null;
    if (activeActivity) {
      const updateSeconds = () => {
        const now = Date.now();
        const pausedSecs = activeActivity.accumulatedPausedDurationSeconds || 0;
        if (activeActivity.isRunning && !activeActivity.isPaused) {
          const grossSecs = Math.max(0, Math.floor((now - activeActivity.startTimeMillis) / 1000));
          const netSecs = Math.max(0, grossSecs - pausedSecs);
          setElapsedTimerSeconds(netSecs);
        } else if (activeActivity.isPaused) {
          const pauseStart = activeActivity.pauseStartTimeMillis || now;
          const grossSecs = Math.max(0, Math.floor((pauseStart - activeActivity.startTimeMillis) / 1000));
          const netSecs = Math.max(0, grossSecs - pausedSecs);
          setElapsedTimerSeconds(netSecs);
        }
      };
      updateSeconds();
      interval = setInterval(updateSeconds, 1000);
    } else {
      setElapsedTimerSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeActivity]);

  // Activity Handlers
  const handleStartActivity = (name: string, category: string, note?: string) => {
    PAIOSStorage.startActivity(name, category, note);
    reloadState();
  };

  const handleStartTaskTimer = (task: Task) => {
    PAIOSStorage.startActivity(task.title, task.category, task.description || undefined);
    reloadState();
  };

  const handlePauseActivity = (id?: number) => {
    PAIOSStorage.pauseActivity(id);
    reloadState();
  };

  const handleResumeActivity = (id?: number) => {
    PAIOSStorage.resumeActivity(id);
    reloadState();
  };

  const handleFinishActivity = (id?: number) => {
    PAIOSStorage.finishActivity(id);
    reloadState();
  };

  const handleFinishActivityWithDetails = (id: number, finalNote: string, completedTaskId?: number | null) => {
    PAIOSStorage.finishActivity(id, finalNote, completedTaskId);
    reloadState();
  };

  const handleDiscardActivity = (id: number) => {
    PAIOSStorage.discardActivity(id);
    reloadState();
  };

  // Quick Capture
  const handleSaveQuickCapture = (text: string, category: string) => {
    PAIOSStorage.addQuickCaptureNote(text, category);
    reloadState();
  };

  // CheckIn & Review
  const handleSaveCheckIn = (checkIn: MorningCheckIn) => {
    PAIOSStorage.saveCheckIn(checkIn);
    reloadState();
  };

  const handleSaveReview = (review: EveningReview) => {
    PAIOSStorage.saveReview(review);
    reloadState();
  };

  // Tasks
  const handleSaveTask = (title: string, category: string, isPriority: boolean, description: string) => {
    PAIOSStorage.addTask(title, category, isPriority, description);
    reloadState();
  };

  const handleToggleTaskStatus = (taskId: number) => {
    PAIOSStorage.toggleTaskStatus(taskId);
    reloadState();
  };

  const handleToggleTaskPriority = (taskId: number) => {
    PAIOSStorage.toggleTaskPriorityPin(taskId);
    reloadState();
  };

  const handleDeleteTask = (taskId: number) => {
    PAIOSStorage.deleteTask(taskId);
    reloadState();
  };

  // Study Cards
  const handleSaveStudyCard = (topic: string, question: string, answer: string) => {
    PAIOSStorage.addStudyCard(topic, question, answer);
    reloadState();
  };

  const handleReviewStudyCard = (cardId: number, rating: 'AGAIN' | 'HARD' | 'GOOD' | 'EASY') => {
    PAIOSStorage.reviewStudyCard(cardId, rating);
    reloadState();
  };

  const handleDeleteStudyCard = (id: number) => {
    PAIOSStorage.deleteStudyCard(id);
    reloadState();
  };

  // Journal
  const handleAddJournalEntry = (title: string, content: string, moodScore: number, category: string) => {
    PAIOSStorage.addJournalEntry(title, content, moodScore, category);
    reloadState();
  };

  const handleDeleteJournalEntry = (id: number) => {
    PAIOSStorage.deleteJournalEntry(id);
    reloadState();
  };

  // Timeline & Adaptive Timetable
  const handleDeleteTimelineEntry = (id: number) => {
    PAIOSStorage.deleteTimelineEntry(id);
    reloadState();
  };

  const handleGenerateTimetable = async (adaptationReason?: string) => {
    setIsGeneratingTimetable(true);
    const contextStr = PAIOSStorage.getUserContextString();
    const now = new Date();
    const currentTimeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const currentDateStr = getTodayDateString();

    try {
      const res = await fetch('/api/ai/generate-timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userContext: contextStr,
          currentTimeStr,
          currentDateStr,
          isWorkday: settings.isWorkday !== false,
          officeStartTime: settings.officeStartTime || '13:00',
          officeEndTime: settings.officeEndTime || '22:00',
          bedtime: settings.bedtime || '00:00',
          wakeTime: settings.wakeTime || '07:30',
          adaptationReason,
          customApiKey: settings.customApiKey,
          modelName: settings.preferredModel,
        }),
      });

      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success && Array.isArray(data.blocks)) {
          const responseObj: AdaptiveTimetableResponse = {
            dateString: currentDateStr,
            generatedAtTimeStr: currentTimeStr,
            explanation: data.explanation || 'AI generated schedule',
            blocks: data.blocks,
          };
          PAIOSStorage.saveAdaptiveTimetable(responseObj);
          reloadState();
          return;
        }
      }

      // If server returned non-JSON HTML or failed, fall back to client-side engine
      console.warn('Server timeline endpoint returned non-JSON/failed. Executing client-side timetable engine...');
      const fallbackData = await sendClientGeminiTimetable({
        userContext: contextStr,
        currentTimeStr,
        currentDateStr,
        isWorkday: settings.isWorkday !== false,
        officeStartTime: settings.officeStartTime || '13:00',
        officeEndTime: settings.officeEndTime || '22:00',
        bedtime: settings.bedtime || '00:00',
        wakeTime: settings.wakeTime || '07:30',
        adaptationReason,
        customApiKey: settings.customApiKey,
        modelName: settings.preferredModel,
      });

      const responseObj: AdaptiveTimetableResponse = {
        dateString: currentDateStr,
        generatedAtTimeStr: currentTimeStr,
        explanation: fallbackData.explanation,
        blocks: fallbackData.blocks,
      };
      PAIOSStorage.saveAdaptiveTimetable(responseObj);
      reloadState();
    } catch (err: any) {
      console.warn('Timetable server fetch error, falling back to client-side timetable generator:', err);
      try {
        const fallbackData = await sendClientGeminiTimetable({
          userContext: contextStr,
          currentTimeStr,
          currentDateStr,
          isWorkday: settings.isWorkday !== false,
          officeStartTime: settings.officeStartTime || '13:00',
          officeEndTime: settings.officeEndTime || '22:00',
          bedtime: settings.bedtime || '00:00',
          wakeTime: settings.wakeTime || '07:30',
          adaptationReason,
          customApiKey: settings.customApiKey,
          modelName: settings.preferredModel,
        });

        const responseObj: AdaptiveTimetableResponse = {
          dateString: currentDateStr,
          generatedAtTimeStr: currentTimeStr,
          explanation: fallbackData.explanation,
          blocks: fallbackData.blocks,
        };
        PAIOSStorage.saveAdaptiveTimetable(responseObj);
        reloadState();
      } catch (fallbackErr: any) {
        alert(`Unable to generate timetable: ${fallbackErr?.message || 'Error'}`);
      }
    } finally {
      setIsGeneratingTimetable(false);
    }
  };

  const handleUpdateTimetableBlockStatus = (blockId: string, status: TimetableStatus) => {
    PAIOSStorage.updateTimetableBlockStatus(blockId, status);
    reloadState();
  };

  const handleDeleteTimetableBlock = (blockId: string) => {
    PAIOSStorage.deleteTimetableBlock(blockId);
    reloadState();
  };

  // Search
  const handleSearch = (query: string) => {
    const res = PAIOSStorage.searchAll(query);
    setSearchResults(res);
  };

  // Settings
  const handleUpdateSettings = (updated: Partial<UserSettings>) => {
    PAIOSStorage.updateSettings(updated);
    reloadState();
  };

  const handleResetSampleData = () => {
    PAIOSStorage.seedSampleData();
    reloadState();
  };

  const handleClearAllData = () => {
    PAIOSStorage.clearAllData();
    reloadState();
  };

  const handleExportData = async (mode: 'share' | 'download' = 'share') => {
    await exportAndShareBackup(mode);
  };

  // AI Chat Communication
  const handleSendAiMessage = async (userText: string, options?: { role?: string; taskComplexity?: string }) => {
    const userMsg: AiChatMessage = {
      id: Date.now(),
      text: userText,
      isUser: true,
      timestampMillis: Date.now(),
    };

    PAIOSStorage.addAiMessage(userMsg);
    reloadState();

    const contextStr = PAIOSStorage.getUserContextString();
    const currentHistory = PAIOSStorage.getAiMessages();

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userText,
          userContext: contextStr,
          modelName: settings.preferredModel,
          customApiKey: settings.customApiKey,
          role: options?.role || 'productivity',
          taskComplexity: options?.taskComplexity || 'general',
          history: currentHistory,
        }),
      });

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        const botMsg: AiChatMessage = {
          id: Date.now() + 1,
          text: data.text || data.error || "I'm sorry, I couldn't generate a response.",
          isUser: false,
          timestampMillis: Date.now(),
          actionType: data.actionType || undefined,
          actionPayloadJson: data.actionPayloadJson || undefined,
        };
        PAIOSStorage.addAiMessage(botMsg);
        reloadState();
        return;
      }

      // If server returned HTML (standalone/offline app) or failed, fall back to direct client-side Gemini execution
      console.warn('Server endpoint returned non-JSON response. Executing direct client-side Gemini call...');
      const fallbackData = await sendClientGeminiChat({
        userText,
        userContext: contextStr,
        modelName: settings.preferredModel,
        customApiKey: settings.customApiKey,
        role: options?.role || 'productivity',
        taskComplexity: options?.taskComplexity || 'general',
        history: currentHistory,
      });

      const botMsg: AiChatMessage = {
        id: Date.now() + 1,
        text: fallbackData.text,
        isUser: false,
        timestampMillis: Date.now(),
        actionType: (fallbackData.actionType as any) || undefined,
        actionPayloadJson: fallbackData.actionPayloadJson || undefined,
      };
      PAIOSStorage.addAiMessage(botMsg);
      reloadState();
    } catch (err: any) {
      console.error('AI Chat Error, falling back to client-side call:', err);
      try {
        const fallbackData = await sendClientGeminiChat({
          userText,
          userContext: contextStr,
          modelName: settings.preferredModel,
          customApiKey: settings.customApiKey,
          role: options?.role || 'productivity',
          taskComplexity: options?.taskComplexity || 'general',
          history: currentHistory,
        });
        const botMsg: AiChatMessage = {
          id: Date.now() + 1,
          text: fallbackData.text,
          isUser: false,
          timestampMillis: Date.now(),
          actionType: (fallbackData.actionType as any) || undefined,
          actionPayloadJson: fallbackData.actionPayloadJson || undefined,
        };
        PAIOSStorage.addAiMessage(botMsg);
        reloadState();
      } catch (fallbackErr: any) {
        const errorMsg: AiChatMessage = {
          id: Date.now() + 1,
          text: fallbackErr?.message || 'Error connecting to PAIOS AI server. Please verify your network or Gemini settings.',
          isUser: false,
          timestampMillis: Date.now(),
        };
        PAIOSStorage.addAiMessage(errorMsg);
        reloadState();
      }
    }
  };

  const handleClearAiChat = () => {
    PAIOSStorage.clearAiChat();
    reloadState();
  };

  // Health Handlers
  const handleLogDose = (doseId: string, status: DoseStatus, note?: string) => {
    PAIOSStorage.logDoseEvent(doseId, status, note);
    reloadState();
  };

  const handleUpdateRefill = (id: string, newQty: number) => {
    PAIOSStorage.updateRefillQuantity(id, newQty, true);
    reloadState();
  };

  const handleSaveRefill = (refill: RefillInventory) => {
    PAIOSStorage.saveRefillInventory(refill);
    reloadState();
  };

  const handleDeleteRefill = (id: string) => {
    PAIOSStorage.deleteRefillInventory(id);
    reloadState();
  };

  const handleLogVital = (vital: Omit<VitalSign, 'id' | 'timestampMillis'>) => {
    PAIOSStorage.logVitalSign(vital);
    reloadState();
  };

  const handleAddMedication = (med: Medication) => {
    PAIOSStorage.saveMedication(med);
    reloadState();
  };

  const handleDeleteMedication = (id: string) => {
    PAIOSStorage.deleteMedication(id);
    reloadState();
  };

  const handleSaveDoctor = (doc: DoctorContact) => {
    PAIOSStorage.saveDoctor(doc);
    reloadState();
  };

  const handleDeleteDoctor = (id: string) => {
    PAIOSStorage.deleteDoctor(id);
    reloadState();
  };

  const handleBookAppointment = (aptData: Omit<Appointment, 'id' | 'createdAtMillis'>) => {
    PAIOSStorage.bookAppointment(aptData);
    reloadState();
  };

  const handleUpdateAppointmentStatus = (id: string, status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED') => {
    PAIOSStorage.updateAppointmentStatus(id, status);
    reloadState();
  };

  const handleDeleteAppointment = (id: string) => {
    PAIOSStorage.deleteAppointment(id);
    reloadState();
  };

  // AI Action Execution
  const handleExecuteAiAction = (actionType: string, actionPayloadJson: string) => {
    try {
      const payload = JSON.parse(actionPayloadJson);
      if (actionType === 'ADD_TASK' || payload.type === 'ADD_TASK') {
        PAIOSStorage.addTask(payload.title || 'AI Generated Task', payload.category || 'General', true, 'Added via PAIOS AI');
      } else if (actionType === 'START_ACTIVITY' || payload.type === 'START_ACTIVITY') {
        PAIOSStorage.startActivity(payload.name || 'AI Session', payload.category || 'Work', 'Started via PAIOS AI');
      } else if (actionType === 'SAVE_NOTE' || payload.type === 'SAVE_NOTE') {
        PAIOSStorage.addQuickCaptureNote(payload.text || 'AI Note', 'Personal');
      } else if (actionType === 'LOG_DOSE' || payload.type === 'LOG_DOSE') {
        const doseList = PAIOSStorage.getDoseEvents();
        const targetDose = doseList.find((d) => d.medicationName.toLowerCase().includes((payload.medicationName || '').toLowerCase()));
        if (targetDose) {
          PAIOSStorage.logDoseEvent(targetDose.id, payload.status || 'TAKEN', 'Logged via PAIOS AI');
        }
      } else if (actionType === 'LOG_SYMPTOM' || payload.type === 'LOG_SYMPTOM') {
        PAIOSStorage.logVitalSign({
          symptoms: `${payload.symptomName || 'Symptom'} (Severity: ${payload.severity || 1}/10)`,
          dizzinessSeverity: payload.symptomName?.toLowerCase().includes('dizz') ? payload.severity : undefined,
        });
      } else if (actionType === 'BOOK_APPOINTMENT' || payload.type === 'BOOK_APPOINTMENT') {
        const doctors = PAIOSStorage.getDoctors();
        const doc = doctors.find((d) => d.name.toLowerCase().includes((payload.doctorName || '').toLowerCase())) || doctors[0];
        PAIOSStorage.bookAppointment({
          doctorId: doc?.id || 'doc_1',
          doctorName: doc?.name || 'Dr Devendra Ratnani',
          scheduledTimeMillis: Date.now() + 86400000 * (payload.daysFromNow || 1),
          scheduledDateString: payload.dateString || getTodayDateString(),
          scheduledTimeString: payload.timeString || '10:00',
          reason: payload.reason || 'AI Booked Consultation',
          status: 'SCHEDULED',
          notes: payload.notes || 'Booked via PAIOS AI Assistant',
        });
      }
      reloadState();
    } catch (e) {
      console.error('Failed to parse AI action payload:', e);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const todayCheckIn = checkIns.find((c) => c.dateString === todayStr) || null;
  const todayReview = reviews.find((r) => r.dateString === todayStr) || null;

  // Render Loading Screen during Auth Check
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-xl shadow-blue-500/20 mb-4 animate-pulse">
          <Cpu className="w-8 h-8" />
        </div>
        <p className="text-sm font-medium text-slate-400 font-mono tracking-wide">Initializing PAIOS Session...</p>
      </div>
    );
  }

  // Render OnboardingScreen if new/unauthenticated guest user encountering goal setup
  if (!hasCompletedOnboarding) {
    return (
      <OnboardingScreen
        userName={currentUser?.displayName || settings.userName || 'Alex'}
        onCompleteOnboarding={handleCompleteOnboarding}
      />
    );
  }

  // Render AuthScreen if unauthenticated and guest session active is false
  if (!currentUser) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-indigo-500 selection:text-white overflow-x-hidden w-full max-w-full safe-area-left safe-area-right">
      {/* Windows 11 Desktop Title Bar */}
      <WindowsTitleBar
        isMaximized={isMaximized}
        isMinimized={isMinimized}
        onMinimize={() => setIsMinimized(true)}
        onMaximizeToggle={() => setIsMaximized(!isMaximized)}
        onClose={() => {
          if (confirm('Minimize PAIOS Desktop to System Tray?')) {
            setIsMinimized(true);
          }
        }}
        onOpenSearch={() => {
          handleSearch('');
          setShowSearchModal(true);
        }}
        onOpenSettings={() => setActiveTab(NavTab.SETTINGS)}
        onNewTask={() => setShowTaskModal(true)}
        onNewCapture={() => setShowQuickCaptureModal(true)}
        onExportDesktopApp={() => setShowExportModal(true)}
      />

      {/* Main Desktop Window Frame */}
      {isMinimized ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 bg-slate-950/90">
          <div className="w-16 h-16 rounded-2xl bg-indigo-950/60 border border-indigo-800/60 flex items-center justify-center text-indigo-400 mb-4 animate-bounce">
            <Cpu className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-200">PAIOS Running in System Tray</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            PAIOS Desktop is active in the background. Click the taskbar app icon below to restore the application window.
          </p>
          <button
            onClick={() => setIsMinimized(false)}
            className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all"
          >
            Restore Window
          </button>
        </div>
      ) : (
        <div className={`flex-1 flex flex-col transition-all duration-200 ${!isMaximized ? 'p-2 sm:p-4 max-w-7xl mx-auto w-full' : 'w-full'}`}>
          <div className={`flex-1 flex flex-col bg-slate-950 ${!isMaximized ? 'rounded-2xl border border-slate-800/80 shadow-2xl overflow-hidden' : ''}`}>
            {/* Top Header Bar */}
            <TopHeaderBar
              userName={currentUser.displayName || settings.userName || 'PAIOS User'}
              user={currentUser}
              onLogOut={handleLogOut}
              onSyncComplete={reloadState}
              onOpenNotifications={() => setShowNotificationModal(true)}
              onOpenTour={() => setShowSetupWizardModal(true)}
              onOpenSearch={() => {
                handleSearch('');
                setShowSearchModal(true);
              }}
              onOpenCheckIn={() => setShowCheckInModal(true)}
              onOpenReview={() => setShowReviewModal(true)}
              onOpenSettings={() => setActiveTab(NavTab.SETTINGS)}
            />

            {/* Main Content Area */}
            <main className="flex-1 max-w-6xl w-full mx-auto p-3 sm:p-6 pb-28 md:pb-20 overflow-x-hidden">
              {activeTab === NavTab.TODAY && (
                <TodayScreen
                  activeActivity={activeActivity}
                  priorities={tasks.filter((t) => t.isPriorityPin)}
                  todayTasks={tasks}
                  timelineEntries={timelineEntries}
                  userName={settings.userName}
                  onStartActivity={handleStartActivity}
                  onPauseActivity={handlePauseActivity}
                  onResumeActivity={handleResumeActivity}
                  onFinishActivity={handleFinishActivity}
                  onToggleTaskStatus={handleToggleTaskStatus}
                  onOpenStartActivity={() => setShowStartActivityModal(true)}
                  onOpenQuickCapture={() => setShowQuickCaptureModal(true)}
                  onOpenAddTask={() => setShowTaskModal(true)}
                  onOpenJournal={() => setActiveTab(NavTab.JOURNAL)}
                  onOpenStudy={() => setActiveTab(NavTab.LEARN)}
                />
              )}

              {activeTab === NavTab.TIMELINE && (
                <TimelineScreen
                  timelineEntries={timelineEntries}
                  timetable={timetable}
                  settings={settings}
                  isGeneratingTimetable={isGeneratingTimetable}
                  onGenerateTimetable={handleGenerateTimetable}
                  onUpdateBlockStatus={handleUpdateTimetableBlockStatus}
                  onDeleteBlock={handleDeleteTimetableBlock}
                  onDeleteTimelineEntry={handleDeleteTimelineEntry}
                  onStartActivity={handleStartActivity}
                  onUpdateSettings={handleUpdateSettings}
                />
              )}

              {activeTab === NavTab.TASKS && (
                <TasksScreen
                  tasks={tasks}
                  onToggleTaskStatus={handleToggleTaskStatus}
                  onToggleTaskPriorityPin={handleToggleTaskPriority}
                  onDeleteTask={handleDeleteTask}
                  onOpenAddTask={() => setShowTaskModal(true)}
                />
              )}

              {activeTab === NavTab.HEALTH && (
                <HealthScreen
                  medications={medications}
                  doseEvents={doseEvents}
                  refillInventories={refillInventories}
                  vitalSigns={vitalSigns}
                  doctors={doctors}
                  appointments={appointments}
                  onLogDose={handleLogDose}
                  onUpdateRefill={handleUpdateRefill}
                  onSaveRefill={handleSaveRefill}
                  onDeleteRefill={handleDeleteRefill}
                  onLogVital={handleLogVital}
                  onAddMedication={handleAddMedication}
                  onDeleteMedication={handleDeleteMedication}
                  onSaveDoctor={handleSaveDoctor}
                  onDeleteDoctor={handleDeleteDoctor}
                  onBookAppointment={handleBookAppointment}
                  onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
                  onDeleteAppointment={handleDeleteAppointment}
                />
              )}

              {activeTab === NavTab.LEARN && (
                <LearnScreen
                  studyCards={studyCards}
                  onStartStudySession={(topic, mins) => {
                    handleStartActivity(`Study: ${topic}`, 'Study', `${mins} min active recall session`);
                  }}
                  onReviewStudyCard={handleReviewStudyCard}
                  onDeleteStudyCard={handleDeleteStudyCard}
                  onOpenAddCard={() => setShowStudyCardModal(true)}
                />
              )}

              {activeTab === NavTab.INSIGHTS && (
                <InsightsScreen
                  activityLogs={activityLogs}
                  activeActivity={activeActivity}
                  timelineEntries={timelineEntries}
                  tasks={tasks}
                  checkIns={checkIns}
                  reviews={reviews}
                />
              )}

              {activeTab === NavTab.AI && (
                <AiScreen
                  messages={aiMessages}
                  userContextString={PAIOSStorage.getUserContextString()}
                  onSendMessage={handleSendAiMessage}
                  onExecuteAction={handleExecuteAiAction}
                  onClearHistory={handleClearAiChat}
                />
              )}

              {activeTab === NavTab.JOURNAL && (
                <JournalScreen
                  entries={journalEntries}
                  onAddJournalEntry={handleAddJournalEntry}
                  onDeleteJournalEntry={handleDeleteJournalEntry}
                />
              )}

              {activeTab === NavTab.SETTINGS && (
                <SettingsScreen
                  settings={settings}
                  onUpdateSettings={handleUpdateSettings}
                  onResetSampleData={handleResetSampleData}
                  onClearAllData={handleClearAllData}
                  onExportData={handleExportData}
                  onOpenExportModal={() => setShowExportModal(true)}
                  onStartTour={() => setShowSetupWizardModal(true)}
                />
              )}
            </main>
          </div>
        </div>
      )}

      {/* Persistent Floating Mini Timer Player */}
      {activeActivity && activeTab !== NavTab.TODAY && (
        <div className="fixed bottom-[56px] md:bottom-12 left-0 right-0 z-40">
          <MiniTimerPlayer
            activity={activeActivity}
            elapsedSeconds={elapsedTimerSeconds}
            onPause={handlePauseActivity}
            onResume={handleResumeActivity}
            onFinish={handleFinishActivity}
            onTap={() => setActiveTab(NavTab.TODAY)}
          />
        </div>
      )}

      {/* Mobile Android Floating Action Button (FAB) for Quick Capture */}
      <button
        onClick={() => setShowQuickCaptureModal(true)}
        className="fixed bottom-[70px] right-4 z-40 md:hidden w-13 h-13 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-xl shadow-indigo-600/40 border border-indigo-400/30 flex items-center justify-center active:scale-90 transition-transform"
        aria-label="Quick Capture Task or Note"
        title="Quick Capture"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Mobile Bottom Navigation Dock */}
      <MobileBottomNav
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setIsMinimized(false);
          setActiveTab(tab);
        }}
      />

      {/* Windows 11 Bottom Taskbar */}
      <WindowsTaskBar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setIsMinimized(false);
          setActiveTab(tab);
        }}
        activeActivity={activeActivity}
        elapsedSeconds={elapsedTimerSeconds}
        onPauseActivity={() => activeActivity && handlePauseActivity(activeActivity.id)}
        onResumeActivity={() => activeActivity && handleResumeActivity(activeActivity.id)}
        onFinishActivity={() => activeActivity && handleFinishActivity(activeActivity.id)}
        onOpenSearch={() => {
          handleSearch('');
          setShowSearchModal(true);
        }}
        onOpenExportModal={() => setShowExportModal(true)}
        isMinimized={isMinimized}
        onRestoreFromTaskbar={() => setIsMinimized(false)}
      />

      {/* Modals */}
      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onAuthSuccess={handleAuthSuccess}
        />
      )}

      {showExportModal && (
        <DesktopAppExportModal onDismiss={() => setShowExportModal(false)} />
      )}

      {showStartActivityModal && (
        <StartActivityModal
          onDismiss={() => setShowStartActivityModal(false)}
          onStart={handleStartActivity}
        />
      )}

      {showQuickCaptureModal && (
        <QuickCaptureModal
          onDismiss={() => setShowQuickCaptureModal(false)}
          onSave={handleSaveQuickCapture}
        />
      )}

      {showCheckInModal && (
        <CheckInModal
          dateString={todayStr}
          existingCheckIn={todayCheckIn}
          onDismiss={() => setShowCheckInModal(false)}
          onSave={handleSaveCheckIn}
        />
      )}

      {showReviewModal && (
        <ReviewModal
          dateString={todayStr}
          activeTimeText={`${(
            timelineEntries.reduce((acc, e) => acc + (e.durationMinutes || 0), 0) / 60
          ).toFixed(1)}h`}
          tasksCompletedText={`${tasks.filter((t) => t.status === 'COMPLETED').length} tasks`}
          existingReview={todayReview}
          onDismiss={() => setShowReviewModal(false)}
          onSave={handleSaveReview}
        />
      )}

      {showTaskModal && (
        <TaskModal
          onDismiss={() => setShowTaskModal(false)}
          onSave={handleSaveTask}
        />
      )}

      {showStudyCardModal && (
        <StudyCardModal
          onDismiss={() => setShowStudyCardModal(false)}
          onSave={handleSaveStudyCard}
        />
      )}

      {showSearchModal && (
        <SearchModal
          searchResults={searchResults}
          onSearch={handleSearch}
          onDismiss={() => setShowSearchModal(false)}
        />
      )}

      <NotificationCenterModal
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
      />

      <SetupWizardModal
        isOpen={showSetupWizardModal}
        onClose={() => setShowSetupWizardModal(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onResetAllData={handleClearAllData}
        onCompleteTour={() => {
          setShowSetupWizardModal(false);
          reloadState();
        }}
      />

      <UpdatePromptModal
        isOpen={showUpdatePromptModal}
        onClose={() => setShowUpdatePromptModal(false)}
        serverManifest={latestServerManifest}
      />
    </div>
  );
};

export default App;
