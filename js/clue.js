
const API_URL = `${SUPABASE_URL}/functions/v1/player-data`;

// Main page elements
const greeting = document.getElementById("player-greeting");
const clueContent = document.getElementById("clue-content");
const loginRequired = document.getElementById("login-required");
const errorSection = document.getElementById("clue-error");
const errorMessage = document.getElementById("clue-error-message");
const retryButton = document.getElementById("retry-button");
const goLoginButton = document.getElementById("go-login");
const logoutButton = document.getElementById("logout-button");
const scoreDisplay = document.getElementById("player-score");

// Clue elements
const clueNumber = document.getElementById("clue-number");
const clueTitle = document.getElementById("clue-title");
const clueStory = document.getElementById("clue-story");
const hintBox = document.getElementById("clue-hint-box");
const hintText = document.getElementById("clue-hint");
const answerForm = document.getElementById("answer-form");
const answerInput = document.getElementById("answer-input");
const answerButton = document.getElementById("answer-submit");
const answerMessage = document.getElementById("answer-message");
const showHintButton = document.getElementById("show-hint-button");

// Progress elements
const progressPanel = document.getElementById("progress-panel");
const progressToggle = document.getElementById("toggle-progress");
const progressCount = document.getElementById("progress-count");
const progressBar = document.getElementById("progress-bar");
const progressSummary = document.getElementById("progress-summary");
const progressGrid = document.getElementById("progress-grid");

// Clues completed automatically without an answer
const NO_ANSWER_CLUE_IDS = [4, 7, 13, 15];

let currentClue = null;
let currentToken = null;

function showError(message) {
  clueContent.hidden = true;
  loginRequired.hidden = true;
  errorSection.hidden = false;
  errorMessage.textContent = message;
}

function showLoginRequired() {
  clueContent.hidden = true;
  errorSection.hidden = true;
  loginRequired.hidden = false;
  greeting.textContent = "Η αναζήτηση σε περιμένει.";
}

function showAnswerMessage(message, success = false) {
  answerMessage.textContent = message;
  answerMessage.style.color = success ? "#70e6a1" : "#ff8c96";
}

async function apiRequest(action, options = {}) {
  const {
    method = "GET",
    body,
    params = {}
  } = options;

  const url = new URL(API_URL);
  url.searchParams.set("action", action);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }

  const headers = {
    apikey: SUPABASE_KEY
  };

  if (currentToken) {
    headers.Authorization = `Bearer ${currentToken}`;
  }

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  const data = await response.json().catch(() => ({}));

  // Only 401 means the session needs to be renewed.
  // A 403 may mean that the requested clue is locked.
  if (response.status === 401) {
    throw new Error("SESSION_EXPIRED");
  }

  if (!response.ok) {
    throw new Error(
      data.error || "Δεν ήταν δυνατή η επικοινωνία με το παιχνίδι."
    );
  }

  return data;
}

async function loadPlayerProgress() {
  const result = await apiRequest("progress");
  const progress = Array.isArray(result.progress)
    ? result.progress
    : [];

  // Only count clues that have actually been solved.
  const solvedProgress = progress.filter(item => Boolean(item.solved_at));
  const solvedIds = new Set(
    solvedProgress.map(item => Number(item.clue_id))
  );

  progressCount.textContent = `${solvedIds.size}/15`;
  progressBar.style.width = `${(solvedIds.size / 15) * 100}%`;
  progressSummary.textContent =
    `Έχεις λύσει ${solvedIds.size} από τους 15 γρίφους.`;

  progressGrid.replaceChildren();

  for (let id = 1; id <= 15; id++) {
    const item = document.createElement("div");
    const solved = solvedIds.has(id);

    item.className = `progress-item${solved ? " solved" : ""}`;
    item.textContent =
      `${solved ? "✓" : "🔒"} CLUE ${String(id).padStart(2, "0")}`;

    if (solved) {
      const record = solvedProgress.find(
        progressItem => Number(progressItem.clue_id) === id
      );

      const pointLabel = document.createElement("span");
      pointLabel.className = "progress-points";
      pointLabel.textContent = `+${record?.points_awarded ?? 0} PTS`;
      item.appendChild(pointLabel);
    }

    progressGrid.appendChild(item);
  }

  progressToggle.hidden = false;
}

