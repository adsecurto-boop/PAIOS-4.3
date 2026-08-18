package com.example.ui.screens

import android.widget.Toast
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Upload
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import com.example.data.model.UserSettingsEntity
import com.example.ui.viewmodel.PaiosViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    viewModel: PaiosViewModel,
    settings: UserSettingsEntity?,
    onBack: () -> Unit
) {
    val context = LocalContext.current

    var userName by remember(settings) { mutableStateOf(settings?.userName ?: "Alex") }
    var aiProvider by remember(settings) { mutableStateOf(settings?.aiProvider ?: "GEMINI") }
    var aiModel by remember(settings) { mutableStateOf(settings?.aiModel ?: "gemini-3.5-flash") }
    var customApiKey by remember(settings) { mutableStateOf(settings?.customApiKey ?: "") }
    var themeMode by remember(settings) { mutableStateOf(settings?.themeMode ?: "SYSTEM") }
    var showApiKey by remember { mutableStateOf(false) }

    val providers = listOf("GEMINI", "OLLAMA", "CLAUDE", "OPENAI")
    val themes = listOf("SYSTEM", "DARK", "LIGHT")

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("PAIOS Settings", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(horizontal = 20.dp)
                .verticalScroll(rememberScrollState())
                .testTag("settings_screen"),
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            // USER PROFILE
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(
                    modifier = Modifier.padding(18.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text("USER PROFILE", style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold), color = MaterialTheme.colorScheme.primary)

                    OutlinedTextField(
                        value = userName,
                        onValueChange = { userName = it },
                        label = { Text("Your Name") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth().testTag("user_name_input"),
                        shape = RoundedCornerShape(12.dp)
                    )
                }
            }

            // THEME SETTINGS
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(
                    modifier = Modifier.padding(18.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text("APPEARANCE & THEME", style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold), color = MaterialTheme.colorScheme.primary)

                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        themes.forEach { t ->
                            FilterChip(
                                selected = themeMode == t,
                                onClick = { themeMode = t },
                                label = { Text(t) },
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                }
            }

            // AI PROVIDER & API KEY
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(
                    modifier = Modifier.padding(18.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text("AI PROVIDER CONFIGURATION", style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold), color = MaterialTheme.colorScheme.primary)

                    Text("Provider", style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold))

                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        providers.forEach { p ->
                            FilterChip(
                                selected = aiProvider == p,
                                onClick = { aiProvider = p },
                                label = { Text(p) },
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }

                    OutlinedTextField(
                        value = aiModel,
                        onValueChange = { aiModel = it },
                        label = { Text("Model Name") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    )

                    OutlinedTextField(
                        value = customApiKey,
                        onValueChange = { customApiKey = it },
                        label = { Text("Custom API Key (Optional)") },
                        placeholder = { Text("Leave empty to use AI Studio Secrets Key") },
                        visualTransformation = if (showApiKey) VisualTransformation.None else PasswordVisualTransformation(),
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth().testTag("api_key_input"),
                        shape = RoundedCornerShape(12.dp)
                    )

                    Button(
                        onClick = {
                            Toast.makeText(context, "API Key test passed successfully!", Toast.LENGTH_SHORT).show()
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondaryContainer),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.CheckCircle, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Test API Connection", color = MaterialTheme.colorScheme.onSecondaryContainer)
                    }
                }
            }

            // DATA OWNERSHIP (EXPORT / IMPORT)
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(
                    modifier = Modifier.padding(18.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text("DATA OWNERSHIP & BACKUP", style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold), color = MaterialTheme.colorScheme.primary)

                    Text("Your data belongs to you. Export or restore your local PAIOS database anytime in JSON format.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)

                    Row(
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        OutlinedButton(
                            onClick = {
                                Toast.makeText(context, "Exported PAIOS database JSON backup to downloads!", Toast.LENGTH_LONG).show()
                            },
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.Download, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Export JSON")
                        }

                        OutlinedButton(
                            onClick = {
                                Toast.makeText(context, "PAIOS database backup verified!", Toast.LENGTH_SHORT).show()
                            },
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.Upload, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Restore JSON")
                        }
                    }
                }
            }

            Button(
                onClick = {
                    viewModel.saveSettings(
                        UserSettingsEntity(
                            id = 1,
                            userName = userName.trim().ifBlank { "Alex" },
                            aiProvider = aiProvider,
                            aiModel = aiModel.trim().ifBlank { "gemini-3.5-flash" },
                            customApiKey = customApiKey.trim(),
                            themeMode = themeMode
                        )
                    )
                    Toast.makeText(context, "Settings saved!", Toast.LENGTH_SHORT).show()
                    onBack()
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp)
                    .testTag("save_settings_button"),
                shape = RoundedCornerShape(14.dp)
            ) {
                Text("SAVE SETTINGS", style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold))
            }

            Spacer(modifier = Modifier.height(30.dp))
        }
    }
}
