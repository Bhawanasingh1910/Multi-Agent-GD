// ==========================================
// Multi-Agent GD
// Dashboard Page
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

    if (!Store.requireLogin()) return;

    // ==========================================
    // DOM ELEMENTS
    // ==========================================

    const $ = id => document.getElementById(id);

    const user = Store.getUser();

    // ==========================================
    // NAVIGATION
    // ==========================================

    function navigate(page) {

        window.location.href = page;

    }

    // Cards, buttons and navbar links
    const clicks = {
        "start-discussion-btn": "create-room.html",
        "start-card": "create-room.html",
        "history-card": "history.html",
        "feedback-card": "feedback.html",
        "profile-card": "profile.html",
        "view-report-btn": "feedback.html"
    };

    Object.keys(clicks).forEach(id => {

        $(id).addEventListener("click", () => navigate(clicks[id]));

    });

    ["dashboard", "history", "feedback", "profile"].forEach(name => {

        $(name + "-link").addEventListener("click", (event) => {

            event.preventDefault();

            navigate(name + ".html");

        });

    });

    $("dashboard-link").classList.add("active");

    // Profile chip in the navbar opens the profile page
    const chip = document.querySelector(".navbar .profile");

    if (chip) {

        chip.style.cursor = "pointer";

        chip.addEventListener("click", () => navigate("profile.html"));

    }

    // ==========================================
    // USER
    // ==========================================

    $("username").textContent = user.name;

    // ==========================================
    // STATS (from saved discussions)
    // ==========================================

    const stats = Store.stats();

    const pct = (value) => stats.hasScores ? value + "%" : "--";

    $("discussion-count").textContent = stats.count;

    $("average-score").textContent = pct(stats.average);

    $("practice-streak").textContent =
        stats.streak + (stats.streak === 1 ? " Day" : " Days");

    $("practice-time").textContent = Store.formatHours(stats.hours);

    $("confidence-score").textContent = pct(stats.skills.confidence);

    $("grammar-score").textContent = pct(stats.skills.grammar);

    $("vocabulary-score").textContent = pct(stats.skills.vocabulary);

    $("fluency-score").textContent = pct(stats.skills.fluency);

    // ==========================================
    // RECENT DISCUSSIONS
    // ==========================================

    const sessions = Store.getSessions()
        .slice()
        .sort((a, b) =>
            new Date(b.endedAt || b.startedAt) - new Date(a.endedAt || a.startedAt));

    const recentBody = $("recent-body");

    recentBody.innerHTML = sessions.length === 0

        ? `<tr><td colspan="5" style="text-align:center;">
               No discussions yet. Start your first one!
           </td></tr>`

        : sessions.slice(0, 3).map(s => `
            <tr>
                <td>${Store.esc(s.topic)}</td>
                <td>${Store.formatDate(s.endedAt || s.startedAt)}</td>
                <td>${Store.mmss(s.elapsedSeconds)}</td>
                <td>${s.feedback && s.feedback.scores ? s.feedback.scores.overall + "%" : "Pending"}</td>
                <td>
                    <button class="open-report-btn" data-id="${Store.esc(s.id)}">
                        Open
                    </button>
                </td>
            </tr>`).join("");

    recentBody.addEventListener("click", (event) => {

        const button = event.target.closest(".open-report-btn");

        if (!button) return;

        navigate("feedback.html?id=" + encodeURIComponent(button.dataset.id));

    });

    // ==========================================
    // LATEST FEEDBACK
    // ==========================================

    const scored = sessions.filter(s => s.feedback && s.feedback.scores);

    if (scored.length === 0) {

        $("latest-feedback-title").textContent = "No feedback yet";

        $("latest-feedback-text").textContent =
            "Complete a discussion to see your feedback here.";

        $("view-report-btn").textContent = "Start a Discussion";

        // Nothing to view yet: send them to start one instead
        clicks["view-report-btn"] = "create-room.html";

    }

    else {

        const latest = scored[0];

        const score = latest.feedback.scores.overall;

        $("latest-feedback-title").textContent =
            score >= 85 ? "Great Progress! 🎉"
            : score >= 70 ? "Good Work 👍"
            : "Keep Practising 💪";

        let text = "You scored " + score + "% on \"" + latest.topic + "\". " +
                   "Next focus: " + latest.feedback.nextFocus + ".";

        if (scored.length > 1) {

            const change =
                latest.feedback.scores.confidence - scored[1].feedback.scores.confidence;

            text += " Your confidence " +
                (change >= 0 ? "improved by " : "dropped by ") +
                Math.abs(change) + "% compared to your last discussion.";
        }

        $("latest-feedback-text").textContent = text;

        // "View Full Report" opens this session's report
        clicks["view-report-btn"] = "feedback.html?id=" + encodeURIComponent(latest.id);
    }

});
