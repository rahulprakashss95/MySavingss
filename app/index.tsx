import { Redirect } from "expo-router";
import { useAuth } from "../src/context/AuthContext";

/**
 * Entry route: send signed-in users to the tabs, everyone else to login. While
 * the session is still being restored we render nothing (the splash screen is
 * still up, see app/_layout.tsx) rather than redirecting to /login and bouncing
 * back once the session loads.
 */
export default function Index() {
  const { user, isRestoring } = useAuth();
  if (isRestoring) {
    return null;
  }
  return <Redirect href={user ? "/home" : "/login"} />;
}
