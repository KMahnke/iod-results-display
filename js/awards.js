function getQueryString() {
  return window.location.search || "";
}

function applyQueryStringToLinks() {

  const qs = getQueryString();

  const leaderboardLink = document.getElementById("leaderboardLink");
  const resultsLink = document.getElementById("resultsLink");

  if (leaderboardLink) {
    leaderboardLink.href = `leaderboard.html${qs}`;
  }

  if (resultsLink) {
    resultsLink.href = `index.html${qs}`;
  }

}

async function loadAwards() {

  try {

    const response = await fetch("data/awards.json?ts=" + Date.now(), { cache: "no-store" });

    const data = await response.json();

    renderAward("excellence", data.excellence);
    renderAward("applause", data.applause);
    renderAward("smile", data.smile);

  } catch (e) {

    console.error("Unable to load awards", e);

  }

}

function renderAward(id, award) {

  const logo = document.getElementById("logo-" + id);
  const winners = document.getElementById("winners-" + id);

  if (!award) return;

  if (award.logo) {
    logo.src = award.logo;
    logo.hidden = false;
  } else {
    logo.hidden = true;
  }

  winners.innerHTML = "";

  if (!award.winners || award.winners.length === 0) {

    winners.innerHTML = `<div class="award-empty">Winner to be announced</div>`;

    return;
  }

  award.winners.forEach((w) => {

    const row = document.createElement("div");

    row.className = "award-row";

    row.innerHTML = `
      <div class="award-num">${w.num || ""}</div>
      <div class="award-val">${w.title || ""}${w.studio ? " • " + w.studio : ""}</div>
    `;

    winners.appendChild(row);

  });

}

document.addEventListener("DOMContentLoaded", () => {

  applyQueryStringToLinks();

  loadAwards();

  setInterval(loadAwards, 10000);

});