"use client";

import { PageViewTracker } from "@/components/analytics/PageViewTracker";
import { FirebaseAuthProvider } from "@/lib/firebase/auth-context";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseAuthProvider>
      <PageViewTracker />
      {children}
    </FirebaseAuthProvider>
  );
}
