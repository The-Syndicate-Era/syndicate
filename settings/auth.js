
/* =========================================
   THE SYNDICATE
   DISCORD AUTHENTICATION
   ========================================= */

const syndicateAuth = window.syndicateDB;

// Sign in through Discord
async function loginWithDiscord() {
  const redirectUrl =
    window.location.origin + "/syndicate/index.html";

  const { data, error } =
    await syndicateAuth.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: redirectUrl,
        scopes: "identify email guilds.members.read"
      }
    });

  if (error) {
    console.error("Discord login failed:", error);
    alert("Unable to connect to Discord. Please try again.");
  }

  return { data, error };
}

// Sign out
async function logoutFromSyndicate() {
  const { error } = await syndicateAuth.auth.signOut();

  if (error) {
    console.error("Logout failed:", error);
    return;
  }

  window.location.href = "/syndicate/index.html";
}

// Get current authenticated user
async function getSyndicateUser() {
  const { data, error } =
    await syndicateAuth.auth.getUser();

  if (error) {
    console.error("Unable to get user:", error);
    return null;
  }

  return data.user;
}

// Make functions available to website pages
window.syndicateAuth = {
  login: loginWithDiscord,
  logout: logoutFromSyndicate,
  getUser: getSyndicateUser
};
