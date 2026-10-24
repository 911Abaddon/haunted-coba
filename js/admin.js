
const loginSection = document.getElementById("loginSection");
const resetSection = document.getElementById("resetSection");
const loginForm = document.getElementById("loginForm");
const resetForm = document.getElementById("resetForm");
const loginUsername = document.getElementById("username");
const loginPassword = document.getElementById("loginPassword");
const loginButton = document.getElementById("loginButton");
const targetUsername = document.getElementById("targetUsername");
const resetButton = document.getElementById("resetButton");
const logoutButton = document.getElementById("logoutButton");
const status = document.getElementById("status");
const result = document.getElementById("result");
const resultUsername = document.getElementById("resultUsername");
const temporaryPassword = document.getElementById("temporaryPassword");
const copyButton = document.getElementById("copyButton");

function showStatus(text, success = false) {
  status.textContent = text;
  status.style.color = success ? "#70e6a1" : "#ff8c96";
}

function hideResult() {
  result.style.display = "none";
  resultUsername.textContent = "";
  temporaryPassword.textContent = "";
}

function showLogin() {
  loginSection.hidden = false;
  resetSection.hidden = true;
  hideResult();
}

function showAdmin() {
  loginSection.hidden = true;
  resetSection.hidden = false;
}

async function getSession() {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) throw error;
  return data.session;
}

async function checkAdmin(session) {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/admin-check`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${session.access_token}`
      },
      body: JSON.stringify({})
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success !== true || data.username !== "test1") {
    throw new Error(data.error || "Δεν έχεις δικαίωμα πρόσβασης.");
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginButton.disabled = true;
  showStatus("");

  try {
    const username = loginUsername.value.trim().toLowerCase();
    const password = loginPassword.value;

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/player-auth`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_KEY
        },
        body: JSON.stringify({
          action: "login",
          username,
          password
        })
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.access_token || !data.refresh_token) {
      throw new Error(data.error || "Αποτυχία σύνδεσης.");
    }

    const { error } = await supabaseClient.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token
    });

    if (error) throw error;

    const session = await getSession();
    await checkAdmin(session);

    loginPassword.value = "";
    showAdmin();
    showStatus("Επιτυχής σύνδεση ως admin.", true);
  } catch (error) {
    await supabaseClient.auth.signOut().catch(() => {});
    showLogin();
    showStatus(error.message || "Αποτυχία σύνδεσης.");
  } finally {
    loginButton.disabled = false;
  }
});

resetForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  resetButton.disabled = true;
  hideResult();
  showStatus("");

  try {
    const session = await getSession();

    if (!session) {
      showLogin();
      throw new Error("Η συνεδρία έληξε. Κάνε ξανά σύνδεση.");
    }

    // Check permissions without changing any password.
    await checkAdmin(session);

    const username = targetUsername.value.trim().toLowerCase();

    if (!/^[a-z0-9_]{3,24}$/.test(username)) {
      throw new Error("Το username πρέπει να έχει 3–24 χαρακτήρες: a-z, 0-9 ή _.");
    }

    if (username === "test1") {
      throw new Error("Δεν επιτρέπεται reset του admin λογαριασμού από αυτή τη σελίδα.");
    }

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/admin-reset-password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ username })
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || `Αποτυχία reset (${response.status}).`);
    }

    if (!data.success || !data.temporaryPassword) {
      throw new Error("Δεν επιστράφηκε προσωρινός κωδικός.");
    }

    resultUsername.textContent = data.username;
    temporaryPassword.textContent = data.temporaryPassword;
    result.style.display = "block";
    showStatus("Ο κωδικός άλλαξε επιτυχώς.", true);
  } catch (error) {
    showStatus(error.message || "Αποτυχία reset.");
  } finally {
    resetButton.disabled = false;
  }
});

copyButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(temporaryPassword.textContent);
    showStatus("Ο προσωρινός κωδικός αντιγράφηκε.", true);
  } catch {
    showStatus("Επίλεξε τον κωδικό και κάνε αντιγραφή χειροκίνητα.");
  }
});

logoutButton.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  showLogin();
  showStatus("Έγινες logout.", true);
});

(async function init() {
  try {
    const session = await getSession();

    if (session) {
      await checkAdmin(session);
      showAdmin();
      showStatus("Είσαι συνδεδεμένος ως admin.", true);
      return;
    }
  } catch {
    await supabaseClient.auth.signOut().catch(() => {});
  }

  showLogin();
})();
