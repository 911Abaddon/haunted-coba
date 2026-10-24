
const form = document.getElementById("auth-form");
const loginTab = document.getElementById("show-login");
const registerTab = document.getElementById("show-register");
const nameField = document.getElementById("name-field");
const fullNameInput = document.getElementById("full-name");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const submitButton = document.getElementById("auth-submit");
const message = document.getElementById("auth-message");

let mode = "login";

function showMessage(text, success = false) {
  message.textContent = text;
  message.style.color = success ? "#70e6a1" : "#ff8c96";
}

function setMode(newMode) {
  mode = newMode;
  const registering = mode === "register";

  loginTab.classList.toggle("active", !registering);
  registerTab.classList.toggle("active", registering);

  nameField.hidden = !registering;
  fullNameInput.required = registering;

  submitButton.textContent = registering ? "ΔΗΜΙΟΥΡΓΙΑ ΛΟΓΑΡΙΑΣΜΟΥ" : "ΣΥΝΔΕΣΗ";
  passwordInput.autocomplete = registering ? "new-password" : "current-password";

  showMessage("");
}

loginTab.addEventListener("click", () => setMode("login"));
registerTab.addEventListener("click", () => setMode("register"));

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  showMessage("");

  const username = usernameInput.value.trim().toLowerCase();
  const password = passwordInput.value;
  const fullName = fullNameInput.value.trim();

  if (!/^[a-z0-9_]{3,24}$/.test(username)) {
    showMessage("Το username πρέπει να έχει 3–24 χαρακτήρες: a-z, 0-9 ή _.");
    usernameInput.focus();
    return;
  }

  if (password.length < 10 || password.length > 128) {
    showMessage("Ο κωδικός πρέπει να έχει 10–128 χαρακτήρες.");
    passwordInput.focus();
    return;
  }

  if (mode === "register" && !fullName) {
    showMessage("Συμπλήρωσε το ονοματεπώνυμό σου.");
    fullNameInput.focus();
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = mode === "register" ? "ΔΗΜΙΟΥΡΓΙΑ..." : "ΣΥΝΔΕΣΗ...";

  try {
    const action = mode === "register" ? "register" : "login";

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/player-auth`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_KEY
        },
        body: JSON.stringify({
          action,
          username,
          password,
          fullName: fullName
        })
      }
    );

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.error || "Κάτι πήγε στραβά. Δοκίμασε ξανά.");
    }

    if (action === "register") {
      showMessage("Ο λογαριασμός δημιουργήθηκε! Τώρα μπορείς να συνδεθείς.", true);
      passwordInput.value = "";
      setMode("login");
      usernameInput.value = username;
      passwordInput.focus();
      return;
    }

    if (!result.access_token) {
      throw new Error("Η σύνδεση δεν επέστρεψε έγκυρο token.");
    }

    // Αποθήκευση της συνεδρίας για τις επόμενες σελίδες.
    const { error: sessionError } = await supabaseClient.auth.setSession({
      access_token: result.access_token,
      refresh_token: result.refresh_token
    });

    if (sessionError) {
      throw sessionError;
    }

    const params = new URLSearchParams(window.location.search);
const redirect = params.get("redirect");

if (
  redirect &&
  redirect.startsWith("clue.html?token=") &&
  !redirect.includes("://") &&
  !redirect.includes("\\")
) {
  window.location.href = redirect;
} else {
  window.location.href = "clue.html";
}
  } catch (error) {
    console.error("Authentication error:", error);
    showMessage(error.message || "Αποτυχία σύνδεσης. Δοκίμασε ξανά.");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent =
      mode === "register" ? "ΔΗΜΙΟΥΡΓΙΑ ΛΟΓΑΡΙΑΣΜΟΥ" : "ΣΥΝΔΕΣΗ";
  }
});

setMode("login");
