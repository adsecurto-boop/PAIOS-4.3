package com.paios.app

import android.app.Application
import android.util.Log
import com.google.firebase.FirebaseApp
import com.google.firebase.crashlytics.FirebaseCrashlytics

class PaiosApplication : Application() {

    companion object {
        private const val TAG = "PAIOS_Application"
    }

    override fun onCreate() {
        // 1. Install Global Uncaught Exception Handler FIRST before any initializations
        val defaultHandler = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
            try {
                Log.e(TAG, "==========================================================")
                Log.e(TAG, "CRITICAL FATAL UNCAUGHT EXCEPTION on thread [${thread.name}] (id: ${thread.id})")
                Log.e(TAG, "Message: ${throwable.message}")
                Log.e(TAG, "Cause: ${throwable.cause}")
                Log.e(TAG, "Stacktrace:", throwable)
                Log.e(TAG, "==========================================================")
            } catch (ignored: Throwable) {}
            
            try {
                FirebaseCrashlytics.getInstance().recordException(throwable)
            } catch (ignored: Throwable) {}
            
            defaultHandler?.uncaughtException(thread, throwable)
        }

        super.onCreate()

        // 2. Safe Firebase Initialization without duplicate initializeApp crash
        try {
            if (FirebaseApp.getApps(this).isEmpty()) {
                Log.i(TAG, "Initializing FirebaseApp for PAIOS...")
                FirebaseApp.initializeApp(this)
            } else {
                Log.i(TAG, "FirebaseApp already initialized automatically by FirebaseInitProvider.")
            }
            
            try {
                val crashlytics = FirebaseCrashlytics.getInstance()
                crashlytics.setCrashlyticsCollectionEnabled(true)
                crashlytics.log("PAIOS Application started successfully")
            } catch (ce: Throwable) {
                Log.w(TAG, "Crashlytics setup skipped: ${ce.message}")
            }
        } catch (e: Throwable) {
            Log.w(TAG, "Firebase initialization notice: ${e.message}")
        }
    }
}
