
const statusElement = document.getElementById("leaderboard-status");
const listElement = document.getElementById("leaderboard-list");
const refreshButton = document.getElementById("refresh-leaderboard");

async function loadLeaderboard() {
  refreshButton.disabled = true;
  statusElement.textContent = "Φόρτωση κατάταξης...";
  listElement.replaceChildren();

  try {
    const url = `${SUPABASE_URL}/functions/v1/player-data?action=leaderboard`;

    const response = await fetch(url, {
      headers: { apikey: SUPABASE_KEY }
    });

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

refreshButton.addEventListener("click", loadLeaderboard);

document.getElementById("back-to-game").addEventListener("click", () => {
  window.location.href = "clue.html?id=1";
});

loadLeaderboard();
