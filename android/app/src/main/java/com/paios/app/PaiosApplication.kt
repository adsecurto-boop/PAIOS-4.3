package com.paios.app

import android.app.Application
import android.util.Log
import com.google.firebase.FirebaseApp

class PaiosApplication : Application() {

    companion object {
        private const val TAG = "PAIOS_Application"
    }

    override fun onCreate() {
        super.onCreate()
        try {
            if (FirebaseApp.getApps(this).isEmpty()) {
                Log.i(TAG, "Initializing FirebaseApp for PAIOS...")
                FirebaseApp.initializeApp(this)
            } else {
                Log.i(TAG, "FirebaseApp already initialized automatically.")
            }
        } catch (e: Throwable) {
            Log.w(TAG, "Firebase initialization notice: ${e.message}")
        }
    }
}
