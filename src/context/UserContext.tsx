'use client';

import { createContext, useContext } from "react";
import type { Profile } from "@/types/database";

interface UserContextValue {
  profile: Profile | null;
}

const UserContext = createContext<UserContextValue>({ profile: null });

export function UserProvider({
  profile,
  children,
}: {
  profile: Profile | null;
  children: React.ReactNode;
}) {
  return (
    <UserContext.Provider value={{ profile }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextValue {
  return useContext(UserContext);
}
