let pageData = null;
let activeTab = null;

const DAY_TABS = [
  { short: "W", long: "Wed" },
  { short: "T", long: "Thu" },
  { short: "F", long: "Fri" },
  { short: "S", long: "Sat" },
  { short: "S", long: "Sun" }
];

async function loadResults() {
  const response = await fetch("data/results.json?" + Date.now(), { cache: "no-store" });
  pageData = await response.json();

  document.getElementById("eventTitle").textContent =
    pageData.event || "Results";

  document.getElementById("lastUpdate").textContent =
    "Last updated: " + (pageData.last_update || "");

  if (!activeTab) activeTab = "Wed";

  renderTabs();
  renderContent();
}

function renderTabs() {
  const tabs = document.getElementById("tabs");
  tabs.innerHTML = "";

  DAY_TABS.forEach(day => {
    const btn = document.createElement("button");

    btn.className = "tab-btn day-btn";
    btn.dataset.long = day.long;
    btn.dataset.short = day.short;

    btn.textContent = day.long;

    btn.onclick = () => {
      activeTab = day.long;
      renderTabs();
      renderContent();
    };

    if (activeTab === day.long) btn.classList.add("active");

    tabs.appendChild(btn);
  });

  const awardsBtn = document.createElement("button");
  awardsBtn.className = "tab-btn icon-btn";
  awardsBtn.innerHTML = "🏆 <span class='icon-label'>Awards</span>";
  awardsBtn.onclick = () => {
    activeTab = "awards";
    renderTabs();
    renderContent();
  };

  tabs.appendChild(awardsBtn);

  const leaderboardBtn = document.createElement("button");
  leaderboardBtn.className = "tab-btn icon-btn";
  leaderboardBtn.innerHTML = "📊 <span class='icon-label'>Leaderboard</span>";
  leaderboardBtn.onclick = () => {
    window.location.href = "leaderboard.html";
  };

  tabs.appendChild(leaderboardBtn);

  autoCollapseTabs();
}

function autoCollapseTabs() {
  const tabs = document.getElementById("tabs");
  const buttons = tabs.children;

  /* reset to full */
  document.querySelectorAll(".day-btn").forEach(btn => {
    btn.textContent = btn.dataset.long;
  });

  document.querySelectorAll(".icon-label").forEach(el => {
    el.style.display = "inline";
  });

  if (tabs.scrollWidth <= tabs.clientWidth) return;

  /* collapse days */
  document.querySelectorAll(".day-btn").forEach(btn => {
    btn.textContent = btn.dataset.short;
  });

  if (tabs.scrollWidth <= tabs.clientWidth) return;

  /* collapse icon labels */
  document.querySelectorAll(".icon-label").forEach(el => {
    el.style.display = "none";
  });
}

function renderContent() {
  const content = document.getElementById("content");
  content.innerHTML = "";

  if (!pageData) return;

  if (activeTab === "awards") {
    const card = document.createElement("div");
    card.className = "group-card";
    card.innerHTML = "<h2>Awards</h2>";

    const awards = pageData.awards || [];

    if (!awards.length) {
      card.innerHTML += "<p>No awards yet</p>";
    } else {
      const ul = document.createElement("ul");

      awards.forEach(a => {
        const li = document.createElement("li");
        li.textContent = `${a.award} — #${a.entry} "${a.title}"`;
        ul.appendChild(li);
      });

      card.appendChild(ul);
    }

    content.appendChild(card);
    return;
  }
}

window.addEventListener("resize", autoCollapseTabs);

document.addEventListener("DOMContentLoaded", loadResults);