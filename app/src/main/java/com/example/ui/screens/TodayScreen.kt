package com.example.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.ActivityLogEntity
import com.example.data.model.TaskEntity
import com.example.data.model.TimelineEntryEntity
import com.example.ui.viewmodel.PaiosViewModel
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

@Composable
fun TodayScreen(
    viewModel: PaiosViewModel,
    activeActivity: ActivityLogEntity?,
    elapsedSeconds: Long,
    priorities: List<TaskEntity>,
    todayTasks: List<TaskEntity>,
    timelineEntries: List<TimelineEntryEntity>,
    userName: String,
    onOpenStartActivity: () -> Unit,
    onOpenQuickCapture: () -> Unit,
    onOpenAddTask: () -> Unit,
    onOpenJournal: () -> Unit,
    onOpenStudy: () -> Unit
) {
    val greeting = remember {
        val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
        when {
            hour < 12 -> "Good morning"
            hour < 17 -> "Good afternoon"
            else -> "Good evening"
        }
    }

    val completedTasksCount = todayTasks.count { it.status == "COMPLETED" }
    val totalTasksCount = todayTasks.size

    val totalActiveMins = timelineEntries.sumOf { it.durationMinutes ?: 0 }
    val activeHours = totalActiveMins / 60
    val activeMinsRemaining = totalActiveMins % 60

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 20.dp)
            .testTag("today_screen_list"),
        verticalArrangement = Arrangement.spacedBy(20.dp)
    ) {
        item { Spacer(modifier = Modifier.height(4.dp)) }

        // Greeting Header
        item {
            Column {
                Text(
                    text = "$greeting, $userName",
                    style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Bold)
                )
                Text(
                    text = SimpleDateFormat("EEEE, MMMM d", Locale.getDefault()).format(Date()),
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        // CURRENT ACTIVITY CARD
        item {
            CurrentActivityCard(
                activity = activeActivity,
                elapsedSeconds = elapsedSeconds,
                onStart = onOpenStartActivity,
                onPause = { viewModel.pauseActivity(it) },
                onResume = { viewModel.resumeActivity(it) },
                onFinish = { viewModel.finishActivity(it) }
            )
        }

        // TODAY'S PRIORITIES (1-3)
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(
                    modifier = Modifier.padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "TODAY'S PRIORITIES",
                            style = MaterialTheme.typography.labelMedium.copy(
                                fontWeight = FontWeight.Black,
                                letterSpacing = 1.2.sp
                            ),
                            color = MaterialTheme.colorScheme.primary
                        )
                        IconButton(
                            onClick = onOpenAddTask,
                            modifier = Modifier
                                .size(32.dp)
                                .background(MaterialTheme.colorScheme.surfaceVariant, CircleShape)
                        ) {
                            Icon(Icons.Default.Add, contentDescription = "Add Priority Task", modifier = Modifier.size(18.dp))
                        }
                    }

                    if (priorities.isEmpty()) {
                        Text(
                            text = "No priorities set. Pin 1-3 tasks to focus your day.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    } else {
                        priorities.forEachIndexed { index, task ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(12.dp))
                                    .clickable { viewModel.toggleTaskStatus(task) }
                                    .padding(vertical = 8.dp, horizontal = 4.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Checkbox(
                                    checked = task.status == "COMPLETED",
                                    onCheckedChange = { viewModel.toggleTaskStatus(task) },
                                    modifier = Modifier.size(24.dp)
                                )
                                Spacer(modifier = Modifier.width(12.dp))
                                Text(
                                    text = "${index + 1}. ${task.title}",
                                    style = MaterialTheme.typography.bodyLarge.copy(
                                        fontWeight = FontWeight.SemiBold,
                                        textDecoration = if (task.status == "COMPLETED") TextDecoration.LineThrough else TextDecoration.None
                                    ),
                                    color = if (task.status == "COMPLETED") MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface
                                )
                            }
                        }
                    }
                }
            }
        }

        // TODAY'S PROGRESS
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(20.dp),
                    horizontalArrangement = Arrangement.SpaceAround,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "Tasks Progress",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "$completedTasksCount / $totalTasksCount completed",
                            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
                        )
                    }

                    Divider(modifier = Modifier.height(36.dp).width(1.dp), color = MaterialTheme.colorScheme.outlineVariant)

                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "Active Time",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "${activeHours}h ${activeMinsRemaining}m active",
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary
                            )
                        )
                    }
                }
            }
        }

        // QUICK ACTIONS
        item {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    text = "QUICK ACTIONS",
                    style = MaterialTheme.typography.labelMedium.copy(
                        fontWeight = FontWeight.Black,
                        letterSpacing = 1.2.sp
                    ),
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    AssistChip(
                        onClick = onOpenStartActivity,
                        label = { Text("+ Start") },
                        leadingIcon = { Icon(Icons.Default.PlayArrow, contentDescription = null, modifier = Modifier.size(16.dp)) },
                        modifier = Modifier.weight(1f)
                    )
                    AssistChip(
                        onClick = onOpenAddTask,
                        label = { Text("+ Task") },
                        leadingIcon = { Icon(Icons.Default.AddTask, contentDescription = null, modifier = Modifier.size(16.dp)) },
                        modifier = Modifier.weight(1f)
                    )
                    AssistChip(
                        onClick = onOpenQuickCapture,
                        label = { Text("+ Capture") },
                        leadingIcon = { Icon(Icons.Default.EditNote, contentDescription = null, modifier = Modifier.size(16.dp)) },
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }

        // TIMELINE SNIPPET
        item {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    text = "TIMELINE",
                    style = MaterialTheme.typography.labelMedium.copy(
                        fontWeight = FontWeight.Black,
                        letterSpacing = 1.2.sp
                    ),
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                if (timelineEntries.isEmpty()) {
                    Text(
                        text = "No events logged today yet. Start an activity to record your timeline.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                } else {
                    timelineEntries.take(5).forEach { entry ->
                        TimelineRowItem(entry = entry)
                    }
                }
            }
        }

        // QUICK CAPTURE PROMPT CARD
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onOpenQuickCapture() },
                shape = RoundedCornerShape(24.dp),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(20.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "Quick Capture",
                            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                            color = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                        Text(
                            text = "\"What are you thinking about?\"",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.8f)
                        )
                    }
                    Button(
                        onClick = onOpenQuickCapture,
                        shape = RoundedCornerShape(16.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                    ) {
                        Text("+ Capture")
                    }
                }
            }
        }

        item { Spacer(modifier = Modifier.height(30.dp)) }
    }
}

