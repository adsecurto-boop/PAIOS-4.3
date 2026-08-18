package com.example.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StudyCardDialog(
    onDismiss: () -> Unit,
    onSave: (topic: String, question: String, answer: String) -> Unit
) {
    var topic by remember { mutableStateOf("") }
    var question by remember { mutableStateOf("") }
    var answer by remember { mutableStateOf("") }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 16.dp)
                .navigationBarsPadding(),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(
                text = "New Active Recall Card",
                style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold)
            )

            OutlinedTextField(
                value = topic,
                onValueChange = { topic = it },
                label = { Text("Topic / Subject") },
                placeholder = { Text("e.g. ISTQB - Test Levels") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth().testTag("study_topic_input"),
                shape = RoundedCornerShape(12.dp)
            )

            OutlinedTextField(
                value = question,
                onValueChange = { question = it },
                label = { Text("Question or Prompt") },
                placeholder = { Text("e.g. What is integration testing?") },
                modifier = Modifier.fillMaxWidth().testTag("study_question_input"),
                shape = RoundedCornerShape(12.dp)
            )

            OutlinedTextField(
                value = answer,
                onValueChange = { answer = it },
                label = { Text("Answer") },
                placeholder = { Text("e.g. Integration testing checks interactions between components.") },
                modifier = Modifier.fillMaxWidth().height(100.dp).testTag("study_answer_input"),
                shape = RoundedCornerShape(12.dp)
            )

            Button(
                onClick = {
                    if (topic.isNotBlank() && question.isNotBlank() && answer.isNotBlank()) {
                        onSave(topic.trim(), question.trim(), answer.trim())
                        onDismiss()
                    }
                },
                enabled = topic.isNotBlank() && question.isNotBlank() && answer.isNotBlank(),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp)
                    .testTag("save_study_card_button"),
                shape = RoundedCornerShape(14.dp)
            ) {
                Text("SAVE CARD", style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold))
            }

            Spacer(modifier = Modifier.height(12.dp))
        }
    }
}
