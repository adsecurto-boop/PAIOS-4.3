package com.example.data.repository

import com.example.BuildConfig
import com.example.data.database.PaiosDatabase
import com.example.data.model.*
import com.example.data.remote.GeminiApiClient
import com.example.data.remote.GeminiContent
import com.example.data.remote.GeminiGenerationConfig
import com.example.data.remote.GeminiPart
import com.example.data.remote.GeminiRequest
import kotlinx.coroutines.flow.Flow
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

data class SearchResults(
    val tasks: List<TaskEntity> = emptyList(),
    val timeline: List<TimelineEntryEntity> = emptyList(),
    val captures: List<QuickCaptureEntity> = emptyList(),
    val journal: List<JournalEntryEntity> = emptyList(),
    val studyCards: List<StudyCardEntity> = emptyList()
)

class PaiosRepository(private val db: PaiosDatabase) {
    private val taskDao = db.taskDao()
    private val activityDao = db.activityDao()
    private val timelineDao = db.timelineDao()
    private val captureDao = db.quickCaptureDao()
    private val checkInReviewDao = db.checkInReviewDao()
    private val journalDao = db.journalDao()
    private val studyDao = db.studyDao()
    private val aiChatDao = db.aiChatDao()
    private val settingsDao = db.settingsDao()

    private fun getStartOfDayMillis(): Long {
        val calendar = Calendar.getInstance()
        calendar.set(Calendar.HOUR_OF_DAY, 0)
        calendar.set(Calendar.MINUTE, 0)
        calendar.set(Calendar.SECOND, 0)
        calendar.set(Calendar.MILLISECOND, 0)
        return calendar.timeInMillis
    }

    fun getTodayDateString(): String {
        val formatter = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        return formatter.format(Date())
    }

    // --- TASKS ---
    fun getAllTasks(): Flow<List<TaskEntity>> = taskDao.getAllTasks()
    fun getTodayPriorities(): Flow<List<TaskEntity>> = taskDao.getTodayPriorities()

    suspend fun addTask(task: TaskEntity): Long {
        val id = taskDao.insertTask(task)
        timelineDao.insertTimelineEntry(
            TimelineEntryEntity(
                title = "Task Created: ${task.title}",
                category = task.category,
                timestampMillis = System.currentTimeMillis(),
                type = "TASK"
            )
        )
        return id
    }

    suspend fun updateTask(task: TaskEntity) {
        taskDao.updateTask(task)
    }

    suspend fun deleteTask(id: Long) {
        taskDao.deleteTaskById(id)
    }

    // --- ACTIVITY TIMER ---
    fun getActiveActivityFlow(): Flow<ActivityLogEntity?> = activityDao.getActiveActivityFlow()
    fun getAllActivities(): Flow<List<ActivityLogEntity>> = activityDao.getAllActivities()
    fun getTodayActivities(): Flow<List<ActivityLogEntity>> = activityDao.getTodayActivities(getStartOfDayMillis())

    suspend fun startActivity(name: String, category: String, note: String? = null): Long {
        // Stop currently active activity if present
        val currentActive = activityDao.getActiveActivity()
        if (currentActive != null) {
            finishActivity(currentActive.id, null)
        }

        val newActivity = ActivityLogEntity(
            activityName = name,
            category = category,
            startTimeMillis = System.currentTimeMillis(),
            isRunning = true,
            isPaused = false,
            note = note
        )
        return activityDao.insertActivity(newActivity)
    }

    suspend fun pauseActivity(activityId: Long) {
        val current = activityDao.getActiveActivity() ?: return
        if (current.id == activityId && current.isRunning && !current.isPaused) {
            val updated = current.copy(
                isPaused = true,
                pauseStartTimeMillis = System.currentTimeMillis()
            )
            activityDao.updateActivity(updated)
        }
    }

    suspend fun resumeActivity(activityId: Long) {
        val current = activityDao.getActiveActivity() ?: return
        if (current.id == activityId && current.isPaused) {
            val now = System.currentTimeMillis()
            val pauseStart = current.pauseStartTimeMillis ?: now
            val extraPausedSecs = (now - pauseStart) / 1000
            val updated = current.copy(
                isPaused = false,
                pauseStartTimeMillis = null,
                accumulatedPausedDurationSeconds = current.accumulatedPausedDurationSeconds + extraPausedSecs
            )
            activityDao.updateActivity(updated)
        }
    }

