package com.mdr.app;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.widget.TextView;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.ValueCallback;
import android.webkit.WebViewClient;
import androidx.webkit.WebViewAssetLoader;

public final class AppActivity extends Activity {
    private static final String APP_HOST = "appassets.androidplatform.net";
    private FrameLayout root;
    private WebView webView;
    private WebViewAssetLoader assetLoader;
    private boolean isRecovering = false;
    private static final int REQUEST_UPLOAD_FILE = 4102;
    private ValueCallback<Uri[]> uploadCallback;

    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(8, 9, 12));
        setContentView(root);
        assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();
        createWebView();
    }

    private void createWebView() {
        if (isFinishing()) return;
        releaseWebView();
        isRecovering = false;
        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true); // Required by the MDR React/Three.js UI.
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportMultipleWindows(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) settings.setSafeBrowsingEnabled(true);

        webView.setBackgroundColor(Color.rgb(8, 9, 12));
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                                        FileChooserParams params) {
                if (uploadCallback != null) uploadCallback.onReceiveValue(null);
                uploadCallback = callback;
                Intent pick = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                pick.addCategory(Intent.CATEGORY_OPENABLE);
                pick.setType("*/*");
                pick.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{
                        "application/zip", "application/x-zip-compressed", "application/octet-stream", "model/gltf-binary", "model/gltf+json"});
                pick.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                try {
                    startActivityForResult(pick, REQUEST_UPLOAD_FILE);
                    return true;
                } catch (Exception error) {
                    uploadCallback = null;
                    callback.onReceiveValue(null);
                    return false;
                }
            }
        });
        webView.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                WebResourceResponse response = assetLoader.shouldInterceptRequest(request.getUrl());
                // Android's MIME table does not consistently recognize .mjs. ES modules
                // require a JavaScript MIME type, so normalize this local asset response.
                if (response != null && request.getUrl().getPath() != null
                        && request.getUrl().getPath().endsWith(".mjs")) {
                    return new WebResourceResponse("text/javascript", "UTF-8", response.getData());
                }
                return response;
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if ("https".equalsIgnoreCase(uri.getScheme()) && APP_HOST.equalsIgnoreCase(uri.getHost())) return false;
                if ("https".equalsIgnoreCase(uri.getScheme())) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); } catch (Exception ignored) { }
                }
                return true;
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) showRecoveryMessage("تعذّر تحميل واجهة MDR. اضغط لإعادة المحاولة.");
            }
            @Override public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                if (view != webView) return true;
                recoverRenderer();
                return true;
            }
        });
        root.removeAllViews();
        root.addView(webView, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        webView.loadUrl("https://" + APP_HOST + "/assets/index.html");
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
    }

    private void recoverRenderer() {
        if (isRecovering || isFinishing()) return;
        isRecovering = true;
        if (webView != null) {
            root.removeView(webView);
            webView.destroy();
            webView = null;
        }
        showRecoveryMessage("توقف محرك عرض الصفحة. اضغط لإعادة تشغيل الواجهة.");
    }

    private void showRecoveryMessage(String message) {
        releaseWebView();
        TextView notice = new TextView(this);
        notice.setText(message);
        notice.setTextColor(Color.WHITE);
        notice.setTextSize(16);
        notice.setGravity(Gravity.CENTER);
        notice.setPadding(28, 28, 28, 28);
        notice.setOnClickListener(v -> createWebView());
        root.removeAllViews();
        root.addView(notice, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
    }

    private void releaseWebView() {
        if (uploadCallback != null) { uploadCallback.onReceiveValue(null); uploadCallback = null; }
        if (webView == null) return;
        WebView old = webView;
        webView = null;
        if (root != null) root.removeView(old);
        try { old.stopLoading(); } catch (Exception ignored) { }
        try { old.setWebChromeClient(null); old.setWebViewClient(new WebViewClient()); } catch (Exception ignored) { }
        try { old.loadUrl("about:blank"); } catch (Exception ignored) { }
        old.destroy();
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQUEST_UPLOAD_FILE && uploadCallback != null) {
            Uri selected = resultCode == RESULT_OK && data != null ? data.getData() : null;
            uploadCallback.onReceiveValue(selected == null ? null : new Uri[]{selected});
            uploadCallback = null;
        }
    }

    @Override public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override protected void onPause() { if (webView != null) webView.onPause(); super.onPause(); }
    @Override protected void onResume() { super.onResume(); if (webView != null) webView.onResume(); }

    @Override protected void onDestroy() {
        if (uploadCallback != null) { uploadCallback.onReceiveValue(null); uploadCallback = null; }
        releaseWebView();
        super.onDestroy();
    }
}
