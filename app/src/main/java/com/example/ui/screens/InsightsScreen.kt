package com.example.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Analytics
import androidx.compose.material.icons.filled.Lightbulb
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.ActivityLogEntity
import com.example.data.model.TaskEntity
import com.example.data.model.TimelineEntryEntity
import com.example.ui.viewmodel.PaiosViewModel

@Composable
fun InsightsScreen(
    viewModel: PaiosViewModel,
    tasks: List<TaskEntity>,
    activities: List<ActivityLogEntity>,
    timelineEntries: List<TimelineEntryEntity>
) {
    val totalTasks = tasks.size
    val completedTasks = tasks.count { it.status == "COMPLETED" }
    val completionPercent = if (totalTasks > 0) (completedTasks * 100) / totalTasks else 0

    val workMins = timelineEntries.filter { it.category.equals("Work", ignoreCase = true) }.sumOf { it.durationMinutes ?: 0 }
    val studyMins = timelineEntries.filter { it.category.equals("Study", ignoreCase = true) }.sumOf { it.durationMinutes ?: 0 }
    val personalMins = timelineEntries.filter { it.category.equals("Personal", ignoreCase = true) }.sumOf { it.durationMinutes ?: 0 }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 20.dp)
            .testTag("insights_screen"),
        verticalArrangement = Arrangement.spacedBy(20.dp)
    ) {
        item { Spacer(modifier = Modifier.height(4.dp)) }

        item {
            Column {
                Text(
                    text = "Insights & Patterns",
                    style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Bold)
                )
                Text(
                    text = "Long-term trends and observations.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        // STATS OVERVIEW CARD
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(
                    modifier = Modifier.padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Text(
                        text = "SUMMARY STATS",
                        style = MaterialTheme.typography.labelMedium.copy(
                            fontWeight = FontWeight.Black,
                            letterSpacing = 1.2.sp
                        ),
                        color = MaterialTheme.colorScheme.primary
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceAround
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("Work", style = MaterialTheme.typography.labelMedium)
                            Text("${workMins / 60}h ${workMins % 60}m", style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold))
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("Study", style = MaterialTheme.typography.labelMedium)
                            Text("${studyMins / 60}h ${studyMins % 60}m", style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold))
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("Personal", style = MaterialTheme.typography.labelMedium)
                            Text("${personalMins / 60}h ${personalMins % 60}m", style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold))
                        }
                    }

                    Divider()

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Task Completion Rate", style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold))
                        Text("$completionPercent%", style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary))
                    }

                    LinearProgressIndicator(
                        progress = { completionPercent / 100f },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(8.dp),
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }
        }

        // PATTERNS SECTION
        item {
            Text(
                text = "PATTERNS & OBSERVATIONS",
                style = MaterialTheme.typography.labelMedium.copy(
                    fontWeight = FontWeight.Black,
                    letterSpacing = 1.2.sp
                ),
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        if (timelineEntries.size < 2 && tasks.isEmpty()) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.Lightbulb, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(
                            text = "Keep using PAIOS. Insights will appear as more data is collected.",
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                }
            }
        } else {
            item {
                PatternCard(
                    title = "Focus Consistency",
                    body = if (studyMins > 0) "You study most consistently when starting sessions early in your day." else "You achieve maximum task completion when setting 1-3 priorities in the morning."
                )
            }
            item {
                PatternCard(
                    title = "Priority Correlation",
                    body = "You complete more tasks on days with fewer pinned priorities."
                )
            }
        }

        item { Spacer(modifier = Modifier.height(30.dp)) }
    }
}

@Composable
fun PatternCard(title: String, body: String) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.Top
        ) {
            Icon(
                imageVector = Icons.Default.Analytics,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text(text = title, style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold))
                Spacer(modifier = Modifier.height(4.dp))
                Text(text = body, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}
