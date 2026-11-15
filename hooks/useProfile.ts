"use client";

import { useCallback, useEffect, useState } from "react";
import { createEmptyProfile, readProfile, writeProfile } from "@/lib/storage";
import type { Profile } from "@/lib/types";

const PROFILE_KEY = "isyarat.profile.v1";

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    setProfile(readProfile());
    const onStorage = (event: StorageEvent) => {
      if (event.key === PROFILE_KEY) setProfile(readProfile());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const mutate = useCallback((updater: (current: Profile) => Profile) => {
    setProfile((previous) => {
      const base = previous ?? createEmptyProfile();
      const next = { ...updater(base), updatedAt: Date.now() };
      writeProfile(next);
      return next;
    });
  }, []);

  const reload = useCallback(() => setProfile(readProfile()), []);

  const reset = useCallback(() => {
    const empty = createEmptyProfile();
    writeProfile(empty);
    setProfile(empty);
  }, []);

  return { profile, mutate, reload, reset, ready: profile !== null };
}
