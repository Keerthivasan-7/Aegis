# 🛡️ Aegis

> **AI-Powered Intelligent Proctoring & Real-Time Assessment Platform**

Aegis is a next-generation online examination platform that combines **AI-powered proctoring**, **real-time monitoring**, and **intelligent assessment** to ensure secure, fair, and trustworthy technical evaluations. The platform leverages modern web technologies, Firebase, and Google's Gemini AI to detect suspicious behavior, monitor candidate activity, and generate automated proctoring reports.

---

## ✨ Features

### 👤 Authentication
- Secure Firebase Authentication
- Candidate & Examiner roles
- Protected dashboard access
- Role-based authorization

### 📝 Exam Management
- Create and manage examinations
- Configure exam duration and rules
- Question management
- Real-time candidate sessions

### 🤖 AI Proctoring
- Webcam monitoring
- Face presence detection
- Multiple person detection
- Head pose & gaze estimation
- Tab switching detection
- Window focus monitoring
- Copy & paste restriction
- Fullscreen enforcement
- AI-generated violation summaries
- Automated risk scoring

### 📊 Examiner Dashboard
- Live candidate monitoring
- Proctoring alerts
- Session timeline
- AI-generated audit reports
- Candidate performance overview

### 📈 Analytics
- Risk score visualization
- Violation history
- Exam statistics
- Session summaries

---

# 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | React + TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| Backend | Firebase |
| Authentication | Firebase Authentication |
| Database | Cloud Firestore |
| AI | Google Gemini |
| Hosting | Netlify |
| Version Control | Git & GitHub |

---

# 📸 Core Proctoring Features

- 👁️ Real-time webcam monitoring
- 🧠 AI-powered behavioral analysis
- 👤 Face detection
- 👥 Multiple person detection
- 📵 Browser focus monitoring
- 🚫 Copy/Paste prevention
- 🔒 Fullscreen enforcement
- ⚠️ Automatic violation logging
- 📑 AI-generated audit summary

---

# 📂 Project Structure

```
src/
├── components/
├── pages/
├── hooks/
├── services/
├── firebase/
├── contexts/
├── utils/
├── types/
└── assets/
```

---

# 🚀 Getting Started

## Clone the repository

```bash
git clone https://github.com/yourusername/aegis.git
cd aegis
```

## Install dependencies

```bash
npm install
```

## Configure Environment Variables

Create a `.env` file.

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# Server-side only — do NOT prefix with VITE_, or it will be bundled into the
# client and exposed in the browser.
GEMINI_API_KEY=
```

> The `VITE_FIREBASE_*` values above are Firebase's public client configuration
> (safe to ship to the browser). `GEMINI_API_KEY` is a real secret used only by
> the server (`server.ts`) and must never be prefixed with `VITE_`.

---

## Run locally

```bash
npm run dev
```

---

## Build

```bash
npm run build
```

---

# 🔥 Firebase Services

- Firebase Authentication
- Cloud Firestore

---

# 📖 How It Works

1. Candidate signs in.
2. Examiner creates an exam.
3. Candidate joins the exam.
4. Webcam and browser activity are monitored in real time.
5. AI continuously analyzes candidate behavior.
6. Suspicious activities are recorded.
7. Gemini generates an intelligent proctoring report.
8. Examiner reviews AI-generated insights after the exam.

---

# 🎯 Future Improvements

- Voice activity detection
- Mobile phone detection
- Screen recording
- Eye tracking improvements
- Live examiner notifications
- AI-generated feedback
- Plagiarism detection
- Multi-language support
- LMS integration
- Advanced analytics dashboard

---

# 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create a new feature branch
3. Commit your changes
4. Open a Pull Request

---

# 📄 License

This project is licensed under the **MIT License**.

---

## ⭐ If you found this project useful, consider giving it a star!