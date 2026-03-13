const LEADERS_FILE = "data/leaders.json";

let leadersData = null;
let currentDivision = "solo";

document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  loadLeaders();
});

function initTabs() {
  const tabs = document.querySelectorAll(".tab-btn");

  tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabs.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      currentDivision = btn.dataset.division || "solo";
      renderDivision();
    });
  });
}

async function loadLeaders() {
  try {
    const res = await fetch(`${LEADERS_FILE}?t=${Date.now()}`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const json = await res.json();
    leadersData = json || {};

    updateHeader();
    renderDivision();
  } catch (err) {
    console.error("Failed to load leaders.json:", err);

    const lastUpdate = document.getElementById("lastUpdate");
    const publishVersion = document.getElementById("publishVersion");
    const divisionTitle = document.getElementById("divisionTitle");

    if (lastUpdate) {
      lastUpdate.textContent = "Last updated: unable to load leaderboard data";
    }

    if (publishVersion) {
      publishVersion.textContent = "";
    }

    if (divisionTitle) {
      divisionTitle.textContent = "Leaderboard";
    }

    renderEmptyCards();
  }
}

function updateHeader() {
  const lastUpdate = document.getElementById("lastUpdate");
  const publishVersion = document.getElementById("publishVersion");

  if (lastUpdate) {
    lastUpdate.textContent = leadersData && leadersData.updated
      ? `Last updated: ${leadersData.updated}`
      : "Last updated:";
  }

  if (publishVersion) {
    publishVersion.textContent = leadersData && leadersData.publish_version
      ? `Publish version: ${leadersData.publish_version}`
      : "Publish version:";
  }
}

function renderDivision() {
  const divisionTitle = document.getElementById("divisionTitle");
  if (divisionTitle) {
    divisionTitle.textContent = getDivisionLabel(currentDivision);
  }

  const divisionData = getDivisionData(currentDivision);

  renderLevelCard("beginnerCard", "Beginner", divisionData.beginner || []);
  renderLevelCard("noviceCard", "Novice", divisionData.novice || []);
  renderLevelCard("openCard", "Open", divisionData.open || []);
}

function getDivisionData(division) {
  if (!leadersData || typeof leadersData !== "object") {
    return {};
  }

  return leadersData[division] || {};
}

function renderLevelCard(cardId, levelTitle, placements) {
  const card = document.getElementById(cardId);
  if (!card) {
    return;
  }

  const grouped = groupPlacementsByPlace(placements);

  let html = `<h3>${escapeHtml(levelTitle)}</h3>`;

  for (let place = 1; place <= 5; place += 1) {
    html += renderPlaceRow(place, grouped[place] || []);
  }

  card.innerHTML = html;
}

function groupPlacementsByPlace(placements) {
  const grouped = {
    1: [],
    2: [],
    3: [],
    4: [],
    5: []
  };

  if (!Array.isArray(placements)) {
    return grouped;
  }

  placements.forEach((item) => {
    const place = parseInt(item && item.place, 10);
    if (place >= 1 && place <= 5) {
      grouped[place].push(item);
    }
  });

  return grouped;
}

function renderPlaceRow(placeNumber, items) {
  const value = formatPlacementItems(items);

  return `
    <div class="place-row">
      <div class="place-num">${placeNumber}.</div>
      <div class="place-val ${value ? "" : "empty"}">${escapeHtml(value)}</div>
    </div>
  `;
}

function formatPlacementItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return "";
  }

  return items
    .map((item) => formatSingleItem(item))
    .filter((text) => text !== "")
    .join(", ");
}

function formatSingleItem(item) {
  if (!item || typeof item !== "object") {
    return "";
  }

  const entry = firstNonEmpty(
    item.entry,
    item.entry_number,
    item.entryNumber,
    item.number
  );

  const title = firstNonEmpty(
    item.title,
    item.name,
    item.routine_title,
    item.routineName
  );

  if (entry && title) {
    return `${entry} - ${title}`;
  }

  if (title) {
    return title;
  }

  if (entry) {
    return String(entry);
  }

  return "";
}

function renderEmptyCards() {
  renderLevelCard("beginnerCard", "Beginner", []);
  renderLevelCard("noviceCard", "Novice", []);
  renderLevelCard("openCard", "Open", []);
}

function getDivisionLabel(division) {
  switch (division) {
    case "solo":
      return "Solo";
    case "duo":
      return "Duo/Trio";
    case "group":
      return "Group";
    default:
      return capitalize(division || "Leaderboard");
  }
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
}

function capitalize(str) {
  const value = String(str || "");
  if (!value) {
    return "";
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}