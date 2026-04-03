import { LinkButton } from "@turbodima/ui/core/LinkButton";
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
            <LinkButton href="/sign-in" size="lg">
              Get Started
            </LinkButton>
            <LinkButton href="/trips" size="lg" weight="hollow">
              View Your Trips
            </LinkButton>
          </Show>
          <Show when="signed-in">
            <LinkButton href="/trips" size="lg">
              Go to My Trips
            </LinkButton>
          </Show>
        </div>
      </div>
    </div>
  );
}