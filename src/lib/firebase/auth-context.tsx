"use client";

import {
  onAuthStateChanged,
  signInAnonymously,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { connectGoogleAccount, type GoogleConnectOutcome } from "@/lib/firebase/google-auth-flow";
import { userHasGoogleIdentity } from "@/lib/firebase/google-identity";
import { consumeGoogleRedirectResult } from "@/lib/firebase/redirect-result";
import { syncUserProfile } from "@/lib/firebase/user-profile";
import { getOrCreateLocalUid } from "@/lib/local/uid";

type AuthCtx = {
  user: User | null;
  ready: boolean;
  mode: "firebase" | "local";
  uid: string | null;
  effectiveUid: string | null;
  isAnonymous: boolean;
  hasGoogleIdentity: boolean;
  signInAnonymous: () => Promise<void>;
  /** Creates an anonymous Firebase user when needed (e.g. after finishing an assessment). */
  ensureAnonymousSession: () => Promise<string | null>;
  linkOrSignInWithGoogle: () => Promise<GoogleConnectOutcome>;
  linkGoogle: () => Promise<GoogleConnectOutcome>;
  signInWithGoogle: () => Promise<GoogleConnectOutcome>;
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

    let cancelled = false;
    let redirectSettled = false;
    let authStateSeen = false;

    const tryMarkReady = () => {
      if (!cancelled && redirectSettled && authStateSeen) setReady(true);
    };

    void consumeGoogleRedirectResult(auth)
      .then((result) => {
        if (result?.user) void syncUserProfile(result.user);
      })
      .finally(() => {
        redirectSettled = true;
        tryMarkReady();
      });

    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) void syncUserProfile(u);
      authStateSeen = true;
      tryMarkReady();
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, [canUseFirebase]);

  const value = useMemo<AuthCtx>(
    () => {
      const uid = user?.uid ?? localUid;
      const hasGoogleIdentity = userHasGoogleIdentity(user);
      const isAnonymous = Boolean(user?.isAnonymous);
      const linkOrSignInWithGoogle = async () => {
        const auth = getFirebaseAuth();
        if (!auth) return "cancelled" as const;
        return connectGoogleAccount(auth, auth.currentUser);
      };

      return {
        user,
        ready,
        mode: canUseFirebase ? "firebase" : "local",
        uid,
        effectiveUid: uid,
        isAnonymous,
        hasGoogleIdentity,
        signInAnonymous: async () => {
          const auth = getFirebaseAuth();
          if (!auth) return;
          await signInAnonymously(auth);
        },
        ensureAnonymousSession: async () => {
          const auth = getFirebaseAuth();
          if (!auth) return null;
          if (auth.currentUser?.uid) return auth.currentUser.uid;
          try {
            await signInAnonymously(auth);
          } catch {
            return null;
          }
          for (let i = 0; i < 40; i++) {
            if (auth.currentUser?.uid) return auth.currentUser.uid;
            await new Promise((r) => setTimeout(r, 50));
          }
          return null;
        },
        linkOrSignInWithGoogle,
        linkGoogle: linkOrSignInWithGoogle,
        signInWithGoogle: async () => {
          const auth = getFirebaseAuth();
          if (!auth) return "cancelled";
          return connectGoogleAccount(auth, null);
        },
        signOut: async () => {
          const auth = getFirebaseAuth();
          if (!auth) return;
          await firebaseSignOut(auth);
        },
      };
    },
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
      uid: null,
      effectiveUid: null,
      isAnonymous: false,
      hasGoogleIdentity: false,
      signInAnonymous: async () => {},
      ensureAnonymousSession: async () => null,
      linkOrSignInWithGoogle: async () => "cancelled",
      linkGoogle: async () => "cancelled",
      signInWithGoogle: async () => "cancelled",
      signOut: async () => {},
    };
  }
  return ctx;
}
