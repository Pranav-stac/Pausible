"use client";

import {
  getRedirectResult,
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

    void getRedirectResult(auth)
      .then((result) => {
        if (result?.user) void syncUserProfile(result.user);
      })
      .catch(() => {
        /* Auth state listener below still handles normal sessions. */
      });

    return onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        void syncUserProfile(u);
        setReady(true);
        return;
      }
      // Avoid ready+null user: children (e.g. results) would gate on Google and spin forever.
      setUser(null);
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
      linkOrSignInWithGoogle: async () => "cancelled",
      linkGoogle: async () => "cancelled",
      signInWithGoogle: async () => "cancelled",
      signOut: async () => {},
    };
  }
  return ctx;
}
