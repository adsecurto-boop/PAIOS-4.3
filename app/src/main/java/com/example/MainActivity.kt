package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.ui.components.*
import com.example.ui.screens.*
import com.example.ui.theme.PaiosTheme
import com.example.ui.viewmodel.PaiosViewModel

enum class NavTab(val title: String, val selectedIcon: ImageVector, val unselectedIcon: ImageVector) {
    TODAY("Today", Icons.Filled.Today, Icons.Outlined.Today),
    TIMELINE("Timeline", Icons.Filled.History, Icons.Outlined.History),
    TASKS("Tasks", Icons.Filled.CheckCircle, Icons.Outlined.CheckCircle),
    LEARN("Learn", Icons.Filled.Psychology, Icons.Outlined.Psychology),
    INSIGHTS("Insights", Icons.Filled.Analytics, Icons.Outlined.Analytics)
}

class MainActivity : ComponentActivity() {
    private val viewModel: PaiosViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            val userSettings by viewModel.userSettings.collectAsStateWithLifecycle()
            val activeActivity by viewModel.activeActivity.collectAsStateWithLifecycle()
            val liveElapsedSeconds by viewModel.liveElapsedSeconds.collectAsStateWithLifecycle()
            val todayPriorities by viewModel.todayPriorities.collectAsStateWithLifecycle()
            val allTasks by viewModel.tasks.collectAsStateWithLifecycle()
            val todayTimeline by viewModel.todayTimeline.collectAsStateWithLifecycle()
            val allTimeline by viewModel.allTimeline.collectAsStateWithLifecycle()
            val morningCheckIn by viewModel.morningCheckIn.collectAsStateWithLifecycle()
            val eveningReview by viewModel.eveningReview.collectAsStateWithLifecycle()
            val journalEntries by viewModel.journalEntries.collectAsStateWithLifecycle()
            val studyCards by viewModel.studyCards.collectAsStateWithLifecycle()
            val aiMessages by viewModel.aiMessages.collectAsStateWithLifecycle()
            val isAiLoading by viewModel.isAiLoading.collectAsStateWithLifecycle()
            val searchResults by viewModel.searchResults.collectAsStateWithLifecycle()

            var currentTab by remember { mutableStateOf(NavTab.TODAY) }

            // Sheet & Overlay states
            var showStartActivitySheet by remember { mutableStateOf(false) }
            var showQuickCaptureSheet by remember { mutableStateOf(false) }
            var showTaskDialog by remember { mutableStateOf(false) }
            var showCheckInSheet by remember { mutableStateOf(false) }
            var showReviewSheet by remember { mutableStateOf(false) }
            var showSearchDialog by remember { mutableStateOf(false) }
            var showStudyCardDialog by remember { mutableStateOf(false) }
            var showAiOverlay by remember { mutableStateOf(false) }
            var showJournalScreen by remember { mutableStateOf(false) }
            var showSettingsScreen by remember { mutableStateOf(false) }

            val themeMode = userSettings?.themeMode ?: "SYSTEM"
            val userName = userSettings?.userName ?: "Alex"

