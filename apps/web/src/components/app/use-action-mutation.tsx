"use client";

import { type UseMutationOptions, useMutation } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import type { ActionResult } from "@/app/actions/result";
import { Icon } from "../icon";
import { useApp } from "./app-context";

/** A refusal already explained to the member by `handle` (toast or login prompt). */
class ActionRefused extends Error {}

/**
 * `useMutation` over a Server Action. The UI updates in `onMutate` before the
 * server answers; when the action fails, `handle` shows the reason (or the login
 * prompt, replaying the same call after sign-in) and `onError` rolls back.
 */
export function useActionMutation<
  TVars = void,
  TData = unknown,
  TContext = unknown,
>(
  action: (vars: TVars) => Promise<ActionResult<TData>>,
  options: Omit<
    UseMutationOptions<TData, Error, TVars, TContext>,
    "mutationFn"
  > = {},
) {
  const { handle, toast } = useApp();
  const replay = useRef<(vars: TVars) => void>(() => {});
  const mutation = useMutation<TData, Error, TVars, TContext>({
    ...options,
    mutationFn: async (vars) => {
      const result = await action(vars);
      if (!result.ok) {
        handle(result, () => replay.current(vars));
        throw new ActionRefused(result.error);
      }
      return handle(result) as TData;
    },
    onError: (error, ...rest) => {
      // Network failure or crash: the action never produced a readable result.
      if (!(error instanceof ActionRefused))
        toast(
          <>
            <Icon name="alert" />
            <div>Action impossible pour le moment. Réessayez.</div>
          </>,
        );
      return options.onError?.(error, ...rest);
    },
  });
  const { mutate } = mutation;
  useEffect(() => {
    replay.current = mutate;
  }, [mutate]);
  return mutation;
}
