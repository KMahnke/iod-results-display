let pageData = null;
let activeTab = null;

async function loadResults() {
  try {
    const response = await fetch("data/results.json?" + Date.now());
    pageData = await response.json();

    document.getElementById("eventTitle").textContent = pageData.event;
    document.getElementById("lastUpdate").textContent =
      `Last updated: ${pageData.last_update}`;

    if (!activeTab) {
      activeTab = pageData.days[0]?.id || "awards";
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

  pageData.days.forEach((day) => {
    const btn = document.createElement("button");
    btn.className = "tab-btn" + (activeTab === day.id ? " active" : "");
    btn.textContent = day.label;
    btn.onclick = () => {
      activeTab = day.id;
      renderTabs();
      renderContent();
    };
    tabs.appendChild(btn);
  });

  const awardsBtn = document.createElement("button");
  awardsBtn.className = "tab-btn" + (activeTab === "awards" ? " active" : "");
  awardsBtn.textContent = "Awards";
  awardsBtn.onclick = () => {
    activeTab = "awards";
    renderTabs();
    renderContent();
  };
  tabs.appendChild(awardsBtn);
}

function renderContent() {
  const content = document.getElementById("content");
  content.innerHTML = "";

  if (activeTab === "awards") {
    const awardsCard = document.createElement("div");
    awardsCard.className = "awards-card";
    awardsCard.innerHTML = "<h2>Awards</h2>";

    const ul = document.createElement("ul");
    (pageData.awards || []).forEach((a) => {
      const li = document.createElement("li");
      li.textContent = `${a.award} — #${a.entry} "${a.title}"`;
      ul.appendChild(li);
    });

    awardsCard.appendChild(ul);
    content.appendChild(awardsCard);
    return;
  }

  const day = pageData.days.find((d) => d.id === activeTab);
  if (!day) return;

  day.groups.forEach((group) => {
    const card = document.createElement("div");
    card.className = "group-card";
    card.id = group.group_id;

    const title = document.createElement("h2");
    title.textContent = group.group_name;
    card.appendChild(title);

    const table = document.createElement("table");
    table.innerHTML = `
      <thead>
        <tr>
          <th>Place</th>
          <th>Entry</th>
          <th>Title</th>
          <th>Studio</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector("tbody");

    group.results.forEach((r) => {
      const row = document.createElement("tr");
      row.dataset.entry = r.entry;
      row.innerHTML = `
        <td>${r.place}</td>
        <td>${r.entry}</td>
        <td>${r.title}</td>
        <td>${r.studio}</td>
      `;
      tbody.appendChild(row);
    });

    card.appendChild(table);
    content.appendChild(card);
  });
}

function searchEntry() {
  const searchValue = document.getElementById("entrySearch").value.trim();
  if (!searchValue || !pageData) return;

  document.querySelectorAll(".highlight").forEach((el) => {
    el.classList.remove("highlight");
  });

  for (const day of pageData.days) {
    for (const group of day.groups) {
      const found = group.results.find(
        (r) => String(r.entry) === String(searchValue)
      );

      if (found) {
        activeTab = day.id;
        renderTabs();
        renderContent();

        setTimeout(() => {
          const groupCard = document.getElementById(group.group_id);
          const row = groupCard?.querySelector(`tr[data-entry="${found.entry}"]`);

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
  }

  alert(`Entry ${searchValue} was not found.`);
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("searchBtn").addEventListener("click", searchEntry);
  document.getElementById("entrySearch").addEventListener("keypress", (e) => {
    if (e.key === "Enter") searchEntry();
  });

  loadResults();
  setInterval(loadResults, 10000);
});
