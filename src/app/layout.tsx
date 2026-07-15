import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageTransitionWrapper from "@/components/PageTransitionWrapper";

export const metadata: Metadata = {
  title: "Palamau Tiger Reserve - QR Tree Tracker",
  description: "Official QR-based tree tracking application for Palamau Tiger Reserve (PTR), Government of Jharkhand.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;0,6..72,700;1,6..72,400;1,6..72,500;1,6..72,600;1,6..72,700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen flex flex-col bg-background font-sans text-foreground">
        <Navbar />
        <main className="flex-1 flex flex-col w-full">
          <PageTransitionWrapper>
            {children}
          </PageTransitionWrapper>
        </main>
        <Footer />
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function() {
  if (!('serviceWorker' in navigator)) return;

  // ── Banner helpers ─────────────────────────────────────────────────────────
  function showUpdateBanner(reg) {
    if (document.getElementById('ptr-sw-update-banner')) return;
    var banner = document.createElement('div');
    banner.id = 'ptr-sw-update-banner';
    banner.setAttribute('style', [
      'position:fixed','bottom:16px','left:50%','transform:translateX(-50%)',
      'z-index:9999','display:flex','align-items:center','gap:12px',
      'background:#166534','color:#fff','font-family:sans-serif',
      'font-size:13px','font-weight:600','padding:10px 18px',
      'border-radius:999px','box-shadow:0 4px 24px rgba(0,0,0,0.35)',
      'white-space:nowrap','animation:ptr-banner-in 0.3s ease'
    ].join(';'));
    var style = document.createElement('style');
    style.textContent = '@keyframes ptr-banner-in{from{opacity:0;transform:translateX(-50%) translateY(12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}';
    document.head.appendChild(style);
    var text = document.createElement('span');
    text.textContent = 'New version available, refresh to update';
    var btn = document.createElement('button');
    btn.textContent = 'Update Now';
    btn.setAttribute('style', [
      'background:#fff','color:#166534','border:none','border-radius:999px',
      'padding:4px 14px','font-size:12px','font-weight:700','cursor:pointer'
    ].join(';'));
    btn.onclick = function() {
      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    };
    banner.appendChild(text);
    banner.appendChild(btn);
    document.body.appendChild(banner);
  }

  function trackInstalling(worker, reg) {
    worker.addEventListener('statechange', function() {
      if (worker.state === 'installed') showUpdateBanner(reg);
    });
  }

  // ── Registration ───────────────────────────────────────────────────────────
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js', {
      // Always fetch the SW file from the network, never from the HTTP cache.
      // This is the key setting that ensures browsers detect new versions.
      updateViaCache: 'none'
    }).then(function(reg) {
      console.log('[SW] Registered', reg.scope);

      // A new SW is already waiting (installed but not yet active)
      if (reg.waiting) { showUpdateBanner(reg); }

      // A new SW starts installing during this page session
      reg.addEventListener('updatefound', function() {
        if (reg.installing) { trackInstalling(reg.installing, reg); }
      });

      // Reload the page once the new SW takes over (clientsClaim fired)
      var refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', function() {
        if (!refreshing) { refreshing = true; window.location.reload(); }
      });

      // Check for updates on every page load (in addition to the default 24h interval)
      reg.update().catch(function() {});
    }).catch(function(err) {
      console.warn('[SW] Registration failed:', err);
    });
  });
})();
            `
          }}
        />
      </body>
    </html>
  );
}
