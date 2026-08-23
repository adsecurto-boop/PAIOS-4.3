package com.paios.app

import android.os.Bundle
import android.util.Log
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    companion object {
        private const val TAG = "PAIOS_MainActivity"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        Log.i(TAG, "PAIOS MainActivity launching...")
        super.onCreate(savedInstanceState)
        Log.i(TAG, "PAIOS BridgeActivity initialized successfully.")
    }
}