    suspend fun finishActivity(activityId: Long, finalNote: String? = null) {
        val current = activityDao.getActiveActivity() ?: return
        if (current.id == activityId) {
            val now = System.currentTimeMillis()
            var extraPausedSecs = 0L
            if (current.isPaused && current.pauseStartTimeMillis != null) {
                extraPausedSecs = (now - current.pauseStartTimeMillis) / 1000
            }
            val totalPausedSecs = current.accumulatedPausedDurationSeconds + extraPausedSecs
            val grossDurationSecs = (now - current.startTimeMillis) / 1000
            val netDurationSecs = maxOf(0L, grossDurationSecs - totalPausedSecs)
            val durationMins = (netDurationSecs / 60).toInt()

            val updated = current.copy(
                endTimeMillis = now,
                durationSeconds = netDurationSecs,
                isRunning = false,
                isPaused = false,
                accumulatedPausedDurationSeconds = totalPausedSecs,
                note = finalNote ?: current.note
            )
            activityDao.updateActivity(updated)

            // Add to Timeline
            timelineDao.insertTimelineEntry(
                TimelineEntryEntity(
                    title = current.activityName,
                    category = current.category,
                    timestampMillis = current.startTimeMillis,
                    durationMinutes = durationMins,
                    note = updated.note,
                    type = "ACTIVITY"
                )
            )
        }
    }

    // --- TIMELINE ---
    fun getTodayTimeline(): Flow<List<TimelineEntryEntity>> = timelineDao.getTodayTimelineEntries(getStartOfDayMillis())
    fun getAllTimeline(): Flow<List<TimelineEntryEntity>> = timelineDao.getAllTimelineEntries()

    suspend fun addTimelineEntry(entry: TimelineEntryEntity): Long {
        return timelineDao.insertTimelineEntry(entry)
    }

    suspend fun updateTimelineEntry(entry: TimelineEntryEntity) {
        timelineDao.updateTimelineEntry(entry)
    }

    suspend fun deleteTimelineEntry(id: Long) {
        timelineDao.deleteTimelineEntryById(id)
    }

    // --- QUICK CAPTURE ---
    fun getTodayCaptures(): Flow<List<QuickCaptureEntity>> = captureDao.getTodayCaptures(getStartOfDayMillis())
    fun getAllCaptures(): Flow<List<QuickCaptureEntity>> = captureDao.getAllCaptures()

    suspend fun addQuickCapture(text: String, category: String = "Personal"): Long {
        val capture = QuickCaptureEntity(text = text, category = category)
        val id = captureDao.insertCapture(capture)
        timelineDao.insertTimelineEntry(
            TimelineEntryEntity(
                title = "Note: $text",
                category = category,
                timestampMillis = System.currentTimeMillis(),
                type = "CAPTURE"
            )
        )
        return id
    }

    suspend fun deleteQuickCapture(id: Long) {
        captureDao.deleteCaptureById(id)
    }

    // --- CHECK-IN & REVIEW ---
    fun getTodayMorningCheckInFlow(): Flow<MorningCheckInEntity?> =
        checkInReviewDao.getMorningCheckInFlow(getTodayDateString())

    suspend fun saveMorningCheckIn(checkIn: MorningCheckInEntity) {
        checkInReviewDao.insertMorningCheckIn(checkIn)
        timelineDao.insertTimelineEntry(
            TimelineEntryEntity(
                title = "Morning Check-In Completed",
                category = "Personal",
                timestampMillis = System.currentTimeMillis(),
                note = "Goal: ${checkIn.mainGoal}",
                type = "CHECKIN"
            )
        )
    }

    fun getTodayEveningReviewFlow(): Flow<EveningReviewEntity?> =
        checkInReviewDao.getEveningReviewFlow(getTodayDateString())

    suspend fun saveEveningReview(review: EveningReviewEntity) {
        checkInReviewDao.insertEveningReview(review)
        timelineDao.insertTimelineEntry(
            TimelineEntryEntity(
                title = "Evening Review Completed (Rating: ${review.rating}/10)",
                category = "Personal",
                timestampMillis = System.currentTimeMillis(),
                note = review.wentWell,
                type = "CHECKIN"
            )
        )
    }

    // --- JOURNAL ---
    fun getAllJournalEntries(): Flow<List<JournalEntryEntity>> = journalDao.getAllJournalEntries()

    suspend fun addJournalEntry(title: String, content: String, tags: String = ""): Long {
        val entry = JournalEntryEntity(title = title, content = content, tags = tags)
        val id = journalDao.insertJournalEntry(entry)
        timelineDao.insertTimelineEntry(
            TimelineEntryEntity(
                title = "Journal: $title",
                category = "Personal",
                timestampMillis = System.currentTimeMillis(),
                type = "JOURNAL"
            )
        )
        return id
    }

