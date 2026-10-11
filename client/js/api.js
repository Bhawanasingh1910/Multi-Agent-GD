const API_BASE = window.GD_API_BASE ||
    (window.location.protocol === "file:" ? "http://localhost:5000" : window.location.origin);

// Generic request: sends the login token, handles expired logins
async function apiRequest(method, path, body, keepalive) {

    const headers = { "Content-Type": "application/json" };

    const token = localStorage.getItem("gdToken");

    if (token) headers.Authorization = "Bearer " + token;

    const response = await fetch(API_BASE + path, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        keepalive: !!keepalive
    });

    // Token missing/expired -> back to the login page
    if (response.status === 401 && token) {

        Store.logout();

        window.location.href = "auth.html";

        throw new Error("Please log in again");
    }

    return response.json();
}

// POST JSON to the API and return the parsed JSON reply
function apiPost(path, body) {

    return apiRequest("POST", path, body);
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

        // skipSync = true right after login (data just came from the server)
    setUser(user, skipSync) {

        Store.write("gdUser", user);

        // Dashboard and older code read this key
        localStorage.setItem("username", user.name);

        if (!skipSync && Store.getToken()) {

            apiRequest("PUT", "/api/auth/me", {
                name: user.name,
                college: user.college,
                language: user.language
            }).catch(() => {});
        }
    },

    getToken() {

        return localStorage.getItem("gdToken");
    },

    setToken(token) {

        localStorage.setItem("gdToken", token);
    },

    // Fetch this user's sessions from the server (and upload any that
    // exist only in this browser, e.g. a failed earlier save)
    async pullSessions() {

        const result = await apiRequest("GET", "/api/sessions");

        if (!result.success) return;

        const server = result.sessions;

        const serverIds = new Set(server.map(s => s.id));

        const unsent = Store.getSessions().filter(s => !serverIds.has(s.id));

        unsent.forEach(s => apiRequest("PUT", "/api/sessions/" + encodeURIComponent(s.id), s).catch(() => {}));

        Store.saveSessions(server.concat(unsent));
    },

    logout() {

        localStorage.removeItem("gdUser");
        localStorage.removeItem("username");
        localStorage.removeItem("gdToken");
        localStorage.removeItem("gdSessions");
        localStorage.removeItem("discussionConfig");
        localStorage.removeItem("discussionSession");
        sessionStorage.removeItem("gdSynced");
    },

    // Call at the top of pages that need a login
    requireLogin() {

                if (!Store.getUser() || !Store.getToken()) {
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
        
        // Save to the database too. keepalive lets it finish even if the
        // page changes right after (End Discussion -> feedback page).
        if (Store.getToken()) {

            const body = JSON.stringify(session);

            apiRequest("PUT", "/api/sessions/" + encodeURIComponent(session.id),
                session, body.length < 60000).catch(() => {});
        }
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


// Once per browser tab: refresh history from the server, then reload the
// page if it changed (so a user logging in on a new device sees old data)
(async function syncOnce() {

    if (!Store.getToken() || sessionStorage.getItem("gdSynced")) return;

    sessionStorage.setItem("gdSynced", "1");

    try {

        const before = localStorage.getItem("gdSessions");

        await Store.pullSessions();

        if (localStorage.getItem("gdSessions") !== before &&
            /(dashboard|history|profile)\.html/.test(window.location.pathname)) {

            window.location.reload();
        }
    }

    catch { /* offline: keep using the local copy */ }
})();