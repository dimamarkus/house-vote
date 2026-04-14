import Link from 'next/link';

export default function ShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border/60 px-6 py-4">
        <div className="mx-auto flex w-full max-w-none items-center justify-center text-sm text-muted-foreground 2xl:px-10">
          <span>
            Powered by{' '}
            <Link href="/" className="font-medium text-foreground transition-colors hover:text-primary">
              HouseVote
            </Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
