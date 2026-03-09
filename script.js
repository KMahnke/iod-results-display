async function loadResults() {
  try {
    const response = await fetch("data/results.json?" + Date.now());
    const data = await response.json();

    document.getElementById("eventTitle").textContent = data.event;
    document.getElementById("sessionTitle").textContent = data.session;
    document.getElementById("updatedTime").textContent = data.last_update;

    const tbody = document.querySelector("#resultsTable tbody");
    tbody.innerHTML = "";

    data.results.forEach((r) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${r.place}</td>
        <td>${r.entry}</td>
        <td>${r.title}</td>
        <td>${r.studio}</td>
      `;
      tbody.appendChild(row);
    });

    const awardsList = document.getElementById("awardsList");
    awardsList.innerHTML = "";

    data.awards.forEach((a) => {
      const li = document.createElement("li");
      li.textContent = `${a.award} — #${a.entry} "${a.title}"`;
      awardsList.appendChild(li);
    });
  } catch (err) {
    console.error("Failed to load results:", err);
  }
}

loadResults();
setInterval(loadResults, 5000);