@Composable
fun CurrentActivityCard(
    activity: ActivityLogEntity?,
    elapsedSeconds: Long,
    onStart: () -> Unit,
    onPause: (Long) -> Unit,
    onResume: (Long) -> Unit,
    onFinish: (Long) -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(28.dp),
        border = BorderStroke(1.dp, if (activity != null) MaterialTheme.colorScheme.primary.copy(alpha = 0.3f) else MaterialTheme.colorScheme.outlineVariant),
        colors = CardDefaults.cardColors(
            containerColor = if (activity != null) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = "CURRENT ACTIVITY",
                style = MaterialTheme.typography.labelMedium.copy(
                    fontWeight = FontWeight.Black,
                    letterSpacing = 1.2.sp
                ),
                color = if (activity != null) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurfaceVariant
            )

            if (activity == null || !activity.isRunning) {
                Text(
                    text = "No activity running.",
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Button(
                    onClick = onStart,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(46.dp)
                        .testTag("start_activity_card_button"),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.Default.PlayArrow, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(" + Start Activity", style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold))
                }
            } else {
                val hours = elapsedSeconds / 3600
                val mins = (elapsedSeconds % 3600) / 60
                val secs = elapsedSeconds % 60
                val formattedTime = if (hours > 0) {
                    String.format(Locale.US, "%02d:%02d:%02d", hours, mins, secs)
                } else {
                    String.format(Locale.US, "%02d:%02d", mins, secs)
                }

                Text(
                    text = "${activity.activityName} — ${activity.category}",
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )

                Text(
                    text = formattedTime,
                    style = MaterialTheme.typography.headlineLarge.copy(
                        fontWeight = FontWeight.Black,
                        fontSize = 38.sp
                    ),
                    color = MaterialTheme.colorScheme.primary
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Button(
                        onClick = { if (activity.isPaused) onResume(activity.id) else onPause(activity.id) },
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.surface)
                    ) {
                        Icon(
                            imageVector = if (activity.isPaused) Icons.Default.PlayArrow else Icons.Default.Pause,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = if (activity.isPaused) "Resume" else "Pause",
                            color = MaterialTheme.colorScheme.primary
                        )
                    }

                    Button(
                        onClick = { onFinish(activity.id) },
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                    ) {
                        Icon(Icons.Default.Stop, contentDescription = null)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Finish")
                    }
                }
            }
        }
    }
}

@Composable
fun TimelineRowItem(entry: TimelineEntryEntity) {
    val timeStr = SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date(entry.timestampMillis))
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = timeStr,
            style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.Bold),
            color = MaterialTheme.colorScheme.primary,
            modifier = Modifier.width(55.dp)
        )
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = entry.title,
                style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold)
            )
            if (!entry.note.isNull_or_blank()) {
                Text(
                    text = entry.note!!,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
        if (entry.durationMinutes != null) {
            Text(
                text = "${entry.durationMinutes}m",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

private fun String?.isNull_or_blank(): Boolean = this == null || this.isBlank()
