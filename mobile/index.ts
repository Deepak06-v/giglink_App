/**
 * Custom app entry.
 *
 * Pushy requires its notification listeners to be registered at module scope
 * (from the entry file), NOT from a React component, so they also run while the
 * app is backgrounded or killed (headless JS) and survive any route remounts.
 *
 * A root-level index.ts (instead of app/App.tsx) is required here: expo-router
 * treats every file inside app/ as a route — including App.tsx — so a parallel
 * app/App.tsx would become a real "/App" route. The root entry is the same
 * layout the official pushy-demo-expo uses.
 */
import 'expo-router/entry';

import { setupPushyListeners } from '@/lib/notifications/pushy';

setupPushyListeners();