    suspend fun updateJournalEntry(entry: JournalEntryEntity) {
        journalDao.updateJournalEntry(entry.copy(updatedAtMillis = System.currentTimeMillis()))
    }

    suspend fun deleteJournalEntry(id: Long) {
        journalDao.deleteJournalEntryById(id)
    }

    // --- STUDY & ACTIVE RECALL ---
    fun getAllStudyCards(): Flow<List<StudyCardEntity>> = studyDao.getAllStudyCards()

    suspend fun addStudyCard(topic: String, question: String, answer: String): Long {
        val card = StudyCardEntity(topic = topic, question = question, answer = answer)
        return studyDao.insertStudyCard(card)
    }

    suspend fun reviewStudyCard(cardId: Long, rating: String) { // "AGAIN", "HARD", "GOOD", "EASY"
        val cards = studyDao.searchStudyCards("")
        val card = cards.firstOrNull { it.id == cardId } ?: return
        val newCount = card.reviewCount + 1
        val newConfidence = when (rating) {
            "AGAIN" -> 2
            "HARD" -> 5
            "GOOD" -> 8
            "EASY" -> 10
            else -> 5
        }
        val updated = card.copy(
            confidence = newConfidence,
            reviewCount = newCount,
            lastReviewedMillis = System.currentTimeMillis()
        )
        studyDao.updateStudyCard(updated)
    }

    suspend fun deleteStudyCard(id: Long) {
        studyDao.deleteStudyCardById(id)
    }

    // --- SEARCH ---
    suspend fun globalSearch(query: String): SearchResults {
        if (query.isBlank()) return SearchResults()
        return SearchResults(
            tasks = taskDao.searchTasks(query),
            timeline = timelineDao.searchTimeline(query),
            captures = captureDao.searchCaptures(query),
            journal = journalDao.searchJournal(query),
            studyCards = studyDao.searchStudyCards(query)
        )
    }

    // --- USER SETTINGS ---
    fun getSettingsFlow(): Flow<UserSettingsEntity?> = settingsDao.getSettingsFlow()

    suspend fun getSettings(): UserSettingsEntity {
        return settingsDao.getSettings() ?: UserSettingsEntity().also { settingsDao.saveSettings(it) }
    }

    suspend fun saveSettings(settings: UserSettingsEntity) {
        settingsDao.saveSettings(settings)
    }

    // --- AI CHAT & CONTEXT ---
    fun getAiMessagesFlow(): Flow<List<AIMessageEntity>> = aiChatDao.getAllMessagesFlow()

    suspend fun clearAiMessages() {
        aiChatDao.clearMessages()
    }

