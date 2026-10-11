// ==========================================
// Multi-Agent GD
// History Page
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

    if (!Store.requireLogin()) return;

    // ==========================
    // DOM Elements
    // ==========================

    const searchInput = document.getElementById("search-input");

    const modeFilter = document.getElementById("mode-filter");

    const sortFilter = document.getElementById("sort-filter");

    const historyBody = document.getElementById("history-body");

    const startBtn = document.getElementById("start-btn");

    const dashboardBtn = document.getElementById("dashboard-btn");

    // ==========================
    // Summary cards + achievements (real data)
    // ==========================

    (function fillSummary() {

        const st = Store.stats();

        const sessions = Store.getSessions()
            .filter(s => s.feedback && s.feedback.scores)
            .sort((a, b) => (a.endedAt || a.startedAt) - (b.endedAt || b.startedAt));

        const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };

        set("hist-count", st.count);
        set("hist-average", st.hasScores ? st.average + "%" : "--");
        set("hist-hours", Store.formatHours(st.hours));
        set("hist-streak", st.streak + (st.streak === 1 ? " Day" : " Days"));

        set("ach-streak-title", st.streak > 0 ? st.streak + "-Day Streak" : "Start a Streak");
        set("ach-streak-text", st.streak > 1
            ? "You practiced " + st.streak + " days in a row."
            : "Practice on consecutive days to build a streak.");

        if (sessions.length) {

            set("ach-best-text", "Your highest discussion score is " +
                Math.max(...sessions.map(s => s.feedback.scores.overall)) + "%.");
        }

        if (sessions.length >= 2) {

            const diff = sessions[sessions.length - 1].feedback.scores.overall -
                         sessions[sessions.length - 2].feedback.scores.overall;

            set("ach-improve-text", diff === 0
                ? "Your latest score matches your previous discussion."
                : "Your latest score is " + Math.abs(diff) + " points " +
                  (diff > 0 ? "higher" : "lower") + " than your previous discussion.");
        }

    })();

    // ==========================
    // Saved discussions (newest data comes from finished GDs)
    // ==========================

    const discussions = Store.getSessions().map(s => ({
        id: s.id,
        topic: s.topic,
        mode: s.mode,
        time: new Date(s.endedAt || s.startedAt).getTime(),
        date: Store.formatDate(s.endedAt || s.startedAt),
        duration: Store.mmss(s.elapsedSeconds),
        score: s.feedback && s.feedback.scores ? s.feedback.scores.overall : null
    }));

    // ==========================
    // Render Table
    // ==========================

    function renderTable(data) {

        if (data.length === 0) {

            historyBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center;">
                        ${discussions.length === 0
                            ? "No discussions yet. Start your first one!"
                            : "No discussions found."}
                    </td>
                </tr>
            `;

            return;

        }

        historyBody.innerHTML = data.map(d => `

                <tr>

                    <td>${Store.esc(d.topic)}</td>

                    <td>${d.date}</td>

                    <td>${Store.esc(d.mode)}</td>

                    <td>${d.duration}</td>

                    <td>${d.score === null ? "Pending" : d.score + "%"}</td>

                    <td>

                        <button
                            class="view-btn"
                            data-id="${Store.esc(d.id)}">

                            View

                        </button>

                    </td>

                </tr>

        `).join("");

    }

    // ==========================
    // Search / Filter / Sort
    // ==========================

    function filterHistory() {

        let filtered = [...discussions];

        const search = searchInput.value
            .trim()
            .toLowerCase();

        if (search !== "") {

            filtered = filtered.filter((d) =>
                d.topic.toLowerCase().includes(search)
            );

        }

        if (modeFilter.value !== "All") {

            filtered = filtered.filter((d) =>
                d.mode === modeFilter.value
            );

        }

        switch (sortFilter.value) {

            case "Highest":
                filtered.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
                break;

            case "Lowest":
                filtered.sort((a, b) => (a.score ?? 101) - (b.score ?? 101));
                break;

            case "Oldest":
                filtered.sort((a, b) => a.time - b.time);
                break;

            case "Newest":
            default:
                filtered.sort((a, b) => b.time - a.time);
                break;

        }

        renderTable(filtered);

    }

    searchInput.addEventListener("input", filterHistory);

    modeFilter.addEventListener("change", filterHistory);

    sortFilter.addEventListener("change", filterHistory);

    // Initial Load (newest first)
    filterHistory();

    // ==========================
    // View Report
    // ==========================

    historyBody.addEventListener("click", (event) => {

        const button = event.target.closest(".view-btn");

        if (!button) return;

        window.location.href =
            "feedback.html?id=" + encodeURIComponent(button.dataset.id);

    });

    // ==========================
    // Navigation Buttons
    // ==========================

    startBtn.addEventListener("click", () => {

        window.location.href = "create-room.html";

    });

    dashboardBtn.addEventListener("click", () => {

        window.location.href = "dashboard.html";

    });

});
