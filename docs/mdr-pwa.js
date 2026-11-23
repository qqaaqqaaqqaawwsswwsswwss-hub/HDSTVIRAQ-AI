/* Install prompt and offline feedback for the hosted web app. */
(function () {
  'use strict';
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const hosted = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  const androidAssetHost = location.hostname === 'appassets.androidplatform.net';
  if (!hosted || androidAssetHost) return;

  const style = document.createElement('style');
  style.textContent = `
    #mdr-install-action{position:fixed;z-index:100002;inset-inline-start:14px;bottom:18px;border:1px solid #ffd06b;border-radius:999px;padding:11px 16px;background:linear-gradient(135deg,#ffd06b,#ffb020);color:#211707;font:700 13px system-ui,sans-serif;box-shadow:0 8px 24px #0008;cursor:pointer}
    #mdr-offline-toast{position:fixed;z-index:100003;inset-inline:14px;top:72px;margin:auto;width:max-content;max-width:calc(100vw - 28px);padding:10px 14px;border:1px solid #ffffff20;border-radius:12px;background:#111923f2;color:#edf3fb;font:600 12px/1.6 system-ui,sans-serif;box-shadow:0 10px 30px #0008;display:none}
    @media(max-width:720px){#mdr-install-action{bottom:calc(76px + env(safe-area-inset-bottom,0px));padding:10px 13px;font-size:12px}}
    @media(prefers-reduced-motion:reduce){#mdr-install-action{scroll-behavior:auto}}
  `;
  document.head.appendChild(style);
  const toast = document.createElement('div');
  toast.id = 'mdr-offline-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  document.body.appendChild(toast);
  let hideTimer;
  function announce(message) {
    toast.textContent = message;
    toast.style.display = 'block';
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => { toast.style.display = 'none'; }, 3600);
  }
  window.addEventListener('offline', () => announce('أنت غير متصل — ستعمل الواجهة والملفات المحفوظة محلياً.'));
  window.addEventListener('online', () => announce('عاد الاتصال بالإنترنت.'));
  let installPrompt = null;
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    if (document.getElementById('mdr-install-action')) return;
    const button = document.createElement('button');
    button.id = 'mdr-install-action';
    button.type = 'button';
    button.textContent = 'تثبيت MDR';
    button.setAttribute('aria-label', 'تثبيت MDR Platform على هذا الجهاز');
    button.addEventListener('click', async () => {
      if (!installPrompt) return;
      await installPrompt.prompt();
      const result = await installPrompt.userChoice;
      if (result && result.outcome === 'accepted') button.remove();
      installPrompt = null;
    });
    document.body.appendChild(button);
  });
  window.addEventListener('appinstalled', () => {
    const button = document.getElementById('mdr-install-action');
    if (button) button.remove();
    announce('تم تثبيت MDR على جهازك.');
  });
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js', { scope: './' })
      .catch(() => announce('تعذر تفعيل وضع العمل دون اتصال في هذا المتصفح.')), { once: true });
  }
})();
