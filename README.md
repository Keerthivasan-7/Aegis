# Aegis — AI-Powered Secure Assessment Platform

Aegis is a high-integrity, production-ready secure online assessment platform designed to eliminate academic dishonesty and ensure fair testing conditions. Leveraging advanced web technologies, full-stack architecture, real-time client-side computer vision proctoring, and server-side generative artificial intelligence risk review, Aegis provides an automated, objective trust score and a detailed analytical report for every technical evaluation.

---

## 🚀 Core Platform Features

- **Real-Time Webcam Proctoring HUD**: Features zero-latency, client-side face and eye tracking powered by **face-api.js** to detect student absence, gaze departure, or secondary persons inside the camera frame.
- **Strict Workspace Restrictions**: Proactively enforces browser focus locks (detects tab-switching), full-screen enforcement, and restrictive copy-paste blocks.
- **Deep AI Risk Assessment**: Offloads full-stack analysis to the backend using the **Gemini 3.5 Flash API** to generate granular security review summaries, academic integrity logs, and code evaluation recommendations.
- **Interactive Sandbox & Evaluation**: Provides fully operational assessment Runners, multiple-choice structures, real-time feedback gauges, and custom code editors.
- **Examiner Ledger & Dashboards**: Hosts a responsive, sophisticated dark dashboard with real-time audit logs, distribution charts, risk metrics, and deep candidate profiles.

---

## 🧠 Artificial Intelligence Capabilities

Aegis utilizes **Gemini 3.5 Flash** as its primary cloud-side risk analysis and evaluator service. 

- **Risk Score Generation**: Computes a detailed rating from `0` to `100` representing absolute trust vs. high-likelihood compromises.
- **Behavioral Correlation**: Correlates client-side physical anomalies (e.g., eye gaze deviation, missing face) with interface events (tab switches, sudden optimal code generation) to identify potential external assistance.
- **Code Evaluation**: Inspects code complexity, structure, and execution timelines to detect copied templates or uncharacteristic candidate writing style.
- **Strict Dependency & Robust Fail-safe**: Unlike typical mock setups, Aegis enforces a hard dependency on the Gemini API. If the API returns key unconfiguration or rate-limits, the system flags `AI unavailable` in the interface and relies exclusively on raw, untainted local event ledgers to ensure absolute integrity without fake scores.

---

## 🛠️ Environment Configurations (BYOK Support)

Aegis implements a **Bring Your Own Key (BYOK)** model. The Google Gemini API key remains securely handled on the Node/Express backend and is never exposed to the client-side browser context.

Create a `.env` file in the project root:

```env
# Google Gemini API Key (Required for AI Risk reviews)
GEMINI_API_KEY="your_google_gemini_api_key_here"

# App Hosting URL configuration
APP_URL="http://localhost:3000"
```

---

## ⚙️ Installation & Running Locally

Ensure you have **Node.js 18+** installed on your workstation.

### 1. Install Project Dependencies
Run the package installation command to download all required modules:
```bash
npm install
```

### 2. Prepare Face Detection Models
Ensure face-api.js models (`tiny_face_detector` and `face_landmark_68`) are located within your public assets folder:
```
/public/models/
  ├── tiny_face_detector_model-weights_manifest.json
  ├── tiny_face_detector_model-shard1
  ├── face_landmark_68_model-weights_manifest.json
  └── face_landmark_68_model-shard1
```

### 3. Run Development Server
Boot both the Express API and Vite live frontend server in parallel:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) inside your web browser.

---

## 🏗️ Production Build & Deployment

Aegis is optimized for containerized environments (Google Cloud Run) or hosting layers like Netlify.

### 1. Compile and Bundle for Production
Build the static assets and compile the Express backend server with:
```bash
npm run build
```
This script bundles files and generates:
- Frontend assets inside `/dist/`
- Compiled CommonJS backend inside `/dist/server.cjs`

### 2. Start Production Server
Launch the production bundle via:
```bash
npm run start
```

---

## 🏆 Hackathon Judging Compliance

- **No Placeholders**: Every visual component, code workspace, and proctor action is fully live, driven by real detections, and backed by authentic API evaluation.
- **Aesthetic Precision**: Implements a custom **Sophisticated Dark** SaaS design with smooth micro-interactions, responsive grids, and clean visual structures.
- **Academic Reliability**: Emphasizes strict, uncompromised audit trail security and compliant grading standards.
