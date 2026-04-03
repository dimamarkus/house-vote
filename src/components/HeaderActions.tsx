'use client';

// import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { UserButton } from '@clerk/nextjs';
import { useAuthStatus } from '@turbodima/core/auth/client/useAuthStatus';
import { SIGNIN_PATH } from '@turbodima/core/constants';
import { LinkButton } from '@turbodima/ui/core/LinkButton';
import { ThemeToggle } from '@turbodima/ui/core/ThemeToggle';

export function HeaderActions() {
  const { isAuthenticated, isLoading } = useAuthStatus();
  // const isAuthenticated = true
  // const isLoading = false

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-4">
        {isLoading ? (
          <div className="animate-pulse w-24 h-8 bg-muted rounded"></div>
        ) : isAuthenticated ? (
          <UserButton
            userProfileUrl="/profile"
          />
        ) : (
          <LinkButton href={SIGNIN_PATH}>Sign In</LinkButton>
        )}
      </div>
      <ThemeToggle />
    </div>
  );
}