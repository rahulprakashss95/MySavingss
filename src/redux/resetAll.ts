import { createAction } from "@reduxjs/toolkit";

/**
 * Clears every cached slice. Dispatched on sign-out (and on sign-in, in case a
 * different family is being entered) so one session's data never leaks into the
 * next — the cache is in-memory only and starts empty each login.
 */
export const resetAll = createAction("app/resetAll");
