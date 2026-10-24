
const statusElement = document.getElementById("leaderboard-status");
const listElement = document.getElementById("leaderboard-list");
const refreshButton = document.getElementById("refresh-leaderboard");
const backButton = document.getElementById("back-to-game");

async function loadLeaderboard() {
  refreshButton.disabled = true;
  statusElement.textContent = "Φόρτωση κατάταξης...";
  listElement.replaceChildren();

  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/player-data?action=leaderboard`,
      { headers: { apikey: SUPABASE_KEY } }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Δεν φορτώθηκε η κατάταξη.");
    }

    const players = result.leaderboard || [];

    if (players.length === 0) {
      statusElement.textContent = "Δεν υπάρχουν παίκτες ακόμη.";
      return;
    }

    statusElement.textContent = `ΠΑΙΚΤΕΣ: ${players.length}`;

    players.forEach((player, index) => {
      const row = document.createElement("article");
      row.className = "leaderboard-row";

      const rank = document.createElement("span");
      rank.className = "leaderboard-rank";
      rank.textContent = index === 0 ? "👑" : `#${index + 1}`;

      const username = document.createElement("span");
      username.className = "leaderboard-username";
      username.textContent = player.username;

      const points = document.createElement("strong");
      points.className = "leaderboard-points";
      points.textContent = `${player.total_points} PTS`;

      row.append(rank, username, points);
      listElement.appendChild(row);
    });
  } catch (error) {
    console.error("Leaderboard error:", error);
    statusElement.textContent =
      error.message || "Σφάλμα φόρτωσης. Δοκίμασε ξανά.";
  } finally {
    refreshButton.disabled = false;
  }
}

async function returnToGame() {
  backButton.disabled = true;
  backButton.textContent = "ΦΟΡΤΩΣΗ ΠΑΙΧΝΙΔΙΟΥ...";

  try {
    // Read the existing Supabase session directly from localStorage.
    // This avoids creating another Supabase client.
    let token = null;

    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);

      if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) {
        try {
          const saved = JSON.parse(localStorage.getItem(key));

          token =
            saved?.access_token ||
            saved?.currentSession?.access_token ||
            saved?.session?.access_token ||
            null;

          if (token) break;
        } catch {
          // Ignore unrelated or invalid stored values.
        }
      }
    }

    if (!token) {
      throw new Error(
        "Δεν βρέθηκε ενεργή σύνδεση. Κάνε ξανά login και δοκίμασε."
      );
    }

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/player-data?action=progress`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${token}`
        }
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Δεν φορτώθηκε η πρόοδος.");
    }

    const completedIds = new Set(
      (result.progress || [])
        .filter(item => item.solved_at)
        .map(item => Number(item.clue_id))
    );

    let nextClueId = 1;

    while (nextClueId <= 15 && completedIds.has(nextClueId)) {
      nextClueId++;
    }

    if (nextClueId > 15) nextClueId = 15;

    window.location.href = `clue.html?id=${nextClueId}`;
  } catch (error) {
    console.error("Return to game error:", error);
    statusElement.textContent =
      error.message || "Σφάλμα φόρτωσης προόδου.";

    backButton.disabled = false;
    backButton.textContent = "ΕΠΙΣΤΡΟΦΗ ΣΤΟ ΠΑΙΧΝΙΔΙ";
  }
}

refreshButton.addEventListener("click", loadLeaderboard);
backButton.addEventListener("click", returnToGame);

loadLeaderboard();
