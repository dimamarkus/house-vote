import { Button } from "@turbodima/ui/shadcn/button";
import Link from "next/link";
import { Show } from "@clerk/nextjs";

export default function HomePage() {
  return (
    <div className="container flex flex-col items-center justify-center min-h-screen py-12">
      <div className="flex flex-col items-center justify-center space-y-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          Plan Your Group Trip Housing Together
        </h1>
        <p className="max-w-[42rem] text-lg text-muted-foreground">
          Stop juggling links and opinions. HouseVote lets your group easily collect, compare, and vote on rental listings for your next trip.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Show when="signed-out">
            <Button asChild size="lg">
              <Link href="/sign-in">Get Started</Link>
            </Button>
            <Button asChild weight="hollow" size="lg">
              {/* This will redirect to sign-in if not authenticated */}
              <Link href="/trips">View Your Trips</Link>
            </Button>
          </Show>
          <Show when="signed-in">
            <Button asChild size="lg">
              <Link href="/trips">Go to My Trips</Link>
            </Button>
          </Show>
        </div>
      </div>
    </div>
  );
}