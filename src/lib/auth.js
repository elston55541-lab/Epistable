import { supabase } from "./supabase";
import { requireData } from "./supabaseSafe";

async function loadProfileForAuthUser(userId, fallbackEmail) {
  const profileRows = requireData(
    await supabase
      .from("profiles")
      .select("*")
      .eq("auth_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1),
    "Could not load Epistable profile"
  );

  let profile = profileRows?.[0] || null;

  // Backward-compatible fallback for older seeded records that may not have
  // auth_user_id populated yet.
  if (!profile && fallbackEmail) {
    const fallbackRows = requireData(
      await supabase
        .from("profiles")
        .select("*")
        .eq("email", fallbackEmail.trim().toLowerCase())
        .order("created_at", { ascending: false })
        .limit(1),
      "Could not load Epistable profile"
    );
    profile = fallbackRows?.[0] || null;
  }

  if (!profile) throw new Error("No Epistable profile is linked to this login");
  if (profile.status === "suspended") throw new Error("Account suspended.");
  return profile;
}

export async function signInWithEmail(email, password) {
  const normalizedEmail = email.trim().toLowerCase();

  const auth = requireData(
    await supabase.auth.signInWithPassword({ email: normalizedEmail, password }),
    "Could not sign in"
  );

  const userId = auth.user?.id;
  if (!userId) throw new Error("Signed in without a user profile");

  const profile = await loadProfileForAuthUser(userId, normalizedEmail);

  return { auth, profile };
}

export async function signOut() {
  requireData(await supabase.auth.signOut(), "Could not sign out");
}

export async function getSession() {
  return requireData(await supabase.auth.getSession(), "Could not load session").session;
}

export async function getSessionProfile() {
  const session = await getSession();
  const user = session?.user;
  if (!user?.id) return null;
  return loadProfileForAuthUser(user.id, user.email);
}
