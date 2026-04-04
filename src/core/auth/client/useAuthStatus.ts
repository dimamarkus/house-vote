"use client";

import { useUser } from "@clerk/nextjs";

type PublicMetadataWithRole = {
  role?: unknown;
};

export function useAuthStatus() {
  const { isLoaded, isSignedIn, user } = useUser();
  const publicMetadata = user?.publicMetadata as PublicMetadataWithRole | undefined;
  const role = publicMetadata?.role;

  return {
    isAuthenticated: Boolean(isSignedIn),
    isAdmin: role === "admin",
    isSuperAdmin: role === "superadmin",
    isLoading: !isLoaded,
  };
}
