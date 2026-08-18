package com.example.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun QuickCaptureSheet(
    onDismiss: () -> Unit,
    onSave: (text: String, category: String) -> Unit
) {
    var text by remember { mutableStateOf("") }
    var selectedCategory by remember { mutableStateOf("Personal") }
    val focusRequester = remember { FocusRequester() }

    val categories = listOf("Personal", "Work", "Idea", "Note", "Study", "Coding")

    LaunchedEffect(Unit) {
        focusRequester.requestFocus()
    }

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
                text = "Quick Capture",
                style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold)
            )

            OutlinedTextField(
                value = text,
                onValueChange = { text = it },
                placeholder = { Text("What are you thinking about?") },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(120.dp)
                    .focusRequester(focusRequester)
                    .testTag("quick_capture_input"),
                shape = RoundedCornerShape(12.dp)
            )

            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                items(categories) { cat ->
                    FilterChip(
                        selected = selectedCategory == cat,
                        onClick = { selectedCategory = cat },
                        label = { Text(cat) },
                        shape = RoundedCornerShape(20.dp)
                    )
                }
            }

            Button(
                onClick = {
                    if (text.isNotBlank()) {
                        onSave(text.trim(), selectedCategory)
                        onDismiss()
                    }
                },
                enabled = text.isNotBlank(),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp)
                    .testTag("save_capture_button"),
                shape = RoundedCornerShape(14.dp)
            ) {
                Text(
                    text = "SAVE CAPTURE",
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
                )
            }

            Spacer(modifier = Modifier.height(12.dp))
        }
    }
}
