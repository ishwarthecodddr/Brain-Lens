# Brain Lens 🧠📷

**AI-Powered Live Tutor for Step-by-Step Problem Solving**

Brain Lens is an innovative educational platform that combines computer vision, real-time conversation, and AI reasoning to provide personalized tutoring. Unlike traditional AI tools that simply provide solutions, Brain Lens acts like a human tutor sitting beside the student, guiding them through problem-solving without giving direct answers.

## 🎯 Key Features

### 1. **Live Camera Understanding**
- Points camera at a notebook or paper
- AI vision instantly extracts math/science problems
- No manual problem entry required

### 2. **Step-by-Step Tutoring**
- Capture each solution step as you write it
- AI evaluates correctness in real-time
- Provides hints, corrections, and guidance—never direct answers

### 3. **Real-Time Mistake Detection**
- Automatic step validation as students solve
- Clear labeling: CORRECT, PARTIALLY CORRECT, or INCORRECT
- Specific feedback pointing out exact mistakes

### 4. **Voice Conversation with AI Tutor**
- Press the mic button to start real-time voice session with Gemini Live API
- Speak questions — the AI tutor responds in real-time audio
- No latency: bidirectional audio streaming via WebSocket
- Natural, conversational tutoring

### 5. **Interactive Learning**
- Manual step capture for immediate feedback
- Quick-access buttons: "Hint" and "Check My Step"
- Conversational history for contextual guidance
- Audio playback of tutor responses

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Google Gemini API key (free tier available at https://aistudio.google.com/apikey)
- Modern web browser with camera access

### Installation

```bash
# 1. Clone or extract the project
cd brain_lens

# 2. Install dependencies
npm install

# 3. Configure your API key
# Copy and edit .env.local (use .env.local.example as a template):
GEMINI_API_KEY=your_gemini_api_key_here

# 4. Start the dev server with WebSocket support
npm run dev

# The server will print:
# ✓ Ready on http://localhost:3000
# ✓ WebSocket live endpoint: ws://localhost:3000/ws/live

# Open http://localhost:3000 in your browser
```

## ⚠️ Important: Stable Operation

### Using the Custom Server (Required for Live Voice)
This app now uses a **custom Next.js server** (not `next dev`) to support real-time WebSocket communication with Gemini Live API.

- **Dev**: `npm run dev` → starts `tsx server.ts` ✓
- **Production**: `npm run build && npm start` ✓
- ❌ **Do NOT** run `next dev` directly — it won't work with WebSocket

### Preventing Auto-Refresh Issues
If the app keeps refreshing:

1. **Kill stale processes:**
   ```bash
   # On macOS/Linux:
   lsof -i :3000 | grep -v PID | awk '{print $2}' | xargs kill -9
   
   # On Windows PowerShell:
   Get-Process -Id (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue).OwningProcess | Stop-Process -Force
   ```

2. **Clean build artifacts:**
   ```bash
   rm -r .next        # or rmdir /s .next on Windows
   npm run dev        # Fresh start
   ```

3. **Check logs** for errors — the server will print issues to console. Monitor the terminal while using the app.

### Environment Setup
- **API Key Required**: Set `GEMINI_API_KEY` in `.env.local`
- ❌ Won't work without it
- Get key: https://aistudio.google.com/app/apikey

## 📖 How to Use

### **Main Workflow:**

1. **Go to Tutor** → Click "Start Learning Now" on the landing page
2. **Start Camera** → Grant camera permissions and click "Start Camera"
3. **Capture Problem** → Point camera at your math problem and click "Capture Problem"
4. **Solve Step-by-Step:**
   - Write your solution step on paper
   - Click "Capture Step" after each step
   - Get feedback from the AI tutor
5. **Interact via Chat:**
   - Use quick buttons: "Hint" or "Check My Step"
   - Type questions directly
   - Click mic icon to speak to the tutor
6. **Listen to Guidance:** Tutor responses are read aloud automatically

## 💻 Tech Stack

| Component | Technology |
|-----------|-----------|
| **Frontend** | Next.js 16, React 19, TailwindCSS, TypeScript |
| **Backend** | Node.js custom server (tsx), Next.js API Routes |
| **Real-Time Communication** | WebSocket (ws), Gemini Live API (gemini-2.0-flash-live-001) |
| **AI/ML** | Google Gemini 2.5 Flash API (vision + chat), Gemini 2.0 Flash Live (voice) |
| **Audio Processing** | Web Audio API, AudioWorklet (PCM conversion) |
| **Vision** | Web Camera API, Canvas API |
| **Legacy Speech** | Web Speech API (Recognition + Synthesis) |
| **Icons** | Lucide React |

## 🏗️ Architecture

```
brain_lens/
├── server.ts                  # Custom HTTP server + WebSocket handler (runs on npm run dev)
├── app/
│   ├── page.tsx              # Redirect to landing
│   ├── landing/page.tsx      # Landing page (marketing)
│   ├── tutor/page.tsx        # Main tutor interface
│   ├── api/
│   │   ├── read-problem/     # Vision API for problem extraction + step detection
│   │   └── tutor/            # Chat API for text-based tutor responses
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── CameraView.tsx        # Live camera & capture controls
│   ├── TutorChat.tsx         # Main chat interface & step evaluation
│   ├── LiveVoiceButton.tsx   # Live voice session control (Gemini Live API)
│   ├── MessageBubble.tsx     # Chat message rendering
│   └── ui/                   # Reusable UI components
├── hooks/
│   ├── useLiveVoice.ts       # WebSocket connection + audio I/O for Gemini Live
│   └── useToast.ts           # Toast notifications
├── lib/
│   ├── gemini.ts             # Gemini API client (vision + chat)
│   ├── liveSession.ts        # WebSocket handler: relays audio/transcripts to Gemini Live
│   └── tutorPrompt.ts        # System prompts (text chat + live voice)
├── public/
│   └── pcm-processor.js      # AudioWorklet: converts mic audio to PCM for Gemini
└── .env.local                # API key (create from .env.local.example)
```

## 🔑 Key Implementation Details

### **Vision Pipeline**
- **extractMathProblem()**: Reads problem text from notebook image
- **extractStudentStep()**: Detects latest written solution step
- **Auto-fallback**: Tries multiple Gemini models if one fails (quota resilience)

### **Tutor Logic**
- **buildTutorContext()**: Constructs system prompt for pedagogical behavior
- **generateTutorResponse()**: Multi-model chat generation with fallback
- **Step Evaluation**: Auto-triggers step checks when new steps are detected
- **Step Retry Logic**: Only marks steps as evaluated after successful API response

### **Error Handling**
- Explicit quota error (429) messaging
- Invalid API key detection (401)
- Model fallback from `gemini-2.5-flash` → `gemini-2.0-flash-lite` → `gemini-2.0-flash`
- Throttled camera captures to prevent API spam

## 🎮 Demo Workflow

**To showcase Brain Lens:**

1. Open `http://localhost:3000`
2. Click "Start Learning Now"
3. Click "Start Camera" and grant permissions
4. Point camera at any math problem (algebraic equation, geometry problem, etc.)
5. Click "Capture Problem"
6. Write a solution step on paper
7. Click "Capture Step"
8. See the tutor evaluate your step
9. Try voice: Click mic icon and ask "Give me a hint"
10. See tutor response + hear it spoken aloud

## 📊 Feature Highlights for Judges

✅ **Real-Time Vision Processing** – Instant problem & step extraction  
✅ **Pedagogically Sound** – Never gives answers, only guidance  
✅ **Interactive** – Multiple input methods: camera, voice, text  
✅ **Resilient** – Quota-aware with automatic model fallback  
✅ **Accessible** – Voice input/output for inclusive learning  
✅ **Hackathon-Ready** – Clean UI, documented code, zero installation friction  

## ⚙️ Configuration & Customization

### **Adjust Step Capture Interval**
In `app/page.tsx`:
```typescript
// Enable auto-capture every N seconds (not recommended for demo)
trackingIntervalRef.current = setInterval(() => {
  captureImage('step');
}, 5000); // Change 5000ms (5 seconds)
```

### **Change Tutor Personality**
In `lib/tutorPrompt.ts`, modify `buildTutorContext()` to customize guidance style.

### **Add More Subjects**
Update vision prompt in `lib/gemini.ts` extractors to handle physics, chemistry, etc.

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "No API key" error | Add valid key to `.env.local` |
| Camera not working | Grant browser permissions, use HTTPS in production |
| Slow step detection | Manual "Capture Step" is faster than auto-polling |
| Voice not working | Check browser supports Web Speech API (Chrome, Edge, Safari) |
| Quota exceeded | Create new API key or wait for daily reset |

## 📱 Browser Support

| Browser | Support |
|---------|---------|
| Chrome | ✅ Full support |
| Edge | ✅ Full support |
| Safari | ✅ Full support (iOS 14.5+) |
| Firefox | ⚠️ Limited (camera works, voice may not) |

## 🤝 Deployment

### **Deploy to Vercel (Recommended)**
```bash
npm install -g vercel
vercel
# Add GEMINI_API_KEY to environment variables in Vercel dashboard
```

### **Deploy to Netlify**
```bash
npm run build
# Deploy the `.next` folder as static site + serverless functions
```

## 📝 API Endpoints

### `POST /api/read-problem`
Extract problem or detect step from image.
```json
{
  "image": "data:image/jpeg;base64,...",
  "mode": "problem" | "step",
  "problem": "optional context"
}
```

### `POST /api/tutor`
Get tutor response for a message.
```json
{
  "message": "Is my step correct?",
  "problem": "Solve 2x + 5 = 13",
  "history": [{"role": "user", "content": "..."}, ...]
}
```

## 🎓 Educational Impact

Brain Lens addresses critical challenges in education:
- **Accessibility**: Brings tutoring to students without resources
- **Engagement**: Interactive, voice-based learning is more engaging
- **Learning Science**: Guides students to construct knowledge vs. memorizing answers
- **Scalability**: One AI tutor can help millions of students simultaneously

## 🏆 Why Brain Lens Wins

1. **Novel UX** – Camera + voice + step-by-step is unique
2. **Production-Ready** – Handles quota limits, has fallbacks, clean error messages
3. **Hackathon-Friendly** – Works with free API tier, zero setup beyond API key
4. **Extensible** – Easy to add new subjects, languages, or features
5. **Team-Friendly** – Well-documented, modular code structure

## 📞 Support & Questions

For questions during the hackathon, refer to:
- **Gemini API Docs**: https://ai.google.dev/
- **Next.js Docs**: https://nextjs.org/docs
- **Web Speech API**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API

---

**Made with ❤️ for students everywhere. Made for hackathons. Powered by Gemini.**
