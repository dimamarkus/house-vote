import Link from 'next/link';
import { HeaderActions } from './HeaderActions';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
      <div className="flex h-14 w-full items-center">
        <div className="flex w-full items-center">
          <div className="mr-4 hidden md:flex">
            <Link href="/" className="mr-6 flex items-center space-x-2">
              <span className="font-bold sm:inline-block">HouseVote</span>
            </Link>
            <nav className="flex items-center gap-6 text-sm">
              {/* Add other navigation links here if needed */}
              <Link
                href="/trips"
                className="transition-colors hover:text-foreground/80 text-foreground/60"
              >
                My Trips
              </Link>
              <Link
                href="/trips/create"
                className="transition-colors hover:text-foreground/80 text-foreground/60"
              >
                Create Trip
              </Link>
            </nav>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-2">
            <HeaderActions />
          </div>
        </div>
      </div>
    </header>
  );
}