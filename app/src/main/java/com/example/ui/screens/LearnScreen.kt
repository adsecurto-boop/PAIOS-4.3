package com.example.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Psychology
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.StudyCardEntity
import com.example.ui.viewmodel.PaiosViewModel

@Composable
fun LearnScreen(
    viewModel: PaiosViewModel,
    studyCards: List<StudyCardEntity>,
    onStartStudySession: (topic: String, durationMins: Int) -> Unit,
    onOpenAddCard: () -> Unit
) {
    var activeCardIndex by remember { mutableIntStateOf(0) }

    Scaffold(
        floatingActionButton = {
            FloatingActionButton(
                onClick = onOpenAddCard,
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = MaterialTheme.colorScheme.onPrimary,
                modifier = Modifier.testTag("add_study_card_fab")
            ) {
                Icon(Icons.Default.Add, contentDescription = "Add QA Card")
            }
        }
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(horizontal = 20.dp)
                .testTag("learn_screen"),
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            item { Spacer(modifier = Modifier.height(4.dp)) }

            item {
                Column {
                    Text(
                        text = "Learn & Recall",
                        style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Bold)
                    )
                    Text(
                        text = "Active recall & study sessions.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // START STUDY SESSION CARD
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(24.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer)
                ) {
                    Column(
                        modifier = Modifier.padding(20.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Text(
                            text = "START STUDY SESSION",
                            style = MaterialTheme.typography.labelMedium.copy(
                                fontWeight = FontWeight.Black,
                                letterSpacing = 1.2.sp
                            ),
                            color = MaterialTheme.colorScheme.onSecondaryContainer
                        )

                        Text(
                            text = "Focus uninterrupted on your learning topics.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSecondaryContainer
                        )

                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Button(
                                onClick = { onStartStudySession("ISTQB Study", 25) },
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(16.dp)
                            ) {
                                Text("25 min")
                            }
                            Button(
                                onClick = { onStartStudySession("ISTQB Study", 45) },
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(16.dp)
                            ) {
                                Text("45 min")
                            }
                            Button(
                                onClick = { onStartStudySession("ISTQB Study", 60) },
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(16.dp)
                            ) {
                                Text("60 min")
                            }
                        }
                    }
                }
            }

            // ACTIVE RECALL FLASHCARDS SECTION
            item {
                Text(
                    text = "ACTIVE RECALL QA (${studyCards.size})",
                    style = MaterialTheme.typography.labelMedium.copy(
                        fontWeight = FontWeight.Black,
                        letterSpacing = 1.2.sp
                    ),
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            if (studyCards.isEmpty()) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                    ) {
                        Column(
                            modifier = Modifier.padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                imageVector = Icons.Default.Psychology,
                                contentDescription = null,
                                modifier = Modifier.size(48.dp),
                                tint = MaterialTheme.colorScheme.primary
                            )
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                text = "No active recall cards created yet.",
                                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
                            )
                            Text(
                                text = "Capture what you learn into question & answer cards to test yourself.",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Button(onClick = onOpenAddCard) {
                                Text("+ Add First Card")
                            }
                        }
                    }
                }
            } else {
                val currentCard = studyCards.getOrNull(activeCardIndex.coerceIn(0, studyCards.size - 1))
                if (currentCard != null) {
                    item {
                        ActiveRecallInteractiveCard(
                            card = currentCard,
                            currentIndex = activeCardIndex,
                            totalCards = studyCards.size,
                            onNext = { activeCardIndex = (activeCardIndex + 1) % studyCards.size },
                            onPrevious = { activeCardIndex = if (activeCardIndex > 0) activeCardIndex - 1 else studyCards.size - 1 },
                            onReviewRating = { rating ->
                                viewModel.reviewStudyCard(currentCard.id, rating)
                                activeCardIndex = (activeCardIndex + 1) % studyCards.size
                            },
                            onDelete = { viewModel.deleteStudyCard(currentCard.id) }
                        )
                    }
                }

                item {
                    Text(
                        text = "ALL CARDS SUMMARY",
                        style = MaterialTheme.typography.labelMedium.copy(
                            fontWeight = FontWeight.Black,
                            letterSpacing = 1.2.sp
                        ),
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                items(studyCards, key = { it.id }) { card ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(14.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = card.topic,
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.primary
                                )
                                Text(
                                    text = card.question,
                                    style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold)
                                )
                                Text(
                                    text = "Confidence: ${card.confidence}/10 • Reviewed: ${card.reviewCount} times",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            IconButton(onClick = { viewModel.deleteStudyCard(card.id) }) {
                                Icon(
                                    imageVector = Icons.Default.Delete,
                                    contentDescription = "Delete card",
                                    tint = MaterialTheme.colorScheme.error.copy(alpha = 0.7f),
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                        }
                    }
                }
            }

            item { Spacer(modifier = Modifier.height(70.dp)) }
        }
    }
}

@Composable
fun ActiveRecallInteractiveCard(
    card: StudyCardEntity,
    currentIndex: Int,
    totalCards: Int,
    onNext: () -> Unit,
    onPrevious: () -> Unit,
    onReviewRating: (String) -> Unit,
    onDelete: () -> Unit
) {
    var isAnswerRevealed by remember(card.id) { mutableStateOf(false) }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(28.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "TOPIC: ${card.topic.uppercase()}",
                    style = MaterialTheme.typography.labelMedium.copy(
                        fontWeight = FontWeight.Black,
                        letterSpacing = 1.sp
                    ),
                    color = MaterialTheme.colorScheme.primary
                )
                Text(
                    text = "${currentIndex + 1} / $totalCards",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Text(
                text = card.question,
                style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold)
            )

            if (!isAnswerRevealed) {
                Button(
                    onClick = { isAnswerRevealed = true },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(46.dp)
                        .testTag("reveal_answer_button"),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("REVEAL ANSWER", style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold))
                }
            } else {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "ANSWER",
                            style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                            color = MaterialTheme.colorScheme.primary
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = card.answer,
                            style = MaterialTheme.typography.bodyLarge
                        )
                    }
                }

                Text(
                    text = "How well did you know this?",
                    style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold)
                )

                Row(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    OutlinedButton(
                        onClick = { onReviewRating("AGAIN") },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text("Again", style = MaterialTheme.typography.labelSmall)
                    }
                    OutlinedButton(
                        onClick = { onReviewRating("HARD") },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text("Hard", style = MaterialTheme.typography.labelSmall)
                    }
                    Button(
                        onClick = { onReviewRating("GOOD") },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text("Good", style = MaterialTheme.typography.labelSmall)
                    }
                    Button(
                        onClick = { onReviewRating("EASY") },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text("Easy", style = MaterialTheme.typography.labelSmall)
                    }
                }
            }
        }
    }
}