            PaiosTheme(themeMode = themeMode) {
                if (showSettingsScreen) {
                    SettingsScreen(
                        viewModel = viewModel,
                        settings = userSettings,
                        onBack = { showSettingsScreen = false }
                    )
                } else if (showAiOverlay) {
                    AiScreen(
                        viewModel = viewModel,
                        messages = aiMessages,
                        isLoading = isAiLoading,
                        onDismiss = { showAiOverlay = false }
                    )
                } else if (showJournalScreen) {
                    JournalScreen(
                        viewModel = viewModel,
                        journalEntries = journalEntries
                    )
                } else {
                    Scaffold(
                        modifier = Modifier.fillMaxSize(),
                        topBar = {
                            TopHeaderBar(
                                userName = userName,
                                onOpenSearch = { showSearchDialog = true },
                                onOpenCheckIn = { showCheckInSheet = true },
                                onOpenReview = { showReviewSheet = true },
                                onOpenSettings = { showSettingsScreen = true }
                            )
                        },
                        bottomBar = {
                            Column {
                                // Persistent Mini Timer Player when activity is active and not on Today screen
                                if (activeActivity != null && currentTab != NavTab.TODAY) {
                                    MiniTimerPlayer(
                                        activity = activeActivity,
                                        elapsedSeconds = liveElapsedSeconds,
                                        onPause = { viewModel.pauseActivity(it) },
                                        onResume = { viewModel.resumeActivity(it) },
                                        onFinish = { viewModel.finishActivity(it) },
                                        onTap = { currentTab = NavTab.TODAY }
                                    )
                                }

                                NavigationBar(
                                    modifier = Modifier
                                        .windowInsetsPadding(WindowInsets.navigationBars)
                                        .testTag("main_navigation_bar")
                                ) {
                                    NavTab.values().forEach { tab ->
                                        NavigationBarItem(
                                            selected = currentTab == tab,
                                            onClick = { currentTab = tab },
                                            icon = {
                                                Icon(
                                                    imageVector = if (currentTab == tab) tab.selectedIcon else tab.unselectedIcon,
                                                    contentDescription = tab.title
                                                )
                                            },
                                            label = { Text(tab.title) }
                                        )
                                    }
                                }
                            }
                        },
                        floatingActionButton = {
                            FloatingActionButton(
                                onClick = { showAiOverlay = true },
                                containerColor = MaterialTheme.colorScheme.primaryContainer,
                                contentColor = MaterialTheme.colorScheme.onPrimaryContainer,
                                modifier = Modifier
                                    .padding(bottom = 8.dp)
                                    .testTag("floating_ai_fab")
                            ) {
                                Icon(Icons.Default.AutoAwesome, contentDescription = "PAIOS AI")
                            }
                        }
                    ) { innerPadding ->
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(innerPadding)
                        ) {
                            when (currentTab) {
                                NavTab.TODAY -> TodayScreen(
                                    viewModel = viewModel,
                                    activeActivity = activeActivity,
                                    elapsedSeconds = liveElapsedSeconds,
                                    priorities = todayPriorities,
                                    todayTasks = allTasks,
                                    timelineEntries = todayTimeline,
                                    userName = userName,
                                    onOpenStartActivity = { showStartActivitySheet = true },
                                    onOpenQuickCapture = { showQuickCaptureSheet = true },
                                    onOpenAddTask = { showTaskDialog = true },
                                    onOpenJournal = { showJournalScreen = true },
                                    onOpenStudy = { currentTab = NavTab.LEARN }
                                )
                                NavTab.TIMELINE -> TimelineScreen(
                                    viewModel = viewModel,
                                    timelineEntries = allTimeline
                                )
                                NavTab.TASKS -> TasksScreen(
                                    viewModel = viewModel,
                                    tasks = allTasks,
                                    onOpenAddTask = { showTaskDialog = true }
                                )
                                NavTab.LEARN -> LearnScreen(
                                    viewModel = viewModel,
                                    studyCards = studyCards,
                                    onStartStudySession = { topic, durationMins ->
                                        viewModel.startActivity(topic, "Study", "$durationMins minute study session")
                                        currentTab = NavTab.TODAY
                                    },
                                    onOpenAddCard = { showStudyCardDialog = true }
                                )
                                NavTab.INSIGHTS -> InsightsScreen(
                                    viewModel = viewModel,
                                    tasks = allTasks,
                                    activities = emptyList(),
                                    timelineEntries = allTimeline
                                )
                            }
                        }
                    }
                }

                // Bottom Sheets
                if (showStartActivitySheet) {
                    StartActivitySheet(
                        onDismiss = { showStartActivitySheet = false },
                        onStart = { name, category, note ->
                            viewModel.startActivity(name, category, note)
                        }
                    )
                }

                if (showQuickCaptureSheet) {
                    QuickCaptureSheet(
                        onDismiss = { showQuickCaptureSheet = false },
                        onSave = { text, category ->
                            viewModel.addQuickCapture(text, category)
                        }
                    )
                }

                if (showTaskDialog) {
                    TaskDialog(
                        onDismiss = { showTaskDialog = false },
                        onSave = { title, category, isPriority, desc ->
                            viewModel.addTask(title, category, isPriority, desc)
                        }
                    )
                }

                if (showCheckInSheet) {
                    CheckInSheet(
                        dateString = viewModel.repository.getTodayDateString(),
                        existingCheckIn = morningCheckIn,
                        onDismiss = { showCheckInSheet = false },
                        onSave = { checkIn ->
                            viewModel.saveMorningCheckIn(checkIn)
                        }
                    )
                }

                if (showReviewSheet) {
                    val totalMins = todayTimeline.sumOf { it.durationMinutes ?: 0 }
                    val activeTimeText = "${totalMins / 60}h ${totalMins % 60}m"
                    val tasksCompletedText = "${allTasks.count { it.status == "COMPLETED" }} / ${allTasks.size} completed"

                    ReviewSheet(
                        dateString = viewModel.repository.getTodayDateString(),
                        activeTimeText = activeTimeText,
                        tasksCompletedText = tasksCompletedText,
                        existingReview = eveningReview,
                        onDismiss = { showReviewSheet = false },
                        onSave = { review ->
                            viewModel.saveEveningReview(review)
                        }
                    )
                }

                if (showSearchDialog) {
                    SearchDialog(
                        searchResults = searchResults,
                        onSearch = { query -> viewModel.performSearch(query) },
                        onDismiss = { showSearchDialog = false }
                    )
                }

                if (showStudyCardDialog) {
                    StudyCardDialog(
                        onDismiss = { showStudyCardDialog = false },
                        onSave = { topic, question, answer ->
                            viewModel.addStudyCard(topic, question, answer)
                        }
                    )
                }
            }
        }
    }
}
