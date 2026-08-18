package com.example.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.data.repository.SearchResults

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SearchDialog(
    searchResults: SearchResults,
    onSearch: (String) -> Unit,
    onDismiss: () -> Unit
) {
    var query by remember { mutableStateOf("") }
    val focusRequester = remember { FocusRequester() }

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
                .padding(horizontal = 20.dp, vertical = 12.dp)
                .navigationBarsPadding(),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            OutlinedTextField(
                value = query,
                onValueChange = {
                    query = it
                    onSearch(it)
                },
                placeholder = { Text("Search PAIOS (tasks, timeline, notes, journal)...") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = "Search") },
                trailingIcon = {
                    if (query.isNotEmpty()) {
                        IconButton(onClick = { query = ""; onSearch("") }) {
                            Icon(Icons.Default.Close, contentDescription = "Clear")
                        }
                    }
                },
                singleLine = true,
                modifier = Modifier
                    .fillMaxWidth()
                    .focusRequester(focusRequester)
                    .testTag("global_search_input"),
                shape = RoundedCornerShape(16.dp)
            )

            LazyColumn(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 400.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                if (query.isBlank()) {
                    item {
                        Text(
                            text = "Type keywords to search across your tasks, notes, timeline logs, journal, and active recall cards.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(vertical = 16.dp)
                        )
                    }
                } else {
                    val totalHits = searchResults.tasks.size + searchResults.timeline.size +
                            searchResults.captures.size + searchResults.journal.size + searchResults.studyCards.size

                    if (totalHits == 0) {
                        item {
                            Text("No matching items found.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    } else {
                        if (searchResults.tasks.isNotEmpty()) {
                            item { Text("TASKS (${searchResults.tasks.size})", style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)) }
                            items(searchResults.tasks) { task ->
                                SearchResultCard(title = task.title, category = task.category, badge = task.status)
                            }
                        }

                        if (searchResults.captures.isNotEmpty()) {
                            item { Text("NOTES & CAPTURES (${searchResults.captures.size})", style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)) }
                            items(searchResults.captures) { cap ->
                                SearchResultCard(title = cap.text, category = cap.category ?: "Note", badge = "Capture")
                            }
                        }

                        if (searchResults.timeline.isNotEmpty()) {
                            item { Text("TIMELINE ENTRIES (${searchResults.timeline.size})", style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)) }
                            items(searchResults.timeline) { entry ->
                                SearchResultCard(title = entry.title, category = entry.category, badge = entry.type)
                            }
                        }

                        if (searchResults.journal.isNotEmpty()) {
                            item { Text("JOURNAL (${searchResults.journal.size})", style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)) }
                            items(searchResults.journal) { j ->
                                SearchResultCard(title = j.title, category = "Journal", badge = j.tags)
                            }
                        }

                        if (searchResults.studyCards.isNotEmpty()) {
                            item { Text("LEARNING QA (${searchResults.studyCards.size})", style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)) }
                            items(searchResults.studyCards) { s ->
                                SearchResultCard(title = "${s.question} → ${s.answer}", category = s.topic, badge = "Confidence ${s.confidence}/10")
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))
        }
    }
}

@Composable
fun SearchResultCard(title: String, category: String, badge: String) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(text = title, style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold))
                Text(text = category, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            AssistChip(
                onClick = {},
                label = { Text(badge, style = MaterialTheme.typography.labelSmall) }
            )
        }
    }
}
