
const statusElement = document.getElementById("leaderboard-status");
const listElement = document.getElementById("leaderboard-list");
const refreshButton = document.getElementById("refresh-leaderboard");
const backButton = document.getElementById("back-to-game");

async function loadLeaderboard() {
  refreshButton.disabled = true;
  statusElement.textContent = "Φόρτωση κατάταξης...";
  listElement.replaceChildren();

  try {
    const url = `${SUPABASE_URL}/functions/v1/player-data?action=leaderboard`;

    const response = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY
      }
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error || "Δεν φορτώθηκε η κατάταξη."
      );
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
    // Get the existing login session without using supabaseClient.
    const client = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_KEY
    );

    const { data: sessionData, error: sessionError } =
      await client.auth.getSession();

    if (sessionError) {
      throw sessionError;
    }

    const token = sessionData?.session?.access_token;

    if (!token) {
      window.location.href = "index.html";
      return;
    }

    // Retrieve this player's saved progress.
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
      throw new Error(
        result.error || "Δεν ήταν δυνατή η φόρτωση της προόδου."
      );
    }

    const completedIds = new Set(
      (result.progress || [])
        .filter(item => item.solved_at)
        .map(item => Number(item.clue_id))
    );

    // Find the first clue that has not been solved.
    let nextClueId = 1;

    while (
      nextClueId <= 15 &&
      completedIds.has(nextClueId)
    ) {
      nextClueId++;
    }

    // If all clues are solved, stay on the final clue.
    if (nextClueId > 15) {
      nextClueId = 15;
    }

    window.location.href = `clue.html?id=${nextClueId}`;
  } catch (error) {
    console.error("Return to game error:", error);

    statusElement.textContent =
      error.message || "Σφάλμα φόρτωσης προόδου. Δοκίμασε ξανά.";

    backButton.disabled = false;
    backButton.textContent = "ΕΠΙΣΤΡΟΦΗ ΣΤΟ ΠΑΙΧΝΙΔΙ";
  }
}

refreshButton.addEventListener("click", loadLeaderboard);
backButton.addEventListener("click", returnToGame);

loadLeaderboard();
