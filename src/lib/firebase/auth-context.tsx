"use client";

import {
  GoogleAuthProvider,
  linkWithPopup,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { syncUserProfile } from "@/lib/firebase/user-profile";
import { getOrCreateLocalUid } from "@/lib/local/uid";

type AuthCtx = {
  user: User | null;
  ready: boolean;
  mode: "firebase" | "local";
  effectiveUid: string | null;
  signInAnonymous: () => Promise<void>;
  linkGoogle: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx | null>(null);

export function FirebaseAuthProvider({ children }: { children: React.ReactNode }) {
  const canUseFirebase = isFirebaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(() => !canUseFirebase);
  /** Device fallback when Firebase isn’t used or anonymous auth fails / is disabled */
  const [localUid, setLocalUid] = useState<string | null>(() => (canUseFirebase ? null : getOrCreateLocalUid()));

  useEffect(() => {
    if (!canUseFirebase) return;

    const auth = getFirebaseAuth();
    if (!auth) {
      queueMicrotask(() => {
        setLocalUid(getOrCreateLocalUid());
        setReady(true);
      });
      return;
    }

    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        void syncUserProfile(u);
        setReady(true);
        return;
      }
      // Avoid ready+null user: children (e.g. results) would gate on Google and spin forever.
      setReady(false);
      void signInAnonymously(auth)
        .then(() => {
          /* onAuthStateChanged will fire with anonymous user */
        })
        .catch(() => {
          setLocalUid(getOrCreateLocalUid());
          setReady(true);
        });
    });
  }, [canUseFirebase]);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      ready,
      mode: canUseFirebase ? "firebase" : "local",
      effectiveUid: user?.uid ?? localUid,
      signInAnonymous: async () => {
        const auth = getFirebaseAuth();
        if (!auth) return;
        await signInAnonymously(auth);
      },
      linkGoogle: async () => {
        const auth = getFirebaseAuth();
        const u = auth?.currentUser;
        if (!auth || !u) return;
        const provider = new GoogleAuthProvider();
        await linkWithPopup(u, provider);
      },
      signInWithGoogle: async () => {
        const auth = getFirebaseAuth();
        if (!auth) return;
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      },
      signOut: async () => {
        const auth = getFirebaseAuth();
        if (!auth) return;
        await firebaseSignOut(auth);
      },
    }),
    [user, ready, localUid, canUseFirebase],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useFirebaseAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      user: null,
      ready: true,
      mode: "local",
      effectiveUid: null,
      signInAnonymous: async () => {},
      linkGoogle: async () => {},
      signInWithGoogle: async () => {},
      signOut: async () => {},
    };
  }
  return ctx;
}
