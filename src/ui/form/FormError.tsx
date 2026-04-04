import type { CompatFormState } from "./Form";

export function FormError({
  state,
}: {
  state: CompatFormState;
}) {
  if (!state.error || typeof state.error !== "string") {
    return null;
  }

  return <p className="text-sm text-destructive">{state.error}</p>;
}
