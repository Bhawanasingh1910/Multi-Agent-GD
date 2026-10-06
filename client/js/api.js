// ==========================================
// Multi-Agent GD
// Shared config + browser storage helpers
// ==========================================
// Load this BEFORE the page script on every page:
//   <script src="../js/api.js"></script>

// ------------------------------------------
// API ADDRESS - change this one line when you
// link your own API / deployed URL.
// ------------------------------------------
// (A page can also set window.GD_API_BASE before this file loads.)
const API_BASE = window.GD_API_BASE || "http://localhost:5000";

// POST JSON to the API and return the parsed JSON reply
async function apiPost(path, body) {

    const response = await fetch(API_BASE + path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    return response.json();
}

// ------------------------------------------
// Browser storage (placeholder until the
// real backend / database is linked)
// ------------------------------------------
const Store = {

    read(key, fallback) {

        try {

            const raw = localStorage.getItem(key);

            return raw ? JSON.parse(raw) : fallback;

        }

        catch {

            return fallback;
        }
    },

    write(key, value) {

        localStorage.setItem(key, JSON.stringify(value));
    },

    // ---------- login state ----------

    getUser() {

        return Store.read("gdUser", null);
    },

    setUser(user) {

        Store.write("gdUser", user);

        // Dashboard and older code read this key
        localStorage.setItem("username", user.name);
    },

    logout() {

        localStorage.removeItem("gdUser");
        localStorage.removeItem("username");
    },

    // Call at the top of pages that need a login
    requireLogin() {

        if (!Store.getUser()) {

            window.location.href = "auth.html";

            return false;
        }

        return true;
    },

    // ---------- accounts (frontend-only placeholder) ----------

    // SHA-256 (salted with the email). Falls back to a simple hash if the
    // browser blocks crypto.subtle (it only exists on https / localhost).
    async hashPassword(salt, text) {

        const input = salt + "::" + text;

        if (window.crypto && crypto.subtle) {

            const bytes = await crypto.subtle.digest(
                "SHA-256",
                new TextEncoder().encode(input)
            );

            return Array.from(new Uint8Array(bytes))
                .map(b => b.toString(16).padStart(2, "0"))
                .join("");
        }

        let h1 = 0xdeadbeef, h2 = 0x41c6ce57;

        for (let i = 0; i < input.length; i++) {

            const c = input.charCodeAt(i);

            h1 = Math.imul(h1 ^ c, 2654435761);
            h2 = Math.imul(h2 ^ c, 1597334677);
        }

        return "f" + (h1 >>> 0).toString(16) + (h2 >>> 0).toString(16);
    },

    getAccounts() {

        return Store.read("gdAccounts", {});
    },

    saveAccounts(accounts) {

        Store.write("gdAccounts", accounts);
    },

    // ---------- discussion sessions ----------
    // { id, topic, mode, language, duration, participants,
    //   startedAt, endedAt, elapsedSeconds, pausedSeconds,
    //   transcript:[{speaker,text,isUser,speakSeconds}],
    //   feedback: null | {...} }

    getSessions() {

        return Store.read("gdSessions", []);
    },

    saveSessions(list) {

        Store.write("gdSessions", list);
    },

    getSession(id) {

        return Store.getSessions().find(s => s.id === id) || null;
    },

    // Insert or replace a session (matched by id)
    upsertSession(session) {

        const list = Store.getSessions();

        const index = list.findIndex(s => s.id === session.id);

        if (index === -1) list.push(session);
        else list[index] = session;

        Store.saveSessions(list);
    },

    latestSession() {

        const list = Store.getSessions()
            .slice()
            .sort((a, b) => new Date(b.endedAt || b.startedAt) - new Date(a.endedAt || a.startedAt));

        return list[0] || null;
    },

    // ---------- formatting helpers ----------

    mmss(totalSeconds) {

        const s = Math.max(0, Math.round(totalSeconds || 0));

        return String(Math.floor(s / 60)).padStart(2, "0") + ":" +
               String(s % 60).padStart(2, "0");
    },

    formatDate(iso) {

        return new Date(iso).toLocaleDateString("en-IN", {
            day: "numeric", month: "short", year: "numeric"
        });
    },

    // Escape text before putting it into innerHTML
    esc(text) {

        return String(text).replace(/[&<>"']/g, c => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        }[c]));
    },

    // ---------- stats for dashboard + profile ----------

    stats() {

        const sessions = Store.getSessions();

        const scored = sessions.filter(s => s.feedback && s.feedback.scores);

        const avg = key => scored.length
            ? Math.round(scored.reduce((sum, s) => sum + s.feedback.scores[key], 0) / scored.length)
            : 0;

        const seconds = sessions.reduce((sum, s) => sum + (s.elapsedSeconds || 0), 0);

        // Streak = consecutive days (ending today or yesterday) with a session
        const days = new Set(sessions.map(s =>
            new Date(s.endedAt || s.startedAt).toDateString()));

        let streak = 0;
        const cursor = new Date();

        if (!days.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1);

        while (days.has(cursor.toDateString())) {

            streak++;
            cursor.setDate(cursor.getDate() - 1);
        }

        return {
            count: sessions.length,
            average: avg("overall"),
            hasScores: scored.length > 0,
            streak,
            hours: seconds / 3600,
            skills: {
                confidence: avg("confidence"),
                grammar: avg("grammar"),
                vocabulary: avg("vocabulary"),
                fluency: avg("fluency")
            }
        };
    },

    formatHours(hours) {

        return hours < 1
            ? Math.round(hours * 60) + " min"
            : (Math.round(hours * 10) / 10) + " hrs";
    }
};
