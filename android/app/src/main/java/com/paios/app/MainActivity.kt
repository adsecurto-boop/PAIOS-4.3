package com.paios.app

import android.os.Bundle
import android.util.Log
import com.getcapacitor.BridgeActivity
import com.google.firebase.crashlytics.FirebaseCrashlytics

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        try {
            val crashlytics = FirebaseCrashlytics.getInstance()
            crashlytics.log("MainActivity created - monitoring SSO auth state and bridge")
            
            intent?.data?.let { uri ->
                crashlytics.log("Received Auth Deep Link Intent: ${uri.scheme}://${uri.host}")
                crashlytics.setCustomKey("last_auth_deep_link", uri.toString())
            }
        } catch (e: Exception) {
            Log.w("PAIOS", "Crashlytics activity log notice: ${e.message}")
        }
    }

    override fun onNewIntent(intent: android.content.Intent) {
        super.onNewIntent(intent)
        try {
            val crashlytics = FirebaseCrashlytics.getInstance()
            intent.data?.let { uri ->
                crashlytics.log("Received Auth Deep Link Intent (onNewIntent): ${uri.scheme}://${uri.host}")
                crashlytics.setCustomKey("last_auth_deep_link", uri.toString())
            }
        } catch (e: Exception) {
            Log.w("PAIOS", "Crashlytics newIntent log notice: ${e.message}")
        }
    }
}
