package com.example.data.dao

import androidx.room.*
import com.example.data.model.*
import kotlinx.coroutines.flow.Flow

@Dao
interface TaskDao {
    @Query("SELECT * FROM tasks ORDER BY isPriorityPin DESC, id DESC")
    fun getAllTasks(): Flow<List<TaskEntity>>

    @Query("SELECT * FROM tasks WHERE isPriorityPin = 1 AND status != 'COMPLETED' ORDER BY id ASC LIMIT 3")
    fun getTodayPriorities(): Flow<List<TaskEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTask(task: TaskEntity): Long

    @Update
    suspend fun updateTask(task: TaskEntity)

    @Query("DELETE FROM tasks WHERE id = :id")
    suspend fun deleteTaskById(id: Long)

    @Query("SELECT * FROM tasks WHERE title LIKE '%' || :query || '%' OR description LIKE '%' || :query || '%'")
    suspend fun searchTasks(query: String): List<TaskEntity>
}

@Dao
interface ActivityDao {
    @Query("SELECT * FROM activity_logs WHERE isRunning = 1 LIMIT 1")
    fun getActiveActivityFlow(): Flow<ActivityLogEntity?>

    @Query("SELECT * FROM activity_logs WHERE isRunning = 1 LIMIT 1")
    suspend fun getActiveActivity(): ActivityLogEntity?

    @Query("SELECT * FROM activity_logs ORDER BY startTimeMillis DESC")
    fun getAllActivities(): Flow<List<ActivityLogEntity>>

    @Query("SELECT * FROM activity_logs WHERE startTimeMillis >= :startOfDayMillis ORDER BY startTimeMillis DESC")
    fun getTodayActivities(startOfDayMillis: Long): Flow<List<ActivityLogEntity>>

    @Query("SELECT * FROM activity_logs WHERE startTimeMillis >= :startOfDayMillis")
    suspend fun getTodayActivitiesList(startOfDayMillis: Long): List<ActivityLogEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertActivity(activity: ActivityLogEntity): Long

    @Update
    suspend fun updateActivity(activity: ActivityLogEntity)

    @Query("DELETE FROM activity_logs WHERE id = :id")
    suspend fun deleteActivityById(id: Long)
}

@Dao
interface TimelineDao {
    @Query("SELECT * FROM timeline_entries ORDER BY timestampMillis DESC")
    fun getAllTimelineEntries(): Flow<List<TimelineEntryEntity>>

    @Query("SELECT * FROM timeline_entries WHERE timestampMillis >= :startOfDayMillis ORDER BY timestampMillis DESC")
    fun getTodayTimelineEntries(startOfDayMillis: Long): Flow<List<TimelineEntryEntity>>

    @Query("SELECT * FROM timeline_entries WHERE timestampMillis >= :startOfDayMillis ORDER BY timestampMillis DESC")
    suspend fun getTodayTimelineList(startOfDayMillis: Long): List<TimelineEntryEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTimelineEntry(entry: TimelineEntryEntity): Long

    @Update
    suspend fun updateTimelineEntry(entry: TimelineEntryEntity)

    @Query("DELETE FROM timeline_entries WHERE id = :id")
    suspend fun deleteTimelineEntryById(id: Long)

    @Query("SELECT * FROM timeline_entries WHERE title LIKE '%' || :query || '%' OR note LIKE '%' || :query || '%'")
    suspend fun searchTimeline(query: String): List<TimelineEntryEntity>
}

@Dao
interface QuickCaptureDao {
    @Query("SELECT * FROM quick_captures ORDER BY createdAtMillis DESC")
    fun getAllCaptures(): Flow<List<QuickCaptureEntity>>

    @Query("SELECT * FROM quick_captures WHERE createdAtMillis >= :startOfDayMillis ORDER BY createdAtMillis DESC")
    fun getTodayCaptures(startOfDayMillis: Long): Flow<List<QuickCaptureEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCapture(capture: QuickCaptureEntity): Long

    @Query("DELETE FROM quick_captures WHERE id = :id")
    suspend fun deleteCaptureById(id: Long)

    @Query("SELECT * FROM quick_captures WHERE text LIKE '%' || :query || '%'")
    suspend fun searchCaptures(query: String): List<QuickCaptureEntity>
}

@Dao
interface CheckInReviewDao {
    @Query("SELECT * FROM morning_checkins WHERE dateString = :dateString LIMIT 1")
    fun getMorningCheckInFlow(dateString: String): Flow<MorningCheckInEntity?>

    @Query("SELECT * FROM morning_checkins WHERE dateString = :dateString LIMIT 1")
    suspend fun getMorningCheckIn(dateString: String): MorningCheckInEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMorningCheckIn(checkIn: MorningCheckInEntity)

    @Query("SELECT * FROM evening_reviews WHERE dateString = :dateString LIMIT 1")
    fun getEveningReviewFlow(dateString: String): Flow<EveningReviewEntity?>

    @Query("SELECT * FROM evening_reviews WHERE dateString = :dateString LIMIT 1")
    suspend fun getEveningReview(dateString: String): EveningReviewEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertEveningReview(review: EveningReviewEntity)
}

@Dao
interface JournalDao {
    @Query("SELECT * FROM journal_entries ORDER BY createdAtMillis DESC")
    fun getAllJournalEntries(): Flow<List<JournalEntryEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertJournalEntry(entry: JournalEntryEntity): Long

    @Update
    suspend fun updateJournalEntry(entry: JournalEntryEntity)

    @Query("DELETE FROM journal_entries WHERE id = :id")
    suspend fun deleteJournalEntryById(id: Long)

    @Query("SELECT * FROM journal_entries WHERE title LIKE '%' || :query || '%' OR content LIKE '%' || :query || '%'")
    suspend fun searchJournal(query: String): List<JournalEntryEntity>
}

@Dao
interface StudyDao {
    @Query("SELECT * FROM study_cards ORDER BY id DESC")
    fun getAllStudyCards(): Flow<List<StudyCardEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertStudyCard(card: StudyCardEntity): Long

    @Update
    suspend fun updateStudyCard(card: StudyCardEntity)

    @Query("DELETE FROM study_cards WHERE id = :id")
    suspend fun deleteStudyCardById(id: Long)

    @Query("SELECT * FROM study_cards WHERE question LIKE '%' || :query || '%' OR answer LIKE '%' || :query || '%' OR topic LIKE '%' || :query || '%'")
    suspend fun searchStudyCards(query: String): List<StudyCardEntity>
}

@Dao
interface AiChatDao {
    @Query("SELECT * FROM ai_messages ORDER BY timestampMillis ASC")
    fun getAllMessagesFlow(): Flow<List<AIMessageEntity>>

    @Query("SELECT * FROM ai_messages ORDER BY timestampMillis ASC")
    suspend fun getAllMessages(): List<AIMessageEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMessage(message: AIMessageEntity): Long

    @Update
    suspend fun updateMessage(message: AIMessageEntity)

    @Query("DELETE FROM ai_messages")
    suspend fun clearMessages()
}

@Dao
interface SettingsDao {
    @Query("SELECT * FROM user_settings WHERE id = 1 LIMIT 1")
    fun getSettingsFlow(): Flow<UserSettingsEntity?>

    @Query("SELECT * FROM user_settings WHERE id = 1 LIMIT 1")
    suspend fun getSettings(): UserSettingsEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun saveSettings(settings: UserSettingsEntity)
}
