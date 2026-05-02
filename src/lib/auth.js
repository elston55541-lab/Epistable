import { supabase } from "./supabase";
import { maybeOne, requireData } from "./supabaseSafe";

export async function signInWithEmail(email, password) {
  const auth = requireData(
    await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password }),
    "Could not sign in"
  );

  const userId = auth.user?.id;
  if (!userId) throw new Error("Signed in without a user profile");

  const profile = await maybeOne(
    await supabase
      .from("profiles")
      .select("*")
      .eq("auth_user_id", userId)
      .maybeSingle()
  );

  if (!profile) throw new Error("No Epistable profile is linked to this login");
  if (profile.status === "suspended") throw new Error("Account suspended.");

  return { auth, profile };
}

export async function signOut() {
  requireData(await supabase.auth.signOut(), "Could not sign out");
}

export async function getSession() {
  return requireData(await supabase.auth.getSession(), "Could not load session").session;
}
