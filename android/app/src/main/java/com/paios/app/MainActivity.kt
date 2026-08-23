package com.paios.app

import android.content.Intent
import android.os.Bundle
import android.util.Log
import com.getcapacitor.BridgeActivity
import com.google.firebase.crashlytics.FirebaseCrashlytics

class MainActivity : BridgeActivity() {

    companion object {
        private const val TAG = "PAIOS_MainActivity"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        Log.i(TAG, "=== MainActivity.onCreate() starting ===")
        
        try {
            // Attempt to initialize BridgeActivity lifecycle safely
            super.onCreate(savedInstanceState)
            Log.i(TAG, "MainActivity.onCreate() - BridgeActivity super.onCreate completed successfully")
        } catch (e: Throwable) {
            Log.e(TAG, "FATAL: Error in BridgeActivity.super.onCreate: ${e.message}", e)
            try {
                FirebaseCrashlytics.getInstance().recordException(e)
            } catch (ce: Throwable) {
                Log.w(TAG, "Crashlytics not ready for recording onCreate exception: ${ce.message}")
            }
        }

        // Safe Crashlytics & Deep Link Logging
        try {
            val crashlytics = FirebaseCrashlytics.getInstance()
            crashlytics.log("MainActivity created - monitoring SSO auth state, Capacitor bridge, and webview")
            
            val initialIntent = intent
            if (initialIntent != null) {
                val dataUri = initialIntent.data
                val action = initialIntent.action
                Log.d(TAG, "Launch Intent Action: $action, Data: $dataUri")
                
                dataUri?.let { uri ->
                    Log.i(TAG, "Received Deep Link Intent on launch: ${uri.scheme}://${uri.host}")
                    crashlytics.log("Received Launch Intent: ${uri.scheme}://${uri.host}")
                    crashlytics.setCustomKey("last_auth_deep_link", uri.toString())
                }
            }
        } catch (e: Throwable) {
            Log.w(TAG, "Crashlytics activity diagnostic notice: ${e.message}")
        }
        
        Log.i(TAG, "=== MainActivity.onCreate() completed ===")
    }

    override fun onStart() {
        Log.d(TAG, "MainActivity.onStart()")
        try {
            super.onStart()
        } catch (e: Throwable) {
            Log.e(TAG, "Error in onStart: ${e.message}", e)
        }
    }

    override fun onResume() {
        Log.d(TAG, "MainActivity.onResume()")
        try {
            super.onResume()
        } catch (e: Throwable) {
            Log.e(TAG, "Error in onResume: ${e.message}", e)
        }
    }

    override fun onPause() {
        Log.d(TAG, "MainActivity.onPause()")
        try {
            super.onPause()
        } catch (e: Throwable) {
            Log.e(TAG, "Error in onPause: ${e.message}", e)
        }
    }

    override fun onStop() {
        Log.d(TAG, "MainActivity.onStop()")
        try {
            super.onStop()
        } catch (e: Throwable) {
            Log.e(TAG, "Error in onStop: ${e.message}", e)
        }
    }

    override fun onDestroy() {
        Log.d(TAG, "MainActivity.onDestroy()")
        try {
            super.onDestroy()
        } catch (e: Throwable) {
            Log.e(TAG, "Error in onDestroy: ${e.message}", e)
        }
    }

    override fun onNewIntent(intent: Intent) {
        Log.i(TAG, "MainActivity.onNewIntent() received")
        try {
            super.onNewIntent(intent)
            
            val uri = intent.data
            Log.d(TAG, "onNewIntent action: ${intent.action}, data: $uri")
            
            uri?.let {
                Log.i(TAG, "New Deep Link received: ${it.scheme}://${it.host}")
                try {
                    val crashlytics = FirebaseCrashlytics.getInstance()
                    crashlytics.log("Received Auth Deep Link Intent (onNewIntent): ${it.scheme}://${it.host}")
                    crashlytics.setCustomKey("last_auth_deep_link", it.toString())
                } catch (ce: Throwable) {
                    Log.w(TAG, "Crashlytics newIntent log notice: ${ce.message}")
                }
            }
        } catch (e: Throwable) {
            Log.e(TAG, "Error handling onNewIntent: ${e.message}", e)
        }
    }
}
