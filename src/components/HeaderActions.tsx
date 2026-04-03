'use client';

// import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { SignedIn, UserButton } from '@clerk/nextjs';
import { useAuthStatus } from '@turbodima/core/auth/client/useAuthStatus';
import { SIGNIN_PATH } from '@turbodima/core/constants';
import { Button } from '@turbodima/ui/core/Button';
import { ThemeToggle } from '@turbodima/ui/core/ThemeToggle';
import Link from 'next/link';

export function HeaderActions() {
  const { isAuthenticated, isLoading } = useAuthStatus();
  // const isAuthenticated = true
  // const isLoading = false

  return (
    <div className="flex items-center gap-2">
      <SignedIn>
        {/* <NotificationBell /> */}
      </SignedIn>
      <div className="flex items-center gap-4">
        {isLoading ? (
          <div className="animate-pulse w-24 h-8 bg-muted rounded"></div>
        ) : isAuthenticated ? (
          <UserButton
            userProfileUrl="/profile"
          />
        ) : (
          <Button asChild>
            <Link href={SIGNIN_PATH}>Sign In</Link>
          </Button>
        )}
      </div>
      <ThemeToggle />
    </div>
  );
}