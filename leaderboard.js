const LEADERS_FILE = "data/leaders.json";

let leadersData = null;
let currentDivision = "solo";

document.addEventListener("DOMContentLoaded", () => {
    initTabs();
    loadLeaders();
});


/* ----------------------------- */
/* Tabs */
/* ----------------------------- */

function initTabs() {
    const tabs = document.querySelectorAll(".tab-btn");

    tabs.forEach(btn => {
        btn.addEventListener("click", () => {

            tabs.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            currentDivision = btn.dataset.division;

            renderDivision();
        });
    });
}


/* ----------------------------- */
/* Load JSON */
/* ----------------------------- */

async function loadLeaders() {

    try {

        const res = await fetch(LEADERS_FILE + "?t=" + Date.now());
        const json = await res.json();

        leadersData = json;

        updateHeader();
        renderDivision();

    } catch (err) {

        console.error("Failed to load leaders:", err);

    }
}


/* ----------------------------- */
/* Header */
/* ----------------------------- */

function updateHeader() {

    if (!leadersData) return;

    const lastUpdate = document.getElementById("lastUpdate");
    const publish = document.getElementById("publishVersion");

    if (leadersData.updated && lastUpdate) {
        lastUpdate.textContent = "Last updated: " + leadersData.updated;
    }

    if (leadersData.publish_version && publish) {
        publish.textContent = "Publish version: " + leadersData.publish_version;
    }

}


/* ----------------------------- */
/* Render Division */
/* ----------------------------- */

function renderDivision() {

    if (!leadersData) return;

    const divisionTitle = document.getElementById("divisionTitle");

    if (divisionTitle) {
        divisionTitle.textContent = capitalize(currentDivision);
    }

    const data = leadersData[currentDivision] || {};

    renderLevel("beginner", data.beginner || []);
    renderLevel("novice", data.novice || []);
    renderLevel("open", data.open || []);

}


/* ----------------------------- */
/* Render Level Card */
/* ----------------------------- */

function renderLevel(levelName, placements) {

    const card = document.getElementById(levelName + "Card");

    if (!card) return;

    let html = `<h3>${capitalize(levelName)}</h3>`;

    for (let place = 1; place <= 5; place++) {

        const placeItems = placements.filter(p => parseInt(p.place) === place);

        html += renderPlaceRow(place, placeItems);

    }

    card.innerHTML = html;

}


/* ----------------------------- */
/* Render Place Row */
/* ----------------------------- */

function renderPlaceRow(placeNumber, items) {

    let value = "";

    if (items.length > 0) {

        value = items
            .map(item => {

                const entry = item.entry || item.entry_number || "";
                const title = item.title || "";

                if (entry && title) {
                    return `${entry} - ${title}`;
                }

                if (entry) return entry;

                return title;

            })
            .join(", ");

    }

    return `
        <div class="place-row">
            <div class="place-num">${placeNumber}.</div>
            <div class="place-val ${value ? "" : "empty"}">${value}</div>
        </div>
    `;

}


/* ----------------------------- */
/* Helpers */
/* ----------------------------- */

function capitalize(str) {

    if (!str) return "";

    return str.charAt(0).toUpperCase() + str.slice(1);

}