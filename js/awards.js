const DISPLAY_TIME_ZONE = "America/Regina";
const DISPLAY_LOCALE = "en-CA";

const PAGE_MODE = document.body?.dataset?.awardsMode === "published" ? "published" : "session";
const DATA_FILE = PAGE_MODE === "published" ? "data/published_awards.json" : "data/awards.json";

const AWARD_SLOT_CONFIG = [
  { slotId: "excellence", key: "excellence_in_dance", title: "Excellence in Dance" },
  { slotId: "applause", key: "another_round_of_applause", title: "Another Round of Applause" },
  { slotId: "smile", key: "smile_award", title: "Smile Award" },
  { slotId: "full-throttle", key: "full_throttle", title: "Full Throttle" },
  { slotId: "choreography", key: "choreography", title: "Choreography" }
];

const FALLBACK_SPONSOR_LOGOS = {
  excellence_in_dance: "img/oilwomen.png",
  another_round_of_applause: "img/anotherround.jpeg",
  smile_award: "img/liquorspot.PNG",
  full_throttle: "img/barber.png",
  choreography: ""
};

let pageData = null;

document.addEventListener("DOMContentLoaded", () => {
  applyQueryStringToLinks();
  loadAwards();
  setInterval(loadAwards, 10000);
});

function getQueryString() {
  return window.location.search || "";
}

function applyQueryStringToLinks() {
  const qs = getQueryString();
  const leaderboardLink = document.getElementById("leaderboardLink");
  const resultsLink = document.getElementById("resultsLink");
  const tabLinks = document.querySelectorAll('.tab-row a[href$=".html"]');

  if (leaderboardLink) leaderboardLink.href = `leaderboard.html${qs}`;
  if (resultsLink) resultsLink.href = `index.html${qs}`;

  tabLinks.forEach((link) => {
    const href = link.getAttribute("href") || "";
    if (href.endsWith(".html")) {
      link.href = `${href}${qs}`;
    }
  });
}

