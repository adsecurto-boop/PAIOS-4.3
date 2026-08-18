package com.example.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.data.model.MorningCheckInEntity
import kotlin.math.roundToInt

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CheckInSheet(
    dateString: String,
    existingCheckIn: MorningCheckInEntity?,
    onDismiss: () -> Unit,
    onSave: (MorningCheckInEntity) -> Unit
) {
    var sleepHours by remember { mutableFloatStateOf(existingCheckIn?.sleepHours ?: 7.5f) }
    var sleepQuality by remember { mutableFloatStateOf((existingCheckIn?.sleepQuality ?: 8).toFloat()) }
    var energy by remember { mutableFloatStateOf((existingCheckIn?.energy ?: 8).toFloat()) }
    var mood by remember { mutableFloatStateOf((existingCheckIn?.mood ?: 8).toFloat()) }
    var mainGoal by remember { mutableStateOf(existingCheckIn?.mainGoal ?: "") }
    var priority1 by remember { mutableStateOf(existingCheckIn?.priority1 ?: "") }
    var priority2 by remember { mutableStateOf(existingCheckIn?.priority2 ?: "") }
    var priority3 by remember { mutableStateOf(existingCheckIn?.priority3 ?: "") }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 12.dp)
                .verticalScroll(rememberScrollState())
                .navigationBarsPadding(),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(
                text = "Good morning! ☀️",
                style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold)
            )
            Text(
                text = "Take 2 minutes to orient your day.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            // Sleep Duration
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Sleep Duration", style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold))
                    Text("${String.format("%.1f", sleepHours)} hours", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.primary)
                }
                Slider(
                    value = sleepHours,
                    onValueChange = { sleepHours = it },
                    valueRange = 3f..12f,
                    steps = 17
                )
            }

            // Energy Level
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Energy Level", style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold))
                    Text("${energy.roundToInt()}/10", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.primary)
                }
                Slider(
                    value = energy,
                    onValueChange = { energy = it },
                    valueRange = 1f..10f,
                    steps = 8
                )
            }

            // Mood Level
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Mood", style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold))
                    Text("${mood.roundToInt()}/10", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.primary)
                }
                Slider(
                    value = mood,
                    onValueChange = { mood = it },
                    valueRange = 1f..10f,
                    steps = 8
                )
            }

            OutlinedTextField(
                value = mainGoal,
                onValueChange = { mainGoal = it },
                label = { Text("Today's main goal") },
                placeholder = { Text("e.g. Master API testing fundamentals") },
                singleLine = true,
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("checkin_main_goal"),
                shape = RoundedCornerShape(12.dp)
            )

            Text(
                text = "Top Priorities (1 - 3)",
                style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold)
            )

            OutlinedTextField(
                value = priority1,
                onValueChange = { priority1 = it },
                placeholder = { Text("1. Finish API testing") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(10.dp)
            )
            OutlinedTextField(
                value = priority2,
                onValueChange = { priority2 = it },
                placeholder = { Text("2. Study ISTQB Section 1.3") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(10.dp)
            )
            OutlinedTextField(
                value = priority3,
                onValueChange = { priority3 = it },
                placeholder = { Text("3. Work on PAIOS app") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(10.dp)
            )

            Button(
                onClick = {
                    onSave(
                        MorningCheckInEntity(
                            dateString = dateString,
                            sleepHours = sleepHours,
                            sleepQuality = sleepQuality.roundToInt(),
                            energy = energy.roundToInt(),
                            mood = mood.roundToInt(),
                            mainGoal = mainGoal.trim(),
                            priority1 = priority1.trim(),
                            priority2 = priority2.trim(),
                            priority3 = priority3.trim()
                        )
                    )
                    onDismiss()
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp)
                    .testTag("start_my_day_button"),
                shape = RoundedCornerShape(14.dp)
            ) {
                Text("START MY DAY", style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold))
            }

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}
