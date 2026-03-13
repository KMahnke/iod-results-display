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

function pad2(value) {
  return String(value).padStart(2, "0");
}

function formatNaiveReginaString(value) {
  const match = String(value || "")
    .trim()
    .match(
      /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/
    );

  if (!match) {
    return "";
  }

  const [, year, month, day, hour = "00", minute = "00"] = match;
  let h = Number(hour);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;

  return `${year}-${month}-${day} ${h}:${minute} ${ampm} CST`;
}

function formatAbsoluteReginaDate(value) {
  if (!value) return "";

  const raw = String(value).trim();
  if (!raw) return "";

  const hasExplicitZone =
    /(?:Z|[+-]\d{2}:\d{2})$/i.test(raw) ||
    /\bUTC\b/i.test(raw);

  if (!hasExplicitZone) {
    const naiveFormatted = formatNaiveReginaString(raw);
    if (naiveFormatted) {
      return naiveFormatted;
    }
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return raw;
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
  const rawValue =
    data?.last_update ||
    data?.updated_at ||
    data?.updated ||
    data?.publish_version ||
    "";

  const formatted = formatAbsoluteReginaDate(rawValue);
  return formatted ? `Last updated: ${formatted}` : "Last updated:";
}

async function loadResults() {
  try {
    const response = await fetch("data/results.json?" + Date.now(), { cache: "no-store" });
    pageData = await response.json();

    document.getElementById("eventTitle").textContent = pageData.event || "Results";
    document.getElementById("lastUpdate").textContent = buildLastUpdatedText(pageData);

    if (!activeTab || (activeTab !== "awards" && getCategoriesForTab(activeTab).length === 0)) {
      activeTab = DAY_TABS.find((day) => getCategoriesForTab(day.long).length > 0)?.long || "Wed";
    }

    renderTabs();
    renderContent();
  } catch (err) {
    console.error("Failed to load results:", err);
    const content = document.getElementById("content");
    if (content) {
      content.innerHTML = `
        <div class="group-card">
          <h2>Unable to load results.</h2>
          <div class="group-subtitle">Check data/results.json</div>
        </div>
      `;
    }
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

    if (getCategoriesForTab(day.long).length === 0) {
      btn.classList.add("tab-btn-empty");
    }

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
  if (activeTab === "awards") {
    awardsBtn.classList.add("active");
  }
  awardsBtn.innerHTML = `🏆 <span class="icon-label">Awards</span>`;
  awardsBtn.onclick = () => {
    activeTab = "awards";
    renderTabs();
    renderContent();
  };
  tabs.appendChild(awardsBtn);

  const leaderboardBtn = document.createElement("button");
  leaderboardBtn.className = "tab-btn icon-btn";
  leaderboardBtn.innerHTML = `📊 <span class="icon-label">Leaderboard</span>`;
  leaderboardBtn.onclick = () => {
    window.location.href = "leaderboard.html";
  };
  tabs.appendChild(leaderboardBtn);

  autoCollapseTabs();
}

function autoCollapseTabs() {
  const tabs = document.getElementById("tabs");
  if (!tabs) return;

  document.querySelectorAll(".day-btn").forEach((btn) => {
    btn.textContent = btn.dataset.long;
  });

  document.querySelectorAll(".icon-label").forEach((el) => {
    el.style.display = "inline";
  });

  if (tabs.scrollWidth <= tabs.clientWidth) return;

  document.querySelectorAll(".day-btn").forEach((btn) => {
    btn.textContent = btn.dataset.short;
  });

  if (tabs.scrollWidth <= tabs.clientWidth) return;

  document.querySelectorAll(".icon-label").forEach((el) => {
    el.style.display = "none";
  });
}

function renderContent() {
  const content = document.getElementById("content");
  content.innerHTML = "";

  if (!pageData) {
    content.innerHTML = `<div class="group-card"><h2>No data loaded.</h2></div>`;
    return;
  }

  if (activeTab === "awards") {
    const awardsCard = document.createElement("div");
    awardsCard.className = "awards-card";
    awardsCard.innerHTML = "<h2>Awards</h2>";

    const awards = pageData.awards || [];
    if (!awards.length) {
      const p = document.createElement("p");
      p.textContent = "No awards posted yet.";
      awardsCard.appendChild(p);
    } else {
      const ul = document.createElement("ul");
      awards.forEach((a) => {
        const li = document.createElement("li");
        li.textContent = `${a.award} — #${a.entry} "${a.title}"`;
        ul.appendChild(li);
      });
      awardsCard.appendChild(ul);
    }

    content.appendChild(awardsCard);
    return;
  }

  const categories = getCategoriesForTab(activeTab);

  if (!categories.length) {
    const empty = document.createElement("div");
    empty.className = "group-card";
    empty.innerHTML = `<h2>No published categories for ${activeTab}.</h2>`;
    content.appendChild(empty);
    return;
  }

  categories.forEach((category) => {
    const card = document.createElement("div");
    card.className = "group-card";
    card.id = "cat-" + category.category_id;

    const title = document.createElement("h2");
    title.textContent = category.category_name;
    card.appendChild(title);

    const sub = document.createElement("div");
    sub.className = "group-subtitle";
    sub.textContent = `${category.day_label || ""}${category.session_label ? " • " + category.session_label : ""}`;
    card.appendChild(sub);

    const table = document.createElement("table");
    table.className = "results-table";
    table.innerHTML = `
      <colgroup>
        <col class="col-entry">
        <col class="col-place">
        <col class="col-gem">
        <col class="col-title">
        <col class="col-studio">
      </colgroup>
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
    const rows = Array.isArray(category.results) && category.results.length
      ? category.results
      : (category.entries || []).map((e) => ({
          entry: e.entry,
          display_place: "",
          gem: "",
          title: e.title,
          studio: e.studio
        }));

    rows.forEach((r) => {
      const row = document.createElement("tr");
      row.dataset.entry = String(r.entry || "");

      row.innerHTML = `
        <td class="cell-entry">${escapeHtml(r.entry || "")}</td>
        <td class="cell-place">${escapeHtml(r.display_place || "")}</td>
        <td class="cell-gem">${escapeHtml(r.gem || "")}</td>
        <td class="cell-title">${escapeHtml(r.title || "")}</td>
        <td class="cell-studio">${escapeHtml(r.studio || "")}</td>
      `;

      tbody.appendChild(row);
    });

    card.appendChild(table);
    content.appendChild(card);
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function searchEntry() {
  const searchValue = document.getElementById("entrySearch").value.trim();
  if (!searchValue || !pageData) return;

  document.querySelectorAll(".highlight").forEach((el) => {
    el.classList.remove("highlight");
  });

  for (const category of (pageData.categories || [])) {
    const searchPool = [
      ...(category.results || []),
      ...(category.entries || [])
    ];

    const found = searchPool.find(
      (r) => String(r.entry) === String(searchValue)
    );

    if (found) {
      activeTab = getDayShortLabel(category.day_label);
      renderTabs();
      renderContent();

      setTimeout(() => {
        const groupCard = document.getElementById("cat-" + category.category_id);
        const row = groupCard?.querySelector(`tr[data-entry="${CSS.escape(String(found.entry))}"]`);

        if (groupCard) {
          groupCard.scrollIntoView({ behavior: "smooth", block: "start" });
        }

        if (row) {
          row.classList.add("highlight");
        }
      }, 50);

      return;
    }
  }

  alert(`Entry ${searchValue} was not found.`);
}

window.addEventListener("resize", autoCollapseTabs);

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("searchBtn").addEventListener("click", searchEntry);
  document.getElementById("entrySearch").addEventListener("keypress", (e) => {
    if (e.key === "Enter") searchEntry();
  });

  loadResults();
  setInterval(loadResults, 10000);
});