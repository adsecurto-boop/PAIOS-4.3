package com.example.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StartActivitySheet(
    onDismiss: () -> Unit,
    onStart: (name: String, category: String, note: String?) -> Unit
) {
    var name by remember { mutableStateOf("") }
    var selectedCategory by remember { mutableStateOf("Work") }
    var note by remember { mutableStateOf("") }

    val categories = listOf("Work", "Study", "Coding", "Testing", "Personal", "Exercise", "Break", "Other")

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
                text = "Start Activity",
                style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold)
            )

            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                label = { Text("Activity name") },
                placeholder = { Text("e.g. ISTQB — Software Testing") },
                singleLine = true,
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("activity_name_input"),
                shape = RoundedCornerShape(12.dp)
            )

            Text(
                text = "Category",
                style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold)
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

            OutlinedTextField(
                value = note,
                onValueChange = { note = it },
                label = { Text("Optional note or goal") },
                placeholder = { Text("e.g. Focus on Chapter 2 questions") },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp)
            )

            Button(
                onClick = {
                    if (name.isNotBlank()) {
                        onStart(name.trim(), selectedCategory, note.ifBlank { null })
                        onDismiss()
                    }
                },
                enabled = name.isNotBlank(),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp)
                    .testTag("start_activity_button"),
                shape = RoundedCornerShape(14.dp)
            ) {
                Text(
                    text = "START TIMER",
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp
                    )
                )
            }

            Spacer(modifier = Modifier.height(12.dp))
        }
    }
}
