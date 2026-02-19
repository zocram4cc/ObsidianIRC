package com.obsidianirc.dev

import android.os.Bundle
import android.os.Build
import android.view.View
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.OnApplyWindowInsetsListener
import kotlin.math.max
import android.webkit.WebView
import android.annotation.SuppressLint

// WindowInsets utility for handling system bars and IME insets
object WindowInsetsUtil {
    fun applySystemBarsPadding(view: View) {
        ViewCompat.setOnApplyWindowInsetsListener(
            view,
            OnApplyWindowInsetsListener { v: View?, windowInsets: WindowInsetsCompat? ->
                val systemBars = windowInsets!!.getInsets(WindowInsetsCompat.Type.systemBars())
                val ime = windowInsets.getInsets(WindowInsetsCompat.Type.ime())
                v!!.setPadding(
                    systemBars.left,
                    systemBars.top,
                    systemBars.right,
                    max(systemBars.bottom, ime.bottom)
                )
                WindowInsetsCompat.CONSUMED
            })
    }
}

class MainActivity : TauriActivity() {
    private lateinit var wv: WebView
    private var isKeyboardOpen = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Apply window insets to handle keyboard visibility on Android 13+ (API 33+)
        window.decorView?.let { WindowInsetsUtil.applySystemBarsPadding(it) }
    }

    override fun onWebViewCreate(webView: WebView) {
        wv = webView
    }

    @SuppressLint("MissingSuperCall", "SetTextI18n")
    @Deprecated("")
    override fun onBackPressed() {
        wv.evaluateJavascript(/* script = */ """
      try {
        window.androidBackCallback()
      } catch (_) {
        true
      }
    """.trimIndent()) { result ->
            if (result == "true") {
                super.onBackPressed();
            }
        }
    }
}
