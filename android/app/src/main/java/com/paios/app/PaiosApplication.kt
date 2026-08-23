package com.paios.app

import android.app.Application
import android.util.Log
import com.google.firebase.FirebaseApp
import com.google.firebase.crashlytics.FirebaseCrashlytics

class PaiosApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        try {
            FirebaseApp.initializeApp(this)
            val crashlytics = FirebaseCrashlytics.getInstance()
            crashlytics.setCrashlyticsCollectionEnabled(true)
            crashlytics.log("PAIOS Application initialized with Crashlytics stability monitoring")
        } catch (e: Exception) {
            Log.e("PAIOS", "Firebase Crashlytics initialization error: ${e.message}")
        }
    }
}
