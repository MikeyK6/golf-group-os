# Golf Group OS

The official history book of your golf group. Rivalries, records, trash talk — all in one place.

## Stack
- **Next.js 14** (App Router)
- **Firebase** (Auth + Firestore)
- **Anthropic Claude API** (AI round recaps)
- **Tailwind CSS**
- **TypeScript**

---

## Setup in 15 minutes

### 1. Clone and install
```bash
git clone https://github.com/YOUR_USERNAME/golf-group-os
cd golf-group-os
npm install
```

### 2. Create a Firebase project
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a new project — call it `golf-group-os`
3. Disable Google Analytics (not needed)
4. **Enable Authentication:**
   - Go to Build → Authentication → Sign-in method
   - Enable **Email/Password**
   - Enable **Google**
5. **Enable Firestore:**
   - Go to Build → Firestore Database
   - Click "Create database"
   - Start in **test mode** (you'll tighten rules later)
6. **Get your config:**
   - Go to Project Settings → Your Apps → Add app → Web
   - Copy the `firebaseConfig` object

### 3. Get an Anthropic API key
- Go to [console.anthropic.com](https://console.anthropic.com)
- Create an API key

### 4. Set up environment variables
```bash
cp .env.local.example .env.local
```

Fill in `.env.local` with your values:
```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
ANTHROPIC_API_KEY=sk-ant-...
```

### 5. Run it
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Firestore collections

The app creates these automatically as data flows in:

| Collection | Description |
|---|---|
| `users` | One doc per user — name, email, handicap, groups |
| `groups` | One doc per group — name, members, invite code |
| `rounds` | One doc per round — scores, format, recap text |
| `rivalries` | One doc per pair — `{groupId}_{uid1}_{uid2}` |
| `player_stats` | Computed stats per player per group |
| `awards` | Season awards and superlatives |

## Firestore security rules (add before going public)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth.uid == uid;
    }
    match /groups/{groupId} {
      allow read: if request.auth != null &&
        resource.data.members.exists(m => m.userId == request.auth.uid);
      allow create: if request.auth != null;
      allow update: if request.auth != null &&
        resource.data.members.exists(m => m.userId == request.auth.uid && m.isAdmin == true);
    }
    match /rounds/{roundId} {
      allow read, write: if request.auth != null;
    }
    match /rivalries/{id} {
      allow read, write: if request.auth != null;
    }
    match /player_stats/{id} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Deploy to Vercel

```bash
# Push to GitHub first
git add .
git commit -m "initial commit"
git push origin main
```

Then:
1. Go to [vercel.com](https://vercel.com) → Import your GitHub repo
2. Add all `.env.local` variables in the Vercel dashboard under Environment Variables
3. Deploy — you'll have a live URL in 2 minutes

---

## What to build next (Week 2+)

- [ ] Hole-by-hole scorecard entry
- [ ] Ryder Cup event creation flow
- [ ] Golf trip planner
- [ ] Push notifications when a round is logged
- [ ] Season awards calculation (auto-runs at year end)
- [ ] Shareable rivalry cards (OG image generation)
- [ ] Mobile PWA manifest for home screen install
