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
import com.example.data.model.EveningReviewEntity
import kotlin.math.roundToInt

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReviewSheet(
    dateString: String,
    activeTimeText: String,
    tasksCompletedText: String,
    existingReview: EveningReviewEntity?,
    onDismiss: () -> Unit,
    onSave: (EveningReviewEntity) -> Unit
) {
    var wentWell by remember { mutableStateOf(existingReview?.wentWell ?: "") }
    var didntGoWell by remember { mutableStateOf(existingReview?.didntGoWell ?: "") }
    var learnedText by remember { mutableStateOf(existingReview?.learnedText ?: "") }
    var doDifferently by remember { mutableStateOf(existingReview?.doDifferently ?: "") }
    var rating by remember { mutableFloatStateOf((existingReview?.rating ?: 8).toFloat()) }

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
                text = "Evening Review 🌙",
                style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold)
            )

            // Auto Calculated Day Summary Stats Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceAround,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("Active Time", style = MaterialTheme.typography.labelMedium)
                        Text(activeTimeText, style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold))
                    }
                    Divider(modifier = Modifier.height(30.dp).width(1.dp))
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("Tasks Done", style = MaterialTheme.typography.labelMedium)
                        Text(tasksCompletedText, style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold))
                    }
                }
            }

            OutlinedTextField(
                value = wentWell,
                onValueChange = { wentWell = it },
                label = { Text("What went well?") },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp)
            )

            OutlinedTextField(
                value = didntGoWell,
                onValueChange = { didntGoWell = it },
                label = { Text("What didn't go well?") },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp)
            )

            OutlinedTextField(
                value = learnedText,
                onValueChange = { learnedText = it },
                label = { Text("What did you learn today?") },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp)
            )

            OutlinedTextField(
                value = doDifferently,
                onValueChange = { doDifferently = it },
                label = { Text("What will you do differently tomorrow?") },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp)
            )

            // Day Rating Slider
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Day Rating", style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold))
                    Text("${rating.roundToInt()}/10", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.primary)
                }
                Slider(
                    value = rating,
                    onValueChange = { rating = it },
                    valueRange = 1f..10f,
                    steps = 8
                )
            }

            Button(
                onClick = {
                    onSave(
                        EveningReviewEntity(
                            dateString = dateString,
                            activeTimeFormatted = activeTimeText,
                            tasksCompletedText = tasksCompletedText,
                            wentWell = wentWell.trim(),
                            didntGoWell = didntGoWell.trim(),
                            learnedText = learnedText.trim(),
                            doDifferently = doDifferently.trim(),
                            rating = rating.roundToInt()
                        )
                    )
                    onDismiss()
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp)
                    .testTag("complete_review_button"),
                shape = RoundedCornerShape(14.dp)
            ) {
                Text("COMPLETE REVIEW", style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold))
            }

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}
