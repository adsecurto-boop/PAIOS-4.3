package com.example.ui.components

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.ActivityLogEntity
import java.util.Locale

@Composable
fun MiniTimerPlayer(
    activity: ActivityLogEntity?,
    elapsedSeconds: Long,
    onPause: (Long) -> Unit,
    onResume: (Long) -> Unit,
    onFinish: (Long) -> Unit,
    onTap: () -> Unit,
    modifier: Modifier = Modifier
) {
    AnimatedVisibility(
        visible = activity != null && activity.isRunning,
        enter = slideInVertically { it } + fadeIn(),
        exit = slideOutVertically { it } + fadeOut(),
        modifier = modifier
    ) {
        if (activity == null) return@AnimatedVisibility

        val hours = elapsedSeconds / 3600
        val mins = (elapsedSeconds % 3600) / 60
        val secs = elapsedSeconds % 60
        val formattedTime = if (hours > 0) {
            String.format(Locale.US, "%02d:%02d:%02d", hours, mins, secs)
        } else {
            String.format(Locale.US, "%02d:%02d", mins, secs)
        }

        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 6.dp)
                .clip(RoundedCornerShape(16.dp))
                .clickable { onTap() }
                .testTag("mini_timer_player"),
            color = MaterialTheme.colorScheme.primaryContainer,
            tonalElevation = 6.dp
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "${activity.activityName} — ${activity.category}",
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 14.sp
                        ),
                        color = MaterialTheme.colorScheme.onPrimaryContainer,
                        maxLines = 1
                    )
                    Text(
                        text = formattedTime,
                        style = MaterialTheme.typography.bodyMedium.copy(
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp
                        ),
                        color = MaterialTheme.colorScheme.primary
                    )
                }

                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(
                        onClick = {
                            if (activity.isPaused) onResume(activity.id) else onPause(activity.id)
                        },
                        modifier = Modifier
                            .size(36.dp)
                            .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(18.dp))
                    ) {
                        Icon(
                            imageVector = if (activity.isPaused) Icons.Default.PlayArrow else Icons.Default.Pause,
                            contentDescription = if (activity.isPaused) "Resume" else "Pause",
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(20.dp)
                        )
                    }

                    IconButton(
                        onClick = { onFinish(activity.id) },
                        modifier = Modifier
                            .size(36.dp)
                            .background(MaterialTheme.colorScheme.errorContainer, RoundedCornerShape(18.dp))
                    ) {
                        Icon(
                            imageVector = Icons.Default.Stop,
                            contentDescription = "Finish Activity",
                            tint = MaterialTheme.colorScheme.onErrorContainer,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
            }
        }
    }
}
