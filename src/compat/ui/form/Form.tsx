"use client";

import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";

type RawFormResult<TData = unknown> = {
  code?: string;
  data?: TData;
  error?: unknown;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
};

export type CompatFormState<TData = unknown> = {
  data?: TData;
  error?: unknown;
  fieldErrors?: Record<string, string[]>;
  isSubmitting?: boolean;
  success?: boolean;
  submissionId: number;
};

function normalizeResult<TData>(result: RawFormResult<TData>): CompatFormState<TData> {
  return {
    data: result?.data,
    error: result?.error,
    fieldErrors: result?.fieldErrors,
    submissionId: Date.now(),
    success: result?.success,
  };
}

export function Form<TData = unknown>({
  action,
  children,
  className,
  errorMessage,
  hideSubmitButton = false,
  id,
  onSuccess,
  resetOnSuccess = false,
  successMessage,
}: {
  action: string | ((formData: FormData) => Promise<unknown>);
  children:
    | React.ReactNode
    | ((formState: CompatFormState<TData>) => React.ReactNode);
  className?: string;
  errorMessage?: string;
  hideSubmitButton?: boolean;
  id?: string;
  onSuccess?: (result: CompatFormState<TData>) => void;
  resetOnSuccess?: boolean;
  successMessage?: string;
}) {
  if (typeof action === "string") {
    const initialState: CompatFormState<TData> = { submissionId: 0 };

    return (
      <form action={action} className={className} id={id} method="get">
        {typeof children === "function" ? children(initialState) : children}
        {!hideSubmitButton ? <button className="sr-only" type="submit" /> : null}
      </form>
    );
  }

  return (
    <ActionForm
      action={action}
      className={className}
      errorMessage={errorMessage}
      hideSubmitButton={hideSubmitButton}
      id={id}
      onSuccess={onSuccess}
      resetOnSuccess={resetOnSuccess}
      successMessage={successMessage}
    >
      {children}
    </ActionForm>
  );
}

function ActionForm<TData = unknown>({
  action,
  children,
  className,
  errorMessage,
  hideSubmitButton,
  id,
  onSuccess,
  resetOnSuccess,
  successMessage,
}: {
  action: (formData: FormData) => Promise<unknown>;
  children:
    | React.ReactNode
    | ((formState: CompatFormState<TData>) => React.ReactNode);
  className?: string;
  errorMessage?: string;
  hideSubmitButton: boolean;
  id?: string;
  onSuccess?: (result: CompatFormState<TData>) => void;
  resetOnSuccess: boolean;
  successMessage?: string;
}) {
  const formRef = React.useRef<HTMLFormElement>(null);
  const shouldAutoToast = typeof children !== "function";

  const initialState: CompatFormState<TData> = {
    submissionId: 0,
  };

  const [state, formAction, isPending] = useActionState(
    async (_previousState: CompatFormState<TData>, formData: FormData) => {
      const result = await action(formData);
      return normalizeResult(result as RawFormResult<TData>);
    },
    initialState,
  );

  React.useEffect(() => {
    if (state.submissionId === 0) {
      return;
    }

    if (state.success) {
      if (resetOnSuccess) {
        formRef.current?.reset();
      }

      if (shouldAutoToast && successMessage) {
        toast.success(successMessage);
      }

      onSuccess?.(state);
      return;
    }

    if (shouldAutoToast) {
      const message =
        typeof state.error === "string" ? state.error : errorMessage ?? "Something went wrong";
      toast.error(message);
    }
  }, [errorMessage, onSuccess, resetOnSuccess, shouldAutoToast, state, successMessage]);

  const formState: CompatFormState<TData> = {
    ...state,
    isSubmitting: isPending,
  };

  return (
    <form action={formAction} className={className} id={id} ref={formRef}>
      {typeof children === "function" ? children(formState) : children}
      {!hideSubmitButton ? <button className="sr-only" type="submit" /> : null}
    </form>
  );
}
