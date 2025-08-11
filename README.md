# Focus - Procrastination Management App

**Start sooner, stay focused, finish on time**

A simple yet powerful web application designed to help you overcome procrastination through 25-minute focus sessions, AI-powered task breakdown, and distraction capture.

## 🎯 Core Value Proposition

Help users start sooner, stay focused, and finish on time by lowering friction to begin and increasing short, rewarding feedback loops.

## 🚀 MVP Features

### ✅ Implemented
- **One-tap Start**: Big Start button creates a 25-minute focus session
- **Task Mini-scope**: Auto-split tasks into 3 tiny, specific steps
- **Countdown Focus Timer**: 25-minute Pomodoro with visual progress
- **Distraction Capture**: One-swipe "Not now" scratchpad for intrusive thoughts
- **Momentum Streaks**: Daily streak tracking to reward consistency
- **Task Breakdown**: AI-powered task splitting into actionable micro-steps

### 🔄 In Progress
- Session summary with achievements
- Calendar integration
- Offline PWA functionality
- Notification system
- Enhanced AI task analysis

## 🛠️ Technology Stack

- **Frontend**: Next.js 15, React, TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Heroicons
- **PWA**: Web App Manifest, Service Workers
- **Backend** (Future): Supabase for auth, database, real-time features
- **AI** (Future): OpenAI API for task breakdown and rescue suggestions

## 📁 Project Structure

```
focus-app/
├── src/
│   ├── app/                    # Next.js app directory
│   │   ├── page.tsx           # Main application page
│   │   ├── layout.tsx         # Root layout with metadata
│   │   └── globals.css        # Global styles
│   ├── components/            # React components
│   │   ├── StartButton.tsx    # Main start button with task input
│   │   ├── TimerDisplay.tsx   # Circular progress timer
│   │   └── DistractionCapture.tsx # Distraction capture modal
│   ├── hooks/                 # Custom React hooks
│   │   └── useTimer.ts        # Timer logic and utilities
│   └── types/                 # TypeScript type definitions
│       └── index.ts           # Core app types
├── docs/                      # Documentation
│   └── database-schema.sql    # Complete database schema
├── public/                    # Static assets
│   └── manifest.json          # PWA manifest
└── package.json
```

## 🏃‍♂️ Quick Start

1. **Clone and install dependencies**:
   ```bash
   cd focus-app
   npm install
   ```

2. **Run the development server**:
   ```bash
   npm run dev
   ```

3. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🎮 How to Use

### Starting a Focus Session
1. Click the big **"Start Focus Session"** button
2. Or add a new task by clicking **"Add New Task"**
3. The app will automatically break your task into 3 tiny steps
4. Timer starts immediately for 25 minutes

### During a Session
- **Pause/Resume**: Yellow button to pause and resume
- **Capture Distractions**: Orange "Not Now" button to quickly save distracting thoughts
- **Stop**: Red button to end the session early

### After a Session
- View your achievements and progress
- See captured distractions for later review
- Start another session or take a break

## 🧠 Key Behavioral Features

### Activation Energy Reduction
- **One-tap start**: No complex setup required
- **Auto task breakdown**: AI creates actionable micro-steps
- **Quick task input**: Natural language → instant 3-step plan

### Context Maintenance
- **Distraction capture**: Save thoughts without losing focus
- **Visual progress**: Circular timer shows advancement
- **Next action clarity**: Always shows the smallest next step

### Reward Loops
- **Streak tracking**: Daily consistency rewards
- **Session completion**: Celebration and achievements
- **Progress visualization**: Clear advancement indicators

## 🏗️ Development Roadmap

### Phase 1: MVP (Complete)
- [x] Core timer functionality
- [x] Task breakdown system
- [x] Distraction capture
- [x] Basic streak tracking
- [x] PWA foundation

### Phase 2: Enhanced Experience
- [ ] Session summaries with insights
- [ ] Sound notifications and themes
- [ ] Calendar integration
- [ ] Offline functionality
- [ ] Enhanced AI suggestions

### Phase 3: Behavior Change
- [ ] Implementation intentions
- [ ] Deadline back-planning
- [ ] Focus mode integrations
- [ ] Rescue mode for getting unstuck
- [ ] Habit formation tracking

### Phase 4: Social & Scale
- [ ] Shared accountability
- [ ] Team focus rooms
- [ ] Advanced analytics
- [ ] API integrations

## 🎨 Design Philosophy

### Start-First Design
No heavy planning required before you can focus. The friction to begin should be as low as possible.

### Automatic Tiny Steps
AI turns vague tasks into actionable micro-steps in seconds, removing the mental overhead of planning.

### Gentle Accountability
Streaks reward showing up, not perfection. The app encourages consistency without punishment.

### Distraction Safety
Keeps the brain "safe" by not losing ideas while preventing derailment from the main task.

## 🔧 Configuration

### Timer Settings
Default session length is 25 minutes (1500 seconds). This can be configured in the main page component.

### Task Breakdown
The `generateTaskSteps()` function provides smart defaults for common task types (writing, coding, studying, etc.).

### PWA Settings
The app is configured as a Progressive Web App with offline capabilities and can be installed on mobile devices.

## 🗄️ Database Schema

The complete database schema is available in `docs/database-schema.sql`. Key tables include:

- **users**: User accounts and settings
- **tasks**: User tasks with status and metadata
- **task_steps**: AI-generated micro-steps for each task
- **sessions**: Focus session tracking
- **distractions**: Captured thoughts during sessions
- **streaks**: Daily streak calculation

## 🤝 Contributing

This is an MVP implementation. Future contributions might include:

- Enhanced AI task analysis
- Additional timer themes and sounds
- Integration with external task managers
- Advanced analytics and insights
- Social features and accountability

## 📱 PWA Installation

The app can be installed as a Progressive Web App:

1. Open the app in a supported browser (Chrome, Safari, Edge)
2. Look for the "Install" prompt or "Add to Home Screen" option
3. Follow the installation prompts
4. Launch the app from your home screen or app drawer

## 📊 Success Metrics

- **Activation rate**: % of users who start a session within 24 hours
- **Time to first start**: Median seconds from open to first timer running
- **Weekly retention**: % of users with 3+ sessions per week
- **Session completion**: % of started sessions completed
- **Distraction effectiveness**: Average captures per session

## 📝 License

This project is part of a product development exercise focused on procrastination management and behavior change through technology.

---

**Built with ❤️ and ☕ to help people start sooner and finish stronger**
