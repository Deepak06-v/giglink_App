# GigLink Mobile

React Native + Expo foundation for the GigLink marketplace app.

## Stack

- Expo SDK 57 · React Native 0.86 · TypeScript
- Expo Router · Zustand · Axios · Expo SecureStore
- Lucide icons · Inter font

## Setup

```bash
cd mobile
npm install
cp .env.example .env
# Edit EXPO_PUBLIC_API_URL for your environment
npm start
```

### API URL notes

| Environment | Example URL |
|-------------|-------------|
| iOS Simulator | `http://localhost:7000/api` |
| Android Emulator | `http://10.0.2.2:7000/api` |
| Physical device | `http://<your-lan-ip>:7000/api` |

## Scripts

- `npm start` — Expo dev server
- `npm run android` — Open on Android emulator/device
- `npm run ios` — Open on iOS simulator
- `npx tsc --noEmit` — TypeScript check

## Documentation

- Design system: `../docs/MOBILE_DESIGN_SYSTEM.md`
- API contract: `../MOBILE_API_CONTRACT.md`

## Phase status

**Phase 3 complete** — Worker application (jobs, applications, assignments, profile).

**Phase 2 complete** — email/password authentication.

See `../docs/MOBILE_AUTH.md` for authentication architecture.

### Maps (Phase 3)

- Package: `react-native-maps@1.20.1` (compatible with Expo SDK 57)
- Used for job/assignment location preview only — no worker location permission required
- `Open in Maps` uses platform `Linking` URLs via `utils/maps.ts`
