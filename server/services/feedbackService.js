// =======================================
// Feedback analysis for a finished GD
// =======================================
// Measures what the user actually said (words, pace, fillers, questions)
// and, when Groq is available, asks it for the qualitative scores.
// If Groq fails, local estimates are returned (source: "local").

const NEXT_TOPICS = [
    "Artificial Intelligence",
    "Climate Change",
    "Startup Culture",
    "Remote Work",
    "Electric Vehicles"
];

// A few common weak words and stronger alternatives (used when Groq is unavailable)
const WORD_UPGRADES = {
    good: "excellent",
    bad: "detrimental",
    very: "extremely",
    big: "significant",
    thing: "aspect",
    things: "aspects",
    nice: "impressive",
    important: "crucial",
    help: "facilitate",
    use: "utilise",
    problem: "challenge",
    think: "believe"
};

const clamp = (n, lo = 0, hi = 100) =>
    Math.max(lo, Math.min(hi, Math.round(Number.isFinite(n) ? n : 0)));

// Pull the first {...} block out of a model reply (handles ```json fences)
function extractJson(text) {

    if (typeof text !== "string") throw new Error("Empty reply");

    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");

    if (start === -1 || end <= start) throw new Error("No JSON in reply");

    return JSON.parse(text.slice(start, end + 1));
}

function countMatches(text, regex) {
    return (text.match(regex) || []).length;
}

