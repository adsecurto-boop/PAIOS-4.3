package com.example.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "tasks")
data class TaskEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val title: String,
    val description: String = "",
    val priority: String = "NORMAL", // LOW, NORMAL, HIGH, CRITICAL
    val status: String = "TODO", // TODO, IN_PROGRESS, COMPLETED, CANCELLED
    val isPriorityPin: Boolean = false,
    val category: String = "Work", // Work, Study, Coding, Testing, Personal, Exercise, Break, Other
    val dueDateMillis: Long? = null,
    val estimatedDurationMinutes: Int? = null,
    val createdAtMillis: Long = System.currentTimeMillis(),
    val completedAtMillis: Long? = null
)

@Entity(tableName = "activity_logs")
data class ActivityLogEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val activityName: String,
    val category: String = "Work",
    val startTimeMillis: Long = System.currentTimeMillis(),
    val endTimeMillis: Long? = null,
    val durationSeconds: Long = 0,
    val isRunning: Boolean = true,
    val isPaused: Boolean = false,
    val pauseStartTimeMillis: Long? = null,
    val accumulatedPausedDurationSeconds: Long = 0,
    val note: String? = null
)

@Entity(tableName = "timeline_entries")
data class TimelineEntryEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val title: String,
    val category: String = "Work",
    val timestampMillis: Long = System.currentTimeMillis(),
    val durationMinutes: Int? = null,
    val note: String? = null,
    val type: String = "ACTIVITY" // ACTIVITY, TASK, CAPTURE, CHECKIN, JOURNAL
)

@Entity(tableName = "quick_captures")
data class QuickCaptureEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val text: String,
    val category: String? = "Personal",
    val tags: String = "",
    val createdAtMillis: Long = System.currentTimeMillis()
)

@Entity(tableName = "morning_checkins")
data class MorningCheckInEntity(
    @PrimaryKey val dateString: String, // e.g. "2026-08-09"
    val sleepHours: Float = 7.5f,
    val sleepQuality: Int = 8,
    val energy: Int = 8,
    val mood: Int = 8,
    val mainGoal: String = "",
    val priority1: String = "",
    val priority2: String = "",
    val priority3: String = "",
    val createdAtMillis: Long = System.currentTimeMillis()
)

@Entity(tableName = "evening_reviews")
data class EveningReviewEntity(
    @PrimaryKey val dateString: String, // e.g. "2026-08-09"
    val activeTimeFormatted: String = "0h 0m",
    val workTimeFormatted: String = "0h 0m",
    val studyTimeFormatted: String = "0h 0m",
    val tasksCompletedText: String = "0 / 0 completed",
    val wentWell: String = "",
    val didntGoWell: String = "",
    val learnedText: String = "",
    val doDifferently: String = "",
    val rating: Int = 8,
    val createdAtMillis: Long = System.currentTimeMillis()
)

@Entity(tableName = "journal_entries")
data class JournalEntryEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val title: String,
    val content: String,
    val tags: String = "",
    val createdAtMillis: Long = System.currentTimeMillis(),
    val updatedAtMillis: Long = System.currentTimeMillis()
)

@Entity(tableName = "study_cards")
data class StudyCardEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val topic: String,
    val question: String,
    val answer: String,
    val confidence: Int = 5, // 1 to 10
    val lastReviewedMillis: Long? = null,
    val reviewCount: Int = 0,
    val easeFactor: Float = 2.5f
)

@Entity(tableName = "ai_messages")
data class AIMessageEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val sender: String, // "USER" or "AI"
    val text: String,
    val actionType: String? = null, // "ADD_TASK", "START_ACTIVITY", "SAVE_NOTE"
    val actionPayloadJson: String? = null,
    val isActionConfirmed: Boolean? = null,
    val timestampMillis: Long = System.currentTimeMillis()
)

@Entity(tableName = "user_settings")
data class UserSettingsEntity(
    @PrimaryKey val id: Int = 1,
    val userName: String = "Alex",
    val aiProvider: String = "GEMINI", // GEMINI, OLLAMA, CLAUDE, OPENAI
    val aiModel: String = "gemini-3.5-flash",
    val customApiKey: String = "",
    val themeMode: String = "SYSTEM", // SYSTEM, DARK, LIGHT
    val morningNotificationEnabled: Boolean = true,
    val eveningNotificationEnabled: Boolean = true
)
