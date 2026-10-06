// ==========================================
// Multi-Agent GD
// Profile Page
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

    if (!Store.requireLogin()) return;

    const $ = id => document.getElementById(id);

    // ==========================
    // Show profile + stats
    // ==========================

    function render() {

        const user = Store.getUser();

        const stats = Store.stats();

        const pct = v => stats.hasScores ? v + "%" : "--";

        $("profile-name").textContent = user.name;

        $("profile-tagline").textContent =
            user.college ? "Student at " + user.college : "Multi-Agent GD member";

        $("info-name").textContent = user.name;

        $("info-email").textContent = user.email;

        $("info-college").textContent = user.college || "Not set";

        $("info-language").textContent = user.language || "English";

        $("stat-count").textContent = stats.count;

        $("stat-average").textContent = pct(stats.average);

        $("stat-time").textContent = Store.formatHours(stats.hours);

        $("stat-streak").textContent =
            stats.streak + (stats.streak === 1 ? " Day" : " Days");

        $("skill-fluency").textContent = pct(stats.skills.fluency);

        $("skill-grammar").textContent = pct(stats.skills.grammar);

        $("skill-confidence").textContent = pct(stats.skills.confidence);

        $("skill-vocabulary").textContent = pct(stats.skills.vocabulary);

        // Recent activity from real sessions
        const recent = Store.getSessions()
            .slice()
            .sort((a, b) =>
                new Date(b.endedAt || b.startedAt) - new Date(a.endedAt || a.startedAt))
            .slice(0, 4);

        $("activity-list").innerHTML = recent.length === 0

            ? "<li>No activity yet. Start your first discussion!</li>"

            : recent.map(s => {

                const score = s.feedback && s.feedback.scores
                    ? " - scored " + s.feedback.scores.overall + "%"
                    : "";

                return "<li>✔ Discussed \"" + Store.esc(s.topic) + "\"" + score +
                       " (" + Store.formatDate(s.endedAt || s.startedAt) + ")</li>";

            }).join("");
    }

    render();

    // ==========================
    // Small popup form (masks passwords, no prompt())
    // ==========================

    // fields: [{ id, label, type, value, options }]
    // onSubmit(values) returns an error string to keep the popup open
    function openDialog(title, fields, onSubmit) {

        const overlay = document.createElement("div");

        overlay.style.cssText =
            "position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;" +
            "align-items:center;justify-content:center;z-index:1000;";

        const box = document.createElement("form");

        box.style.cssText =
            "background:#fff;color:#222;border-radius:14px;padding:24px;" +
            "width:min(92vw,380px);font-family:inherit;box-shadow:0 10px 40px rgba(0,0,0,.35);";

        box.innerHTML =
            "<h3 style='margin:0 0 14px'>" + Store.esc(title) + "</h3>" +

            fields.map(f => {

                const control = f.type === "select"

                    ? "<select id='dlg-" + f.id + "' style='width:100%;padding:10px;margin:4px 0 12px;border:1px solid #ccc;border-radius:8px'>" +
                      f.options.map(o =>
                          "<option" + (o === f.value ? " selected" : "") + ">" + Store.esc(o) + "</option>").join("") +
                      "</select>"

                    : "<input id='dlg-" + f.id + "' type='" + (f.type || "text") + "' value='" +
                      Store.esc(f.value || "") + "' style='width:100%;padding:10px;margin:4px 0 12px;" +
                      "border:1px solid #ccc;border-radius:8px;box-sizing:border-box'>";

                return "<label style='font-size:14px'>" + Store.esc(f.label) + "</label>" + control;

            }).join("") +

            "<div id='dlg-error' style='color:#d32f2f;font-size:13px;min-height:18px;margin-bottom:8px'></div>" +

            "<div style='display:flex;gap:10px;justify-content:flex-end'>" +
            "<button type='button' id='dlg-cancel' style='padding:10px 16px;border:1px solid #ccc;background:#fff;border-radius:8px;cursor:pointer'>Cancel</button>" +
            "<button type='submit' style='padding:10px 16px;border:none;background:#6C63FF;color:#fff;border-radius:8px;cursor:pointer'>Save</button>" +
            "</div>";

        overlay.appendChild(box);

        document.body.appendChild(overlay);

        const close = () => overlay.remove();

        box.querySelector("#dlg-cancel").addEventListener("click", close);

        overlay.addEventListener("mousedown", (e) => {

            if (e.target === overlay) close();
        });

        box.addEventListener("submit", async (event) => {

            event.preventDefault();

            const values = {};

            fields.forEach(f => {

                values[f.id] = box.querySelector("#dlg-" + f.id).value;
            });

            const error = await onSubmit(values);

            if (error) {

                box.querySelector("#dlg-error").textContent = error;

                return;
            }

            close();

            render();
        });

        const firstInput = box.querySelector("input,select");

        if (firstInput) firstInput.focus();
    }

    // Save changes to the logged-in user (and their stored account)
    function updateUser(changes) {

        const user = { ...Store.getUser(), ...changes };

        Store.setUser(user);

        const accounts = Store.getAccounts();

        const key = user.email.toLowerCase();

        if (accounts[key]) {

            accounts[key] = { ...accounts[key], ...changes };

            Store.saveAccounts(accounts);
        }
    }

    // ==========================
    // Edit profile
    // ==========================

    function editProfile() {

        const user = Store.getUser();

        openDialog("Edit Profile", [
            { id: "name", label: "Full name", value: user.name },
            { id: "college", label: "College", value: user.college || "" }
        ], (v) => {

            if (!v.name.trim()) return "Please enter your name.";

            updateUser({ name: v.name.trim(), college: v.college.trim() });
        });
    }

    $("edit-profile-top").addEventListener("click", editProfile);

    $("edit-profile-btn").addEventListener("click", editProfile);

    // ==========================
    // Change password
    // ==========================

    $("change-password-btn").addEventListener("click", () => {

        openDialog("Change Password", [
            { id: "current", label: "Current password", type: "password" },
            { id: "next", label: "New password (min 6 characters)", type: "password" },
            { id: "confirm", label: "Confirm new password", type: "password" }
        ], async (v) => {

            const user = Store.getUser();

            const key = user.email.toLowerCase();

            const accounts = Store.getAccounts();

            if (!accounts[key]) return "No account record found. Please sign up again.";

            const currentHash = await Store.hashPassword(key, v.current);

            if (currentHash !== accounts[key].hash) return "Current password is incorrect.";

            if (v.next.length < 6) return "New password must be at least 6 characters.";

            if (v.next !== v.confirm) return "New passwords do not match.";

            accounts[key].hash = await Store.hashPassword(key, v.next);

            Store.saveAccounts(accounts);

            alert("Password changed.");
        });
    });

    // ==========================
    // Change language
    // ==========================

    $("change-language-btn").addEventListener("click", () => {

        openDialog("Preferred Language", [
            {
                id: "language",
                label: "Language",
                type: "select",
                value: Store.getUser().language || "English",
                options: ["English", "Hindi", "Hinglish"]
            }
        ], (v) => {

            updateUser({ language: v.language });
        });
    });

    // ==========================
    // Download reports
    // ==========================

    $("download-reports-btn").addEventListener("click", () => {

        const sessions = Store.getSessions();

        if (sessions.length === 0) {

            alert("You have no discussions yet, so there are no reports to download.");

            return;
        }

        const blob = new Blob(
            [JSON.stringify(sessions, null, 2)],
            { type: "application/json" }
        );

        const link = document.createElement("a");

        link.href = URL.createObjectURL(blob);

        link.download = "multi-agent-gd-reports.json";

        document.body.appendChild(link);

        link.click();

        link.remove();

        URL.revokeObjectURL(link.href);
    });

    // ==========================
    // Logout
    // ==========================

    document.querySelector(".logout-btn").addEventListener("click", () => {

        Store.logout();

        window.location.href = "index.html";
    });

});
