Got it 👍 You want a **full README.md** that explains your software:

* Features
* How it works
* File/folder structure

Here’s a complete draft you can copy-paste into your repo:

---

# 🦊 BeastBrowser – Antidetection Browser with RPA

BeastBrowser is a **desktop antidetection browser** built with **Electron, React, Vite, and shadcn-ui**.
It allows users to create and manage multiple browser profiles with unique **fingerprints, proxies, and user-agents**, and run advanced **automation scripts (RPA)** on them.

---

## 🚀 Features

### 🔐 Authentication

* Firebase-based login & signup system
* Secure AuthContext for session handling

### 🌍 Profile Manager

* Create single or bulk profiles
* Supported platforms: **Windows, macOS, Linux, Android, iOS, TV**
* Each profile gets a **unique fingerprint** (canvas, WebGL, timezone, screen size, etc.)
* **User-agents** loaded dynamically from JSON files in `/src/useragents/`
* Assign **proxies** (No Proxy, HTTP, HTTPS, SOCKS5, or Saved Proxy) per profile
* Bulk operations: **Select All / Deselect All**
* Profiles are isolated like real devices for antidetection

### 🤖 RPA (Robotic Process Automation)

* Users create custom automation scripts in the **RPA tab**
* Scripts are reusable and appear in the **Profile tab**
* Run automation on one or multiple profiles (sequential execution)
* Advanced script editor for automation setup

### 🌐 Proxy Manager

* Supports **HTTP, HTTPS, SOCKS5** proxies
* Save & manage proxies for later use
* Works seamlessly with Profile creation

### 👥 Referral System

* 50% bonus referral system integrated
* Managed via `ReferralSystem.tsx` + `referralService.ts`

### 🛠️ Other Features

* Device profile selector (choose platform & emulate device)
* Support team contact UI
* Error boundaries for safe runtime execution
* Toast notifications for success/failure
* Modern UI with **shadcn-ui + Radix components**

---

## ⚙️ How It Works

1. **Create Profiles**

   * Choose platform → BeastBrowser loads a random user-agent from `/src/useragents/`
   * Generate unique fingerprint → stored temporarily in memory
   * Assign proxy (optional)
   * Profile is saved and ready

2. **Bulk Create Profiles**

   * User selects platform + number of profiles
   * Each gets unique UA + fingerprint
   * Proxies can be applied to all at once

3. **Run Automation**

   * Go to RPA tab → Create script (example: auto-login, form-filling, scraping)
   * Back in Profile tab → Select profiles → Choose script → Run
   * BeastBrowser executes script sequentially on each profile with isolated context

4. **Proxies & Fingerprints**

   * Each profile runs with separate identity: **UA + Proxy + Fingerprint**
   * Makes automation harder to detect by websites

---

## 📂 Folder Structure

```
beastbrowser/
├── electron/                  # Electron runtime files
│   ├── main.js                # Electron main process
│   ├── preload.js             # Secure IPC bridge
│   ├── beastbrowser/          # Custom browser engine
│   ├── enhanced-proxy-manager.js
│   ├── webview-preload.js
│
├── public/
│   ├── anti-detection.js      # Core anti-detection logic
│   ├── enhanced-anti-detection.js
│   ├── proxy-manager.js
│   ├── beast-logo.png
│
├── src/
│   ├── components/            # All UI components
│   │   ├── auth/              # Login & signup
│   │   ├── layout/            # Layout wrappers
│   │   ├── pricing/           # Pricing page
│   │   ├── profiles/          # ProfileManager, CreateProfileModal
│   │   ├── proxies/           # Proxy UI
│   │   ├── rpa/               # RPAManager, script editor
│   │   ├── settings/          # App settings
│   │   ├── ui/                # shadcn-ui components
│   │   ├── BrowserAutomation.tsx
│   │   ├── DeviceProfileSelector.tsx
│   │   ├── ReferralSystem.tsx
│   │   ├── SupportTeam.tsx
│   │
│   ├── contexts/
│   │   ├── AuthContext.tsx    # Firebase auth state
│   │
│   ├── data/
│   │   ├── fingerprints.ts    # Fingerprint generator
│   │
│   ├── hooks/
│   │   ├── use-mobile.tsx
│   │   ├── use-toast.ts
│   │
│   ├── lib/
│   │   ├── firebase.ts
│   │   ├── timezone-matcher.ts
│   │   ├── useragent-loader.ts
│   │   ├── utils.ts
│   │
│   ├── pages/
│   │   ├── Index.tsx
│   │   ├── NotFound.tsx
│   │
│   ├── services/
│   │   ├── browserAutomationService.ts
│   │   ├── deviceProfileService.ts
│   │   ├── proxyService.ts
│   │   ├── referralService.ts
│   │   ├── supportService.ts
│   │
│   ├── useragents/            # JSON user-agent lists
│   │   ├── android.json
│   │   ├── ios.json
│   │   ├── windows.json
│   │   ├── macos.json
│   │   ├── linux.json
│   │   ├── tv.json
│
├── package.json
├── vite.config.ts
└── README.md
```

---

## 🛠️ Tech Stack

* **Frontend:** React + Vite + shadcn-ui (Radix + Tailwind)
* **Backend Services:** Firebase (Auth)
* **Desktop Runtime:** Electron
* **Automation Engine:** Custom RPA + Playwright-like scripting
* **Antidetection:** Fingerprinting + Proxy rotation + UA spoofing

---

## ✅ Summary

BeastBrowser is a **stealth browser automation platform** with:

* Multi-profile antidetection
* Per-profile unique UA + fingerprint + proxy
* Custom RPA script editor & runner
* Bulk profile creation
* Modern UI with shadcn-ui
* Built for **growth to millions of user-agents per platform**

---

⚡ Ready to use for advanced automation + antidetection needs.

---

Do you also want me to make a **short "Quick Start Guide"** (how to run the app, commands, dev setup, build for production) inside this README?
