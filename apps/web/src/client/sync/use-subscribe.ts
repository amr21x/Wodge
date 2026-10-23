/**
 * Modified useSubscribe from replicache-react.
 * Adding `isPending` state to track if the query is still pending
 * for better loading and not found states handling.
 *
 * Last modified at replicache-react@5.0.1
 *
 * @returns {any} snapshot
 * @returns {boolean} isPending
 *
 * credits: @rocicorp/replicache-react
 */

import { DependencyList, useEffect, useState } from "react";
import { unstable_batchedUpdates } from "react-dom";

export type Subscribable<Tx> = {
  subscribe<Data>(
    query: (tx: Tx) => Promise<Data>,
    options: {
      onData: (data: Data) => void;
      isEqual?: ((a: Data, b: Data) => boolean) | undefined;
    },
  ): () => void;
};

// We wrap all the callbacks in a `unstable_batchedUpdates` call to ensure that
// we do not render things more than once over all of the changed subscriptions.

let hasPendingCallback = false;

let callbacks: (() => void)[] = [];

function doCallback() {
  const cbs = callbacks;

  callbacks = [];
  hasPendingCallback = false;
  unstable_batchedUpdates(() => {
    for (const callback of cbs) {
      callback();
    }
  });
}

type RemoveUndefined<T> = T extends undefined ? never : T;

type UseSubscribeOptions<QueryRet, Default> = {
  /** Default can already be undefined since it is an unbounded type parameter. */
  default?: Default;
  dependencies?: DependencyList | undefined;
  isEqual?: ((a: QueryRet, b: QueryRet) => boolean) | undefined;
};

/**
 * Runs a query and returns the result. Re-runs automatically whenever the
 * query changes.
 *
 * NOTE: Changing `r` will cause the query to be re-run, but changing `query`
 * or `options` will not (by default). This is by design because these two
 * values are often object/array/function literals which change on every
 * render. If you want to re-run the query when these change, you can pass
 * them as dependencies.
 */
export function useSubscribe<
  Tx,
  QueryRet,
  Default = undefined & { isPending: boolean },
>(
  r: Subscribable<Tx> | null | undefined,
  query: (tx: Tx) => Promise<QueryRet>,
  options: UseSubscribeOptions<QueryRet, Default> = {},
): { snapshot: RemoveUndefined<QueryRet> | Default; isPending: boolean } {
  const { default: def, dependencies = [], isEqual } = options;
  const [result, setResult] = useState<{
    source: typeof r;
    snapshot: QueryRet;
  }>();

  /* oxlint-disable react-hooks/exhaustive-deps -- Replicache resubscribes only when the caller-supplied dependencies change; inline query and comparator identities are intentionally ignored. */
  useEffect(() => {
    if (!r) return;
    let active = true;
    const unsubscribe = r.subscribe(query, {
      onData: (data) => {
        // This is safe because we know that subscribe in fact can only return
        // `R` (the return type of query or def).
        callbacks.push(() => {
          if (active) setResult({ source: r, snapshot: data });
        });

        if (!hasPendingCallback) {
          void Promise.resolve().then(doCallback);
          hasPendingCallback = true;
        }
      },
      isEqual,
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [r, ...dependencies]);
  /* oxlint-enable react-hooks/exhaustive-deps */

  if (result?.source !== r || result?.snapshot === undefined) {
    return { snapshot: def as Default, isPending: !!r && result?.source !== r };
  }
  return {
    snapshot: result.snapshot as RemoveUndefined<QueryRet>,
    isPending: false,
  };
}
