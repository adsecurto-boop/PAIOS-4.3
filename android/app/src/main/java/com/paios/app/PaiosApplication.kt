package com.paios.app

import android.app.Application
import com.google.firebase.FirebaseApp

class PaiosApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        try {
            FirebaseApp.initializeApp(this)
        } catch (e: Exception) {
            android.util.Log.e("PAIOS", "Firebase initialization failed inside application context: ${e.message}")
        }
    }
}