async function loadClue() {
  errorSection.hidden = true;
  loginRequired.hidden = true;
  clueContent.hidden = true;
  progressPanel.hidden = true;
  progressToggle.hidden = true;

  greeting.textContent = "Φόρτωση του γρίφου...";

  const { data: sessionData, error: sessionError } =
    await supabaseClient.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  const session = sessionData.session;

  if (!session) {
    currentToken = null;
    showLoginRequired();
    return;
  }

  currentToken = session.access_token;

  const meResult = await apiRequest("me");

  greeting.textContent = `Καλώς ήρθες, ${meResult.player.username}.`;
  scoreDisplay.textContent =
    `POINTS: ${meResult.player.total_points}`;

  await loadPlayerProgress();

  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");
  const id = params.get("id");

  let clueResult;

  // Both slug and ID requests now use the authenticated API.
  if (slug) {
    clueResult = await apiRequest("clue", {
      params: { slug }
    });
  } else if (id && /^[1-9]\d?$/.test(id)) {
    clueResult = await apiRequest("clue", {
      params: { id }
    });
  } else {
    showError("Λείπει ο κωδικός του γρίφου. Σκάναρε ξανά το QR.");
    return;
  }

  const clue = clueResult.clue;

  if (!clue) {
    showError("Αυτός ο γρίφος δεν είναι διαθέσιμος αυτή τη στιγμή.");
    return;
  }

  currentClue = clue;

  const requiresNoAnswer = NO_ANSWER_CLUE_IDS.includes(
    Number(clue.id)
  );

  answerForm.hidden = requiresNoAnswer;

  // Reset hint and answer UI for each newly loaded clue.
  hintText.textContent = clue.hint_text || "";
  hintBox.hidden = true;
  showHintButton.hidden = !clue.hint_text;
  showHintButton.textContent = "👻 NEED A HINT?";

  answerInput.value = "";
  showAnswerMessage("");

  clueNumber.textContent =
    `CLUE ${String(clue.id).padStart(2, "0")} · ${clue.points} POINTS`;

  clueTitle.textContent = clue.title;
  clueStory.textContent =
    clue.story_text ||
    "Η ιστορία αυτού του γρίφου θα αποκαλυφθεί σύντομα.";

  clueContent.hidden = false;

  // Automatically complete designated clues.
  // The backend must enforce idempotency and access restrictions.
  if (requiresNoAnswer) {
    try {
      const result = await apiRequest("auto-complete", {
        method: "POST",
        body: { clueId: Number(clue.id) }
      });

      if (typeof result.totalPoints === "number") {
        scoreDisplay.textContent = `POINTS: ${result.totalPoints}`;
      }

      await loadPlayerProgress();

      showAnswerMessage(
        result.alreadyCompleted
          ? "Έχεις ολοκληρώσει ήδη αυτό το σημείο."
          : `Συνέχισες! Κέρδισες ${result.pointsAwarded} πόντους!`,
        true
      );
    } catch (error) {
      if (error.message === "SESSION_EXPIRED") {
        await supabaseClient.auth.signOut();
        showLoginRequired();
        return;
      }

      console.error("Automatic clue completion error:", error);
      showAnswerMessage(
        error.message ||
        "Δεν αποθηκεύτηκε η ολοκλήρωση. Δοκίμασε ξανά."
      );
    }
  }
}

// Reveal the hint without recording hint usage or changing points.
showHintButton.addEventListener("click", () => {
  if (!currentClue?.hint_text) return;

  hintBox.hidden = false;
  showHintButton.hidden = true;
});

answerForm.addEventListener("submit", async event => {
  event.preventDefault();

  if (!currentClue) return;

  if (NO_ANSWER_CLUE_IDS.includes(Number(currentClue.id))) {
    return;
  }

  const answer = answerInput.value.trim();

  if (!answer) {
    showAnswerMessage("Γράψε πρώτα την απάντησή σου.");
    answerInput.focus();
    return;
  }

  answerButton.disabled = true;
  answerButton.textContent = "ΕΛΕΓΧΟΣ...";
  showAnswerMessage("");

  try {
    const result = await apiRequest("submit-answer", {
      method: "POST",
      body: {
        clueId: Number(currentClue.id),
        answer
      }
    });

    if (result.correct) {
      showAnswerMessage(
        result.alreadySolved
          ? "Έχεις λύσει ήδη αυτόν τον γρίφο!"
          : result.message ||
            `Σωστά! Κέρδισες ${result.pointsAwarded} πόντους!`,
        true
      );

      if (typeof result.totalPoints === "number") {
        scoreDisplay.textContent = `POINTS: ${result.totalPoints}`;
      }

      await loadPlayerProgress();
    } else {
      showAnswerMessage(
        result.message || "Λάθος απάντηση. Δοκίμασε ξανά."
      );
    }
  } catch (error) {
    if (error.message === "SESSION_EXPIRED") {
      await supabaseClient.auth.signOut();
      showLoginRequired();
    } else {
      showAnswerMessage(
        error.message || "Παρουσιάστηκε σφάλμα."
      );
    }
  } finally {
    answerButton.disabled = false;
    answerButton.textContent = "ΥΠΟΒΟΛΗ ΑΠΑΝΤΗΣΗΣ";
  }
});

progressToggle.addEventListener("click", () => {
  progressPanel.hidden = !progressPanel.hidden;

  progressToggle.textContent = progressPanel.hidden
    ? "👻 MY PROGRESS"
    : "✕ HIDE PROGRESS";

  if (!progressPanel.hidden) {
    progressPanel.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
});

document.getElementById("open-leaderboard").addEventListener("click", () => {
  window.location.href = "leaderboard.html";
});

goLoginButton.addEventListener("click", () => {
  window.location.href = "index.html";
});

logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;

  try {
    await supabaseClient.auth.signOut();
    window.location.href = "index.html";
  } catch {
    logoutButton.disabled = false;
    showAnswerMessage("Δεν έγινε αποσύνδεση. Δοκίμασε ξανά.");
  }
});

retryButton.addEventListener("click", initialize);

async function initialize() {
  try {
    await loadClue();
  } catch (error) {
    console.error("Clue loading error:", error);

    if (error.message === "SESSION_EXPIRED") {
      showLoginRequired();
    } else {
      showError(
        error.message || "Δεν φορτώθηκε ο γρίφος. Δοκίμασε ξανά."
      );
    }
  }
}

initialize();