    suspend fun processUserAiPrompt(userText: String): String {
        // Save user message
        aiChatDao.insertMessage(
            AIMessageEntity(sender = "USER", text = userText)
        )

        val settings = getSettings()
        var apiKey = settings.customApiKey.ifBlank { BuildConfig.GEMINI_API_KEY }

        if (apiKey.isBlank() || apiKey == "MY_GEMINI_API_KEY") {
            val errorMsg = "I don't have an API key configured. Please configure your Gemini API Key in PAIOS Settings or Secrets panel."
            aiChatDao.insertMessage(AIMessageEntity(sender = "AI", text = errorMsg))
            return errorMsg
        }

        // Build context from user's PAIOS database
        val startOfDay = getStartOfDayMillis()
        val activeActivity = activityDao.getActiveActivity()
        val todayTimeline = timelineDao.getTodayTimelineList(startOfDay)
        val todayCheckIn = checkInReviewDao.getMorningCheckIn(getTodayDateString())

        val contextBuilder = StringBuilder()
        contextBuilder.append("User Name: ${settings.userName}\n")
        contextBuilder.append("Current Time: ${SimpleDateFormat("EEEE, MMMM d, h:mm a", Locale.getDefault()).format(Date())}\n\n")

        if (activeActivity != null) {
            contextBuilder.append("CURRENT ACTIVE TIMER:\n")
            contextBuilder.append("- Activity: ${activeActivity.activityName} (${activeActivity.category})\n\n")
        } else {
            contextBuilder.append("CURRENT ACTIVE TIMER: None\n\n")
        }

        if (todayTimeline.isNotEmpty()) {
            contextBuilder.append("TODAY'S TIMELINE LOGS:\n")
            todayTimeline.take(10).forEach { entry ->
                contextBuilder.append("- ${entry.title} (${entry.category}) ${entry.durationMinutes?.let { "$it mins" } ?: ""}\n")
            }
            contextBuilder.append("\n")
        }

        if (todayCheckIn != null) {
            contextBuilder.append("TODAY'S MAIN GOAL: ${todayCheckIn.mainGoal}\n")
            contextBuilder.append("TOP PRIORITIES: ${listOf(todayCheckIn.priority1, todayCheckIn.priority2, todayCheckIn.priority3).filter { it.isNotBlank() }.joinToString(", ")}\n\n")
        }

        val systemInstruction = """
            You are PAIOS (Personal AI Operating System), a calm, highly intelligent personal productivity and life assistant.
            You have direct access to the user's local PAIOS context (activities, timeline, tasks, goals).
            Answer user questions directly, objectively, and accurately based on their real PAIOS data.
            Never fabricate data or statistics.
            
            If the user asks you to take a specific action (e.g. "Add a task to finish API testing tomorrow", "Start a 30-minute study session", "Save a note"), include a structured action block at the VERY END of your response in this exact JSON format:
            [[ACTION: {"type": "ADD_TASK", "title": "Finish API testing", "category": "Testing"}]]
            or
            [[ACTION: {"type": "START_ACTIVITY", "name": "Study ISTQB", "category": "Study"}]]
            or
            [[ACTION: {"type": "SAVE_NOTE", "text": "Investigate API timeout issue"}]]
            
            Current PAIOS User Context:
            $contextBuilder
        """.trimIndent()

        val request = GeminiRequest(
            contents = listOf(
                GeminiContent(
                    parts = listOf(GeminiPart(text = userText)),
                    role = "user"
                )
            ),
            systemInstruction = GeminiContent(
                parts = listOf(GeminiPart(text = systemInstruction))
            ),
            generationConfig = GeminiGenerationConfig(temperature = 0.7f)
        )

        return try {
            val response = GeminiApiClient.service.generateContent(
                model = settings.aiModel.ifBlank { "gemini-3.5-flash" },
                apiKey = apiKey,
                request = request
            )
            val aiResponseText = response.candidates?.firstOrNull()?.content?.parts?.firstOrNull()?.text
                ?: response.error?.message ?: "I could not generate a response. Please check your network or API key."

            // Check if structured action is present
            var actionType: String? = null
            var actionPayloadJson: String? = null
            val actionRegex = Regex("""\[\[ACTION:\s*(\{.*?\})\s*\]\]""", RegexOption.DOT_MATCHES_ALL)
            val match = actionRegex.find(aiResponseText)
            if (match != null) {
                actionPayloadJson = match.groupValues[1]
                if (actionPayloadJson.contains("ADD_TASK")) actionType = "ADD_TASK"
                else if (actionPayloadJson.contains("START_ACTIVITY")) actionType = "START_ACTIVITY"
                else if (actionPayloadJson.contains("SAVE_NOTE")) actionType = "SAVE_NOTE"
            }

            val cleanedText = aiResponseText.replace(actionRegex, "").trim()

            aiChatDao.insertMessage(
                AIMessageEntity(
                    sender = "AI",
                    text = cleanedText,
                    actionType = actionType,
                    actionPayloadJson = actionPayloadJson,
                    isActionConfirmed = null
                )
            )
            cleanedText
        } catch (e: Exception) {
            val errText = "Error communicating with AI: ${e.localizedMessage ?: "Network error"}"
            aiChatDao.insertMessage(AIMessageEntity(sender = "AI", text = errText))
            errText
        }
    }

    suspend fun confirmAiAction(messageId: Long, actionType: String, payloadJson: String) {
        when (actionType) {
            "ADD_TASK" -> {
                val titleRegex = Regex(""""title"\s*:\s*"([^"]+)"""")
                val title = titleRegex.find(payloadJson)?.groupValues?.get(1) ?: "New AI Task"
                addTask(TaskEntity(title = title, isPriorityPin = true))
            }
            "START_ACTIVITY" -> {
                val nameRegex = Regex(""""name"\s*:\s*"([^"]+)"""")
                val name = nameRegex.find(payloadJson)?.groupValues?.get(1) ?: "AI Activity"
                startActivity(name = name, category = "Work")
            }
            "SAVE_NOTE" -> {
                val textRegex = Regex(""""text"\s*:\s*"([^"]+)"""")
                val text = textRegex.find(payloadJson)?.groupValues?.get(1) ?: "AI Note"
                addQuickCapture(text = text)
            }
        }
    }
}
