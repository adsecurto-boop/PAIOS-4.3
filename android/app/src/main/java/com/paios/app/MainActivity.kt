package com.paios.app

import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.view.View
import android.webkit.*
import android.widget.ProgressBar
import androidx.appcompat.app.AppCompatActivity
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar
    private var auth: FirebaseAuth? = null
    private var firestore: FirebaseFirestore? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Programmatic root layout
        val frameLayout = android.widget.FrameLayout(this)
        webView = WebView(this)
        progressBar = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
            max = 100
        }

        frameLayout.addView(webView, android.widget.FrameLayout.LayoutParams.MATCH_PARENT, android.widget.FrameLayout.LayoutParams.MATCH_PARENT)
        frameLayout.addView(progressBar, android.widget.FrameLayout.LayoutParams.MATCH_PARENT, 12)
        setContentView(frameLayout)

        setupWebView()
        initializeFirebaseAndSync()

        // Load hosted PAIOS app URL
        val appUrl = "https://ais-dev-4nf3lnfptlp5sqme2hgruy-268479705234.asia-southeast1.run.app"
        webView.loadUrl(appUrl)
    }

    private fun setupWebView() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.allowFileAccess = true
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        settings.userAgentString = settings.userAgentString + " PAIOS_Android_App/1.0"

        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                progressBar.progress = newProgress
                if (newProgress == 100) {
                    progressBar.visibility = View.GONE
                } else {
                    progressBar.visibility = View.VISIBLE
                }
            }
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: return false
                // Intercept Google SSO / External OAuth to launch system browser
                if (url.contains("accounts.google.com") || url.contains("action=auth")) {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                    startActivity(intent)
                    return true
                }
                return false
            }

            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                super.onPageStarted(view, url, favicon)
                progressBar.visibility = View.VISIBLE
            }

            override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: WebResourceError?) {
                super.onReceivedError(view, request, error)
                // If offline or network error, attempt loading cached content
                if (request?.isForMainFrame == true) {
                    settings.cacheMode = WebSettings.LOAD_CACHE_ELSE_NETWORK
                }
            }
        }
    }

    private fun initializeFirebaseAndSync() {
        try {
            auth = FirebaseAuth.getInstance()
            firestore = FirebaseFirestore.getInstance()
            setupFirestoreSync()
        } catch (e: Exception) {
            Log.e("PAIOS", "Firebase services are unconfigured or failed: ${e.message}")
        }
    }

    private fun setupFirestoreSync() {
        val activeAuth = auth ?: return
        val activeFirestore = firestore ?: return
        
        try {
            activeAuth.addAuthStateListener { firebaseAuth ->
                val user = firebaseAuth.currentUser
                if (user != null) {
                    // Attach Firestore listener with offline cache support
                    activeFirestore.collection("user_data").document(user.uid)
                        .addSnapshotListener { snapshot, e ->
                            if (e != null || snapshot == null || !snapshot.exists()) return@addSnapshotListener
                            val isFromCache = snapshot.metadata.isFromCache
                            val snapshotData = snapshot.get("snapshot") as? Map<*, *> ?: return@addSnapshotListener
                            // Native Android offline-aware sync callback
                            Log.d("PAIOS", "PAIOS Firestore data updated (Is cached offline copy: $isFromCache)")
                        }
                }
            }
        } catch (e: Exception) {
            Log.e("PAIOS", "Firestore listener setup failed: ${e.message}")
        }
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