function analyze(input) {

    const transcript = input.transcript;

    const userTurns = transcript.filter(t => t.isUser);

    const userText = userTurns.map(t => t.text).join(" ");

    const words = userText.match(/[A-Za-zऀ-ॿ']+/g) || [];

    const totalWords = words.length;

    let speakSeconds = userTurns.reduce(
        (sum, t) => sum + (Number(t.speakSeconds) || 0), 0
    );

    // No timing recorded: estimate from a typical speaking pace
    if (!speakSeconds && totalWords) speakSeconds = Math.round(totalWords / 2.2);

    const wpm = speakSeconds ? Math.round(totalWords / (speakSeconds / 60)) : 0;

    const fillers = {
        um: countMatches(userText, /\bum+\b/gi),
        uh: countMatches(userText, /\b(uh+|er|ah)\b/gi),
        like: countMatches(userText, /\blike\b/gi),
        know: countMatches(userText, /\byou know\b/gi)
    };

    fillers.total = fillers.um + fillers.uh + fillers.like + fillers.know;

    // User replies that directly follow an AI message containing a question
    let questionsAnswered = 0;

    transcript.forEach((t, i) => {
        if (t.isUser && i > 0 && !transcript[i - 1].isUser &&
            transcript[i - 1].text.includes("?")) {
            questionsAnswered++;
        }
    });

    const longWords = words.map(w => w.toLowerCase()).filter(w => w.length > 3);

    const uniqueRatio = longWords.length
        ? new Set(longWords).size / longWords.length
        : 0;

    return {
        userTurns: userTurns.length,
        userText,
        words,
        totalWords,
        speakSeconds,
        wpm,
        fillers,
        questionsAnswered,
        uniqueRatio
    };
}

function localScores(input, m) {

    if (m.totalWords === 0) {

        return {
            fluency: 0, grammar: 0, confidence: 0, vocabulary: 0,
            speed: 0, topic: 0, participation: 0, interaction: 0
        };
    }

    const fillerRatio = m.fillers.total / m.totalWords;

    const paceGap = m.wpm < 100 ? 100 - m.wpm : m.wpm > 160 ? m.wpm - 160 : 0;

    const topicWords = String(input.topic || "")
        .toLowerCase()
        .match(/[a-z]{4,}/g) || [];

    const userLower = m.userText.toLowerCase();

    const topicHits = topicWords.filter(w => userLower.includes(w)).length;

    const totalTurns = input.transcript.length;

    const fairShare = Math.max(1, totalTurns / ((input.participants || []).length + 1));

    const namesMentioned = (input.participants || [])
        .filter(p => p.name && userLower.includes(String(p.name).toLowerCase())).length;

    return {
        fluency: clamp(90 - fillerRatio * 300 - paceGap * 0.5),
        grammar: clamp(72 + Math.min(10, m.totalWords / 10)),
        confidence: clamp(55 + m.userTurns * 5 - fillerRatio * 150),
        vocabulary: clamp(35 + m.uniqueRatio * 60),
        speed: clamp(100 - Math.abs(m.wpm - 130) * 0.8),
        topic: clamp(topicWords.length ? 50 + 50 * (topicHits / topicWords.length) : 65),
        participation: clamp((m.userTurns / fairShare) * 100),
        interaction: clamp(45 + namesMentioned * 15 + m.questionsAnswered * 15)
    };
}

function overallScore(s) {

    return clamp(
        s.fluency * 0.15 + s.grammar * 0.15 + s.confidence * 0.15 +
        s.vocabulary * 0.10 + s.speed * 0.10 + s.topic * 0.15 +
        s.participation * 0.10 + s.interaction * 0.10
    );
}

function vocabularyLevel(score) {
    return score >= 80 ? "Advanced" : score >= 55 ? "Intermediate" : "Basic";
}

function localQualitative(input, m, scores) {

    const strengths = [];
    const improvements = [];

    if (m.totalWords === 0) {

        return {
            strengths: [],
            improvements: [
                "You did not speak in this discussion. Click the mic and share your point at least 3 or 4 times."
            ],
            mentorFeedback:
                "You listened to the discussion but did not take part, so there is nothing to score yet. Try joining in early next time.",
            participantFeedback: (input.participants || []).map(p => ({
                name: p.name,
                comment: "I would have liked to hear your opinion on this."
            })),
            wordSuggestions: []
        };
    }

    if (m.userTurns >= 3) strengths.push("You took part several times instead of only listening.");
    if (m.fillers.total <= 2) strengths.push("You spoke cleanly with very few filler words.");
    if (m.wpm >= 100 && m.wpm <= 160) strengths.push("Your speaking pace was comfortable to follow.");
    if (m.questionsAnswered > 0) strengths.push("You responded directly when questions were asked.");
    if (!strengths.length) strengths.push("You made the effort to join the discussion.");

    if (m.userTurns < 3) improvements.push("Speak more often - aim for at least 3 or 4 points in a discussion.");
    if (m.fillers.total > 2) improvements.push("Reduce filler words such as um, uh and like.");
    if (m.wpm && m.wpm < 100) improvements.push("Speak a little faster and more confidently.");
    if (m.wpm > 160) improvements.push("Slow down slightly so every point lands clearly.");
    if (scores.interaction < 60) improvements.push("Refer to other participants by name and build on their points.");
    if (!improvements.length) improvements.push("Support your points with a concrete example.");

    const lower = m.userText.toLowerCase();

    const wordSuggestions = Object.keys(WORD_UPGRADES)
        .filter(w => new RegExp("\\b" + w + "\\b").test(lower))
        .slice(0, 4)
        .map(w => ({ used: w, better: WORD_UPGRADES[w] }));

    return {
        strengths,
        improvements,
        mentorFeedback:
            "This is an estimate based on how much and how clearly you spoke, because the AI review was unavailable. " +
            "You contributed " + m.userTurns + " time(s) and spoke about " + m.totalWords + " words.",
        participantFeedback: (input.participants || []).map(p => ({
            name: p.name,
            comment: "Thanks for joining in - keep building on what others say."
        })),
        wordSuggestions
    };
}

function buildPrompt(input, m) {

    const lines = input.transcript
        .slice(-60)
        .map(t => `${t.isUser ? "User" : t.speaker}: ${t.text}`)
        .join("\n");

    const names = (input.participants || []).map(p => p.name).join(", ");

    return `
You are an expert Group Discussion (GD) evaluator for Indian college placements.

Topic: ${input.topic}
Mode: ${input.mode}
Language: ${input.language}
AI participants: ${names}

Transcript:
${lines}

Evaluate ONLY what the speaker named "User" said. Be fair, specific and honest.

Measured facts about the user: ${m.totalWords} words, ${m.userTurns} turns, ${m.wpm} words per minute, ${m.fillers.total} filler words.

Return ONLY valid JSON in exactly this shape. All scores are integers 0-100.

{
  "fluency": 0,
  "grammar": 0,
  "confidence": 0,
  "vocabulary": 0,
  "topic": 0,
  "participation": 0,
  "interaction": 0,
  "strengths": ["...", "..."],
  "improvements": ["...", "..."],
  "mentorFeedback": "2-3 sentences",
  "participantFeedback": [{"name": "<AI name>", "comment": "one short sentence from that AI to the user"}],
  "wordSuggestions": [{"used": "weak word the user said", "better": "stronger alternative"}],
  "nextFocus": "one skill to practise next",
  "nextTopic": "one suggested GD topic"
}`;
}

const list = (v, max) =>
    (Array.isArray(v) ? v : [])
        .filter(x => typeof x === "string" && x.trim())
        .map(x => x.trim().slice(0, 240))
        .slice(0, max);

// ask: async (prompt, maxTokens) => string   (askGroq)
async function buildFeedback(input, ask) {

    const m = analyze(input);

    const local = localScores(input, m);

    const localText = localQualitative(input, m, local);

    let source = "local";
    let scores = { ...local };
    let ai = null;

    if (m.totalWords > 0) {

        try {

            const reply = extractJson(await ask(buildPrompt(input, m), 2048));

            ai = reply;
            source = "ai";

            ["fluency", "grammar", "confidence", "vocabulary",
             "topic", "participation", "interaction"].forEach(k => {

                if (Number.isFinite(Number(reply[k]))) scores[k] = clamp(Number(reply[k]));
            });

        }

        catch (err) {

            console.error("Feedback AI failed, using local estimate:", err.message);
        }
    }

    scores.overall = overallScore(scores);

    const strengths = ai ? list(ai.strengths, 5) : [];
    const improvements = ai ? list(ai.improvements, 5) : [];

    const participantFeedback = ai && Array.isArray(ai.participantFeedback)
        ? ai.participantFeedback
            .filter(p => p && typeof p.name === "string" && typeof p.comment === "string")
            .map(p => ({ name: p.name.slice(0, 40), comment: p.comment.slice(0, 240) }))
            .slice(0, 6)
        : [];

    const wordSuggestions = ai && Array.isArray(ai.wordSuggestions)
        ? ai.wordSuggestions
            .filter(w => w && typeof w.used === "string" && typeof w.better === "string")
            .map(w => ({ used: w.used.slice(0, 30), better: w.better.slice(0, 30) }))
            .slice(0, 4)
        : [];

    const otherTopics = NEXT_TOPICS.filter(
        t => t.toLowerCase() !== String(input.topic || "").toLowerCase()
    );

    return {
        source,
        scores,
        metrics: {
            speakSeconds: m.speakSeconds,
            totalWords: m.totalWords,
            wpm: m.wpm,
            responses: m.userTurns,
            questionsAnswered: m.questionsAnswered,
            interruptions: 0,
            fillers: m.fillers,
            vocabularyLevel: vocabularyLevel(scores.vocabulary)
        },
        strengths: strengths.length ? strengths : localText.strengths,
        improvements: improvements.length ? improvements : localText.improvements,
        mentorFeedback:
            ai && typeof ai.mentorFeedback === "string" && ai.mentorFeedback.trim()
                ? ai.mentorFeedback.trim().slice(0, 700)
                : localText.mentorFeedback,
        participantFeedback: participantFeedback.length
            ? participantFeedback
            : localText.participantFeedback,
        wordSuggestions: wordSuggestions.length ? wordSuggestions : localText.wordSuggestions,
        nextFocus:
            ai && typeof ai.nextFocus === "string" && ai.nextFocus.trim()
                ? ai.nextFocus.trim().slice(0, 120)
                : (m.totalWords === 0 ? "Taking part in the discussion"
                    : scores.interaction < scores.fluency ? "Interacting with other participants"
                    : "Confidence & Critical Thinking"),
        nextTopic:
            ai && typeof ai.nextTopic === "string" && ai.nextTopic.trim()
                ? ai.nextTopic.trim().slice(0, 120)
                : otherTopics[Math.floor(Math.random() * otherTopics.length)]
    };
}

module.exports = { buildFeedback, extractJson };
