// ==========================================
// Multi-Agent GD
// Feedback Page
// ==========================================

document.addEventListener("DOMContentLoaded", async () => {

    if (!Store.requireLogin()) return;

    const $ = id => document.getElementById(id);

    const SCORE_KEYS = [
        "fluency", "grammar", "confidence", "vocabulary",
        "speed", "topic", "participation", "interaction"
    ];

    // ==========================
    // Buttons
    // ==========================

    $("practice-again-btn").addEventListener("click", () => {

        window.location.href = "create-room.html";

    });

    $("history-btn").addEventListener("click", () => {

        window.location.href = "history.html";

    });

    // ==========================
    // Which discussion?
    // ==========================

    const id = new URLSearchParams(window.location.search).get("id");

    const session = id ? Store.getSession(id) : Store.latestSession();

    if (!session) {

        showMessage(
            "No feedback yet",
            "Complete a discussion and your feedback report will appear here."
        );

        $("download-btn").addEventListener("click", () => {

            alert("There is no report to download yet.");

        });

        return;
    }

    fillSessionInfo(session);

    // ==========================
    // Get the feedback (first time only)
    // ==========================

    if (!session.feedback) {

        showMessage(
            "Analysing your discussion...",
            "The AI is reviewing what you said. This takes a few seconds."
        );

        try {

            const result = await apiPost("/api/ai/discussion/feedback", {
                topic: session.topic,
                mode: session.mode,
                language: session.language,
                participants: session.participants,
                transcript: session.transcript
            });

            if (!result.success) {

                throw new Error(result.message || "Feedback request failed");
            }

            session.feedback = result.feedback;

            Store.upsertSession(session);

        }

        catch (err) {

            console.error(err);

            showMessage(
                "Feedback unavailable",
                "Could not create your feedback (" + err.message + "). " +
                "Make sure the server is running, then refresh this page to try again."
            );

            $("download-btn").addEventListener("click", () => {

                alert("The report is not ready yet. Refresh the page to try again.");

            });

            return;
        }
    }

    render(session);

    $("download-btn").addEventListener("click", () => downloadReport(session));

    // ==========================
    // Helpers
    // ==========================

    function showMessage(title, message) {

        $("overall-grade").textContent = title;

        $("overall-message").textContent = message;

        $("overall-score").textContent = "--";

        SCORE_KEYS.forEach(key => {

            $(key + "-score").textContent = "--";

            $(key + "-bar").style.width = "0%";
        });
    }

    function fillSessionInfo(s) {

        $("session-topic").textContent = s.topic;

        $("session-duration").textContent = Store.mmss(s.elapsedSeconds);

        $("session-language").textContent = s.language;

        $("session-participants").textContent = s.participants.length;

        $("pause-time").textContent = Store.mmss(s.pausedSeconds);

        $("feedback-subtitle").textContent =
            "Your discussion on \"" + s.topic + "\" - " + Store.formatDate(s.endedAt || s.startedAt);
    }

    function gradeFor(score, responses) {

        if (responses === 0) {

            return [
                "You didn't speak 🎤",
                "You listened but did not join in this time. Click the mic and share your point next round."
            ];
        }

        if (score >= 85) return ["Excellent 🎉", "Great job! Your communication skills are strong."];

        if (score >= 70) return ["Good Job 👍", "Solid discussion. A few improvements will take you higher."];

        if (score >= 50) return ["Keep Practising 💪", "You are on the right track. Focus on the improvements below."];

        return ["Needs Work", "Keep practising - speak more often and with more confidence."];
    }

    function render(s) {

        const f = s.feedback;

        const m = f.metrics;

        const [grade, message] = gradeFor(f.scores.overall, m.responses);

        $("overall-grade").textContent = grade;

        $("overall-message").textContent = message;

        $("overall-score").textContent = f.scores.overall + "%";

        SCORE_KEYS.forEach(key => {

            $(key + "-score").textContent = f.scores[key] + "%";

            $(key + "-bar").style.width = f.scores[key] + "%";
        });

        if (f.source === "local") {

            $("feedback-subtitle").textContent +=
                " (estimated - the AI review was unavailable)";
        }

        // Speaking statistics
        $("speaking-time").textContent = Store.mmss(m.speakSeconds);
        $("total-words").textContent = m.totalWords;
        $("words-per-minute").textContent = m.wpm;
        $("questions-answered").textContent = m.questionsAnswered;
        $("response-count").textContent = m.responses;
        $("interruptions").textContent = m.interruptions;
        $("vocabulary-level").textContent = m.vocabularyLevel;

        // Filler words
        $("filler-total").textContent = m.fillers.total;
        $("um-count").textContent = m.fillers.um;
        $("uh-count").textContent = m.fillers.uh;
        $("like-count").textContent = m.fillers.like;
        $("know-count").textContent = m.fillers.know;

        // Vocabulary suggestions
        for (let i = 1; i <= 4; i++) {

            const w = f.wordSuggestions[i - 1];

            $("word" + i + "-used").textContent = w ? w.used : "-";

            $("word" + i + "-better").textContent = w ? w.better : "-";
        }

        // Strengths / improvements
        $("strength-list").innerHTML = f.strengths.length
            ? f.strengths.map(t => "<li>" + Store.esc(t) + "</li>").join("")
            : "<li>Speak in the next discussion to unlock your strengths.</li>";

        $("improvement-list").innerHTML =
            f.improvements.map(t => "<li>" + Store.esc(t) + "</li>").join("");

        $("mentor-feedback").textContent = f.mentorFeedback;

        $("participant-feedback-container").innerHTML = f.participantFeedback
            .map(p => `
                <div class="participant-review">
                    <h3>🤖 ${Store.esc(p.name)}</h3>
                    <p>${Store.esc(p.comment)}</p>
                </div>`)
            .join("");

        // Next practice
        $("next-focus").textContent = f.nextFocus;
        $("next-topic").textContent = f.nextTopic;
        $("next-duration").textContent = Math.max(5, s.duration || 10) + " Minutes";
    }

    function downloadReport(s) {

        const f = s.feedback;

        const m = f.metrics;

        const lines = [
            "MULTI-AGENT GD - FEEDBACK REPORT",
            "================================",
            "Topic: " + s.topic,
            "Mode: " + s.mode + " | Language: " + s.language,
            "Date: " + Store.formatDate(s.endedAt || s.startedAt),
            "Duration: " + Store.mmss(s.elapsedSeconds),
            "",
            "OVERALL SCORE: " + f.scores.overall + "%",
            ...SCORE_KEYS.map(k => "  " + k + ": " + f.scores[k] + "%"),
            "",
            "SPEAKING",
            "  Speaking time: " + Store.mmss(m.speakSeconds),
            "  Words: " + m.totalWords + " | Pace: " + m.wpm + " wpm",
            "  Responses: " + m.responses + " | Questions answered: " + m.questionsAnswered,
            "  Filler words: " + m.fillers.total +
                " (um " + m.fillers.um + ", uh " + m.fillers.uh +
                ", like " + m.fillers.like + ", you know " + m.fillers.know + ")",
            "",
            "STRENGTHS",
            ...f.strengths.map(t => "  - " + t),
            "",
            "IMPROVEMENTS",
            ...f.improvements.map(t => "  - " + t),
            "",
            "MENTOR FEEDBACK",
            "  " + f.mentorFeedback,
            "",
            "NEXT PRACTICE",
            "  Focus: " + f.nextFocus,
            "  Topic: " + f.nextTopic,
            "",
            f.source === "local" ? "(Estimated report - AI review was unavailable)" : ""
        ];

        const blob = new Blob([lines.join("\n")], { type: "text/plain" });

        const link = document.createElement("a");

        link.href = URL.createObjectURL(blob);

        link.download = "GD-feedback-" + s.topic.replace(/[^a-z0-9]+/gi, "-").toLowerCase() + ".txt";

        document.body.appendChild(link);

        link.click();

        link.remove();

        URL.revokeObjectURL(link.href);
    }

});
