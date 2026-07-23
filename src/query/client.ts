import { QueryCache, QueryClient } from "@tanstack/react-query";
import { showToast } from "../utils/Utils";

/**
 * The app-wide React Query client. Replaces the old in-memory Redux cache: the
 * family's server data is fetched once per session and mutated in place on
 * save/delete, then dropped wholesale on sign-out via `queryClient.clear()`
 * (the successor to the old `resetAll`). It is a module singleton so non-React
 * code — the auth store's sign-in/out — can clear the cache without a hook.
 *
 * `staleTime`/`gcTime` are Infinity so navigating between screens never
 * re-reads data that's already cached; a pull-to-refresh calls `refetch()`
 * explicitly. Fetch failures surface a toast through the shared cache handler
 * below, reading the per-query `meta.errorTitle`.
 */
export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      console.log(error);
      const title =
        (query.meta?.errorTitle as string | undefined) ?? "Something went wrong";
      showToast(
        "error",
        title,
        "Check your connection and pull down to retry.",
        "bottom"
      );
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      gcTime: Infinity,
      retry: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});
