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

export async function acceptInviteWithPassword(email, password, mode = "signup") {
  const normalizedEmail = email.trim().toLowerCase();

  if (mode === "signup") {
    const inviteResult = requireData(
      await withTimeout(
        supabase.functions.invoke("accept-invite", {
          body: { email: normalizedEmail, password }
        }),
        "Invite setup took too long. Please try again."
      ),
      "Could not create invite login"
    );
    if (!inviteResult?.profile?.id) throw new Error("No pending invite found for this email.");
  }

  const auth = requireData(
    await withTimeout(
      supabase.auth.signInWithPassword({ email: normalizedEmail, password }),
      "Supabase Auth took too long. Please try again."
    ),
    "Could not sign in"
  );

  const profile = mode === "signin"
    ? requireData(
        await withTimeout(supabase.rpc("accept_profile_invite"), "Invite linking took too long. Please try again."),
        "Could not link invite"
      )
    : await loadProfileForAuthUser(auth.user?.id, normalizedEmail);

  return { auth, profile: profile?.[0] || profile };
}

function withTimeout(promise, message, ms = 15000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms))
  ]);
}
