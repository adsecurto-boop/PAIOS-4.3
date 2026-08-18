package com.example.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.database.PaiosDatabase
import com.example.data.model.*
import com.example.data.repository.PaiosRepository
import com.example.data.repository.SearchResults
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

class PaiosViewModel(application: Application) : AndroidViewModel(application) {
    val repository: PaiosRepository = PaiosRepository(PaiosDatabase.getDatabase(application))

    val activeActivity: StateFlow<ActivityLogEntity?> = repository.getActiveActivityFlow()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    val tasks: StateFlow<List<TaskEntity>> = repository.getAllTasks()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val todayPriorities: StateFlow<List<TaskEntity>> = repository.getTodayPriorities()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val todayTimeline: StateFlow<List<TimelineEntryEntity>> = repository.getTodayTimeline()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val allTimeline: StateFlow<List<TimelineEntryEntity>> = repository.getAllTimeline()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val todayCaptures: StateFlow<List<QuickCaptureEntity>> = repository.getTodayCaptures()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val morningCheckIn: StateFlow<MorningCheckInEntity?> = repository.getTodayMorningCheckInFlow()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    val eveningReview: StateFlow<EveningReviewEntity?> = repository.getTodayEveningReviewFlow()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    val journalEntries: StateFlow<List<JournalEntryEntity>> = repository.getAllJournalEntries()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val studyCards: StateFlow<List<StudyCardEntity>> = repository.getAllStudyCards()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val aiMessages: StateFlow<List<AIMessageEntity>> = repository.getAiMessagesFlow()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val userSettings: StateFlow<UserSettingsEntity?> = repository.getSettingsFlow()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    private val _searchResults = MutableStateFlow(SearchResults())
    val searchResults: StateFlow<SearchResults> = _searchResults.asStateFlow()

    private val _isAiLoading = MutableStateFlow(false)
    val isAiLoading: StateFlow<Boolean> = _isAiLoading.asStateFlow()

    private val _liveElapsedSeconds = MutableStateFlow(0L)
    val liveElapsedSeconds: StateFlow<Long> = _liveElapsedSeconds.asStateFlow()

    init {
        // Start Timer Live Ticker
        viewModelScope.launch {
            while (true) {
                val current = activeActivity.value
                if (current != null) {
                    val now = System.currentTimeMillis()
                    if (current.isRunning && !current.isPaused) {
                        val grossSecs = (now - current.startTimeMillis) / 1000
                        val netSecs = maxOf(0L, grossSecs - current.accumulatedPausedDurationSeconds)
                        _liveElapsedSeconds.value = netSecs
                    } else if (current.isPaused) {
                        val pauseStart = current.pauseStartTimeMillis ?: now
                        val grossSecs = (pauseStart - current.startTimeMillis) / 1000
                        val netSecs = maxOf(0L, grossSecs - current.accumulatedPausedDurationSeconds)
                        _liveElapsedSeconds.value = netSecs
                    }
                } else {
                    _liveElapsedSeconds.value = 0L
                }
                delay(1000)
            }
        }

        // Seed initial default data if empty
        viewModelScope.launch {
            repository.getSettings() // Ensures settings entity exists
        }
    }

    // --- TASK ACTIONS ---
    fun addTask(title: String, category: String = "Work", isPriority: Boolean = false, description: String = "") {
        viewModelScope.launch {
            repository.addTask(
                TaskEntity(
                    title = title,
                    category = category,
                    isPriorityPin = isPriority,
                    description = description
                )
            )
        }
    }

    fun toggleTaskStatus(task: TaskEntity) {
        viewModelScope.launch {
            val nextStatus = if (task.status == "COMPLETED") "TODO" else "COMPLETED"
            val completedTime = if (nextStatus == "COMPLETED") System.currentTimeMillis() else null
            repository.updateTask(
                task.copy(status = nextStatus, completedAtMillis = completedTime)
            )
        }
    }

    fun toggleTaskPriorityPin(task: TaskEntity) {
        viewModelScope.launch {
            repository.updateTask(task.copy(isPriorityPin = !task.isPriorityPin))
        }
    }

    fun deleteTask(taskId: Long) {
        viewModelScope.launch { repository.deleteTask(taskId) }
    }

    // --- ACTIVITY TIMER ACTIONS ---
    fun startActivity(name: String, category: String, note: String? = null) {
        viewModelScope.launch { repository.startActivity(name, category, note) }
    }

    fun pauseActivity(activityId: Long) {
        viewModelScope.launch { repository.pauseActivity(activityId) }
    }

    fun resumeActivity(activityId: Long) {
        viewModelScope.launch { repository.resumeActivity(activityId) }
    }

    fun finishActivity(activityId: Long, note: String? = null) {
        viewModelScope.launch { repository.finishActivity(activityId, note) }
    }

    // --- QUICK CAPTURE ---
    fun addQuickCapture(text: String, category: String = "Personal") {
        viewModelScope.launch { repository.addQuickCapture(text, category) }
    }

    fun deleteQuickCapture(id: Long) {
        viewModelScope.launch { repository.deleteQuickCapture(id) }
    }

    fun deleteTimelineEntry(id: Long) {
        viewModelScope.launch { repository.deleteTimelineEntry(id) }
    }

    // --- CHECK-IN & REVIEW ---
    fun saveMorningCheckIn(checkIn: MorningCheckInEntity) {
        viewModelScope.launch { repository.saveMorningCheckIn(checkIn) }
    }

    fun saveEveningReview(review: EveningReviewEntity) {
        viewModelScope.launch { repository.saveEveningReview(review) }
    }

    // --- JOURNAL ---
    fun addJournalEntry(title: String, content: String, tags: String = "") {
        viewModelScope.launch { repository.addJournalEntry(title, content, tags) }
    }

    fun deleteJournalEntry(id: Long) {
        viewModelScope.launch { repository.deleteJournalEntry(id) }
    }

    // --- STUDY ---
    fun addStudyCard(topic: String, question: String, answer: String) {
        viewModelScope.launch { repository.addStudyCard(topic, question, answer) }
    }

    fun reviewStudyCard(cardId: Long, rating: String) {
        viewModelScope.launch { repository.reviewStudyCard(cardId, rating) }
    }

    fun deleteStudyCard(id: Long) {
        viewModelScope.launch { repository.deleteStudyCard(id) }
    }

    // --- GLOBAL SEARCH ---
    fun performSearch(query: String) {
        viewModelScope.launch {
            _searchResults.value = repository.globalSearch(query)
        }
    }

    // --- AI CHAT ---
    fun sendAiPrompt(prompt: String) {
        if (prompt.isBlank() || _isAiLoading.value) return
        viewModelScope.launch {
            _isAiLoading.value = true
            repository.processUserAiPrompt(prompt)
            _isAiLoading.value = false
        }
    }

    fun confirmAiAction(messageId: Long, actionType: String, payloadJson: String) {
        viewModelScope.launch {
            repository.confirmAiAction(messageId, actionType, payloadJson)
        }
    }

    fun clearAiChat() {
        viewModelScope.launch { repository.clearAiMessages() }
    }

    // --- SETTINGS ---
    fun saveSettings(settings: UserSettingsEntity) {
        viewModelScope.launch { repository.saveSettings(settings) }
    }
}
