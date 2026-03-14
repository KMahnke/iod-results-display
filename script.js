let pageData = null;
let activeTab = null;

const DISPLAY_TIME_ZONE = "America/Regina";
const DISPLAY_LOCALE = "en-CA";

const DAY_TABS = [
  { short: "W", long: "Wed" },
  { short: "T", long: "Thu" },
  { short: "F", long: "Fri" },
  { short: "S", long: "Sat" },
  { short: "S", long: "Sun" }
];

function getCurrentQueryString() {
  return window.location.search || "";
}

function buildPageUrl(pageName) {
  return `${pageName}${getCurrentQueryString()}`;
}

function getDayShortLabel(dayLabel) {
  if (!dayLabel) return "";

  const raw = String(dayLabel).trim();
  const firstPart = raw.split(",")[0].trim();
  const firstWord = firstPart.split(/\s+/)[0].toLowerCase();

  const map = {
    wednesday: "Wed",
    thursday: "Thu",
    friday: "Fri",
    saturday: "Sat",
    sunday: "Sun",
    wed: "Wed",
    thu: "Thu",
    thur: "Thu",
    thurs: "Thu",
    fri: "Fri",
    sat: "Sat",
    sun: "Sun"
  };

  return map[firstWord] || firstPart;
}

function getCategoriesForTab(tabLabel) {
  if (!pageData || !Array.isArray(pageData.categories)) return [];
  return pageData.categories.filter((category) => {
    return getDayShortLabel(category.day_label) === tabLabel;
  });
}

function formatZonedDateToRegina(value) {
  if (!value) return "";

  const date = new Date(String(value).trim());
  if (Number.isNaN(date.getTime())) {
    return "";
  }

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

function buildLastUpdatedText(data) {
  const zonedValue =
    data?.publish_version ||
    data?.updated_at ||
    data?.updated ||
    "";

  const formattedZoned = formatZonedDateToRegina(zonedValue);
  if (formattedZoned) {
    return `Last updated: ${formattedZoned}`;
  }

  const fallback =
    data?.last_update ||
    data?.updated_at ||
    data?.updated ||
    "";

  return fallback ? `Last updated: ${fallback} CST` : "Last updated:";
}

async function loadResults() {
  try {
    const response = await fetch("data/results.json?" + Date.now(), { cache: "no-store" });
    pageData = await response.json();

    document.getElementById("eventTitle").textContent = pageData.event || "Results";
    document.getElementById("lastUpdate").textContent = buildLastUpdatedText(pageData);

    if (!activeTab || getCategoriesForTab(activeTab).length === 0) {
      activeTab = DAY_TABS.find((day) => getCategoriesForTab(day.long).length > 0)?.long || "Wed";
    }

    renderTabs();
    renderContent();
  } catch (err) {
    console.error("Failed to load results:", err);
  }
}

function renderTabs() {
  const tabs = document.getElementById("tabs");
  tabs.innerHTML = "";

  DAY_TABS.forEach((day) => {
    const btn = document.createElement("button");
    btn.className = "tab-btn day-btn";
    btn.dataset.long = day.long;
    btn.dataset.short = day.short;
    btn.textContent = day.long;

    if (activeTab === day.long) {
      btn.classList.add("active");
    }

    btn.onclick = () => {
      activeTab = day.long;
      renderTabs();
      renderContent();
    };

    tabs.appendChild(btn);
  });

  const awardsBtn = document.createElement("button");
  awardsBtn.className = "tab-btn icon-btn";
  awardsBtn.innerHTML = `🏆 <span class="icon-label">Awards</span>`;
  awardsBtn.onclick = () => {
    window.location.href = buildPageUrl("awards.html");
  };
  tabs.appendChild(awardsBtn);

  const leaderboardBtn = document.createElement("button");
  leaderboardBtn.className = "tab-btn icon-btn";
  leaderboardBtn.innerHTML = `📊 <span class="icon-label">Leaderboard</span>`;
  leaderboardBtn.onclick = () => {
    window.location.href = buildPageUrl("leaderboard.html");
  };
  tabs.appendChild(leaderboardBtn);
}

function renderContent() {
  const content = document.getElementById("content");
  content.innerHTML = "";

  if (!pageData) return;

  const categories = getCategoriesForTab(activeTab);

  categories.forEach((category) => {

    const card = document.createElement("div");
    card.className = "group-card";

    const title = document.createElement("h2");
    title.textContent = category.category_name;
    card.appendChild(title);

    const table = document.createElement("table");
    table.className = "results-table";

    table.innerHTML = `
      <thead>
        <tr>
          <th>Entry</th>
          <th>Place</th>
          <th>Gem</th>
          <th>Title</th>
          <th>Studio</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector("tbody");

    (category.results || []).forEach((r) => {

      const row = document.createElement("tr");

      row.innerHTML = `
        <td>${r.entry || ""}</td>
        <td>${r.display_place || ""}</td>
        <td>${r.gem || ""}</td>
        <td>${r.title || ""}</td>
        <td>${r.studio || ""}</td>
      `;

      tbody.appendChild(row);
    });

    card.appendChild(table);
    content.appendChild(card);

  });
}

document.addEventListener("DOMContentLoaded", () => {

  loadResults();

  setInterval(loadResults, 10000);

});