async function loadAwards() {
  try {
    const response = await fetch(`${DATA_FILE}?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    pageData = await response.json();

    updateHeader();

    if (PAGE_MODE === "published") {
      renderPublishedAwardsCard();
    } else {
      renderSessionAwards();
    }
  } catch (error) {
    console.error("Unable to load awards data:", error);
    renderErrorState();
  }
}

function updateHeader() {
  const eventTitle = document.getElementById("eventTitle");
  const lastUpdate = document.getElementById("lastUpdate");

  if (eventTitle) {
    eventTitle.textContent = PAGE_MODE === "published"
      ? firstNonEmpty(pageData?.event, "Published Awards")
      : firstNonEmpty(pageData?.event, "Session Awards");
  }

  if (lastUpdate) {
    lastUpdate.textContent = buildLastUpdateText(pageData);
  }
}

function renderSessionAwards() {
  const normalizedAwards = getNormalizedSessionAwards();

  AWARD_SLOT_CONFIG.forEach((config) => {
    const award = normalizedAwards.find((item) => item.key === config.key) || {
      key: config.key,
      title: config.title,
      logo: "",
      winners: []
    };

    renderAward(config.slotId, award);
  });
}

function getNormalizedSessionAwards() {
  if (!pageData || typeof pageData !== "object") {
    return [];
  }

  if (Array.isArray(pageData.awards)) {
    return pageData.awards.map((award, index) => normalizeAwardFromArray(award, index));
  }

  return [
    normalizeLegacyAward("excellence_in_dance", pageData.excellence, "Excellence in Dance"),
    normalizeLegacyAward("another_round_of_applause", pageData.applause, "Another Round of Applause"),
    normalizeLegacyAward("smile_award", pageData.smile, "Smile Award"),
    normalizeLegacyAward("full_throttle", pageData.full_throttle, "Full Throttle"),
    normalizeLegacyAward("choreography", pageData.choreography, "Choreography")
  ].filter(Boolean);
}

function normalizeAwardFromArray(award, index) {
  const fallbackConfig = AWARD_SLOT_CONFIG[index] || null;
  const key = firstNonEmpty(award?.award_key, fallbackConfig?.key);
  const title = firstNonEmpty(award?.award_title, fallbackConfig?.title, "Award");
  const logo = resolveSponsorPath(firstNonEmpty(award?.sponsor_logo, FALLBACK_SPONSOR_LOGOS[key]));

  return {
    key,
    title,
    logo,
    winners: normalizeWinners(award)
  };
}

function normalizeLegacyAward(key, award, fallbackTitle) {
  if (!award) {
    return {
      key,
      title: fallbackTitle,
      logo: resolveSponsorPath(firstNonEmpty(FALLBACK_SPONSOR_LOGOS[key])),
      winners: []
    };
  }

  return {
    key,
    title: firstNonEmpty(award?.title, fallbackTitle),
    logo: resolveSponsorPath(firstNonEmpty(award?.logo, award?.sponsor_logo, FALLBACK_SPONSOR_LOGOS[key])),
    winners: normalizeLegacyWinners(award?.winners)
  };
}

function normalizeWinners(award) {
  if (Array.isArray(award?.winners) && award.winners.length > 0) {
    return [...award.winners]
      .map((winner) => ({
        num: firstNonEmpty(winner?.entry, winner?.num),
        title: firstNonEmpty(winner?.title),
        studio: firstNonEmpty(winner?.studio)
      }))
      .sort((a, b) => Number(a?.num || 999999) - Number(b?.num || 999999));
  }

  const winnerText = firstNonEmpty(award?.winner_text);
  if (!winnerText) {
    return [];
  }

  return winnerText
    .split(" • ")
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .reduce((rows, value, index, arr) => {
      if (value.startsWith("#")) {
        const next = arr[index + 1] || "";
        const match = value.match(/^#\s*(\d+)\s*(.*)$/);

        rows.push({
          num: match ? match[1] : "",
          title: match ? match[2].trim() : value.replace(/^#\s*/, "").trim(),
          studio: next && !next.startsWith("#") ? next : ""
        });
      }
      return rows;
    }, []);
}

function normalizeLegacyWinners(winners) {
  if (!Array.isArray(winners)) {
    return [];
  }

  return winners
    .map((winner) => ({
      num: firstNonEmpty(winner?.num, winner?.entry),
      title: firstNonEmpty(winner?.title),
      studio: firstNonEmpty(winner?.studio)
    }))
    .sort((a, b) => Number(a?.num || 999999) - Number(b?.num || 999999));
}

function renderAward(slotId, award) {
  const titleEl = document.getElementById(`title-${slotId}`);
  const logoEl = document.getElementById(`logo-${slotId}`);
  const winnersEl = document.getElementById(`winners-${slotId}`);

  if (titleEl) titleEl.textContent = firstNonEmpty(award?.title, "Award");

  if (logoEl) {
    if (award?.logo) {
      logoEl.src = award.logo;
      logoEl.alt = `${award.title || "Award"} sponsor logo`;
      logoEl.hidden = false;
    } else {
      logoEl.hidden = true;
      logoEl.removeAttribute("src");
    }
  }

  if (!winnersEl) return;

  winnersEl.innerHTML = "";

  if (!Array.isArray(award?.winners) || award.winners.length === 0) {
    winnersEl.innerHTML = '<div class="award-empty">Winner to be announced</div>';
    return;
  }

  award.winners.forEach((winner) => {
    const row = document.createElement("div");
    row.className = "award-row";
    row.innerHTML = `
      <div class="award-num">${escapeHtml(firstNonEmpty(winner?.num))}</div>
      <div class="award-val">${escapeHtml(buildWinnerText(winner))}</div>
    `;
    winnersEl.appendChild(row);
  });
}

function renderPublishedAwardsCard() {
  const cardEl = document.getElementById("publishedAwardsCard");
  const sectionsEl = document.getElementById("publishedAwardsSections");

  if (!cardEl || !sectionsEl) return;

  const fullAwards = Array.isArray(pageData?.full_awards) ? pageData.full_awards : [];

  if (!fullAwards.length) {
    sectionsEl.innerHTML = '<div class="award-empty">No published awards available.</div>';
    cardEl.hidden = false;
    return;
  }

  sectionsEl.innerHTML = `
    <ul class="full-award-list">
      ${fullAwards.map((award) => {
        const winnerText = buildPublishedAwardWinnerText(award?.winner);
        return `
          <li class="full-award-item">
            <div class="full-award-name">${escapeHtml(firstNonEmpty(award?.award, "Award"))}</div>
            <div class="full-award-winner ${winnerText ? "" : "is-empty"}">${escapeHtml(winnerText || "Winner to be announced")}</div>
          </li>
        `;
      }).join("")}
    </ul>
  `;

  cardEl.hidden = false;
}

function buildPublishedAwardWinnerText(winner) {
  if (!winner || typeof winner !== "object") return "";
  return firstNonEmpty(winner?.display_text) || buildFullAwardWinnerText(winner);
}

function buildFullAwardWinnerText(winner) {
  if (!winner || typeof winner !== "object") return "";

  const entry = firstNonEmpty(winner?.entry);
  const title = firstNonEmpty(winner?.title);
  const lastNames = Array.isArray(winner?.dance_last_names)
    ? winner.dance_last_names.map((value) => String(value || "").trim()).filter(Boolean)
    : [];

  let text = "";
  if (entry && title) text = `${entry} - ${title}`;
  else if (entry || title) text = entry || title;
  if (lastNames.length) text += `${text ? " - " : ""}${lastNames.join(", ")}`;
  return text;
}

function buildWinnerText(winner) {
  const title = firstNonEmpty(winner?.title);
  const studio = firstNonEmpty(winner?.studio);
  if (title && studio) return `${title} • ${studio}`;
  return title || studio || "";
}

function renderErrorState() {
  const eventTitle = document.getElementById("eventTitle");
  const lastUpdate = document.getElementById("lastUpdate");

  if (eventTitle) {
    eventTitle.textContent = PAGE_MODE === "published" ? "Awards" : "Session Awards";
  }

  if (lastUpdate) {
    lastUpdate.textContent = PAGE_MODE === "published"
      ? "Last updated: unable to load data/published_awards.json"
      : "Last updated: unable to load data/awards.json";
  }

  if (PAGE_MODE === "published") {
    const cardEl = document.getElementById("publishedAwardsCard");
    const sectionsEl = document.getElementById("publishedAwardsSections");
    if (cardEl && sectionsEl) {
      sectionsEl.innerHTML = '<div class="award-empty">Unable to load published awards.</div>';
      cardEl.hidden = false;
    }
    return;
  }

  AWARD_SLOT_CONFIG.forEach((config) => {
    renderAward(config.slotId, {
      title: config.title,
      logo: resolveSponsorPath(FALLBACK_SPONSOR_LOGOS[config.key]),
      winners: []
    });
  });
}

function buildLastUpdateText(data) {
  const zonedValue = data?.publish_version || data?.updated_at || data?.updated || "";
  const formattedZoned = formatZonedDateToRegina(zonedValue);
  if (formattedZoned) {
    return `Last updated: ${formattedZoned}`;
  }

  const fallback = data?.last_update || data?.updated_at || data?.updated || "";
  return fallback ? `Last updated: ${fallback} CST` : "Last updated:";
}

function formatZonedDateToRegina(value) {
  if (!value) return "";
  const date = new Date(String(value).trim());
  if (Number.isNaN(date.getTime())) return "";

  const formatter = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    timeZone: DISPLAY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short"
  });

  const parts = formatter.formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day} ${map.hour}:${map.minute} ${map.dayPeriod} ${map.timeZoneName}`;
}

function resolveSponsorPath(value) {
  const path = String(value || "").trim();
  if (!path) return "";
  if (/^(https?:)?\/\//i.test(path)) return path;
  return path.replace(/^\.\//, "");
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value === 0) return "0";
    if (typeof value === "string" && value.trim()) return value.trim();
    if (value !== null && value !== undefined && typeof value !== "string") return value;
  }
  return "";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}