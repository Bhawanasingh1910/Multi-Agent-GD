// =======================================
// Feedback analysis for a finished GD
// =======================================
// Two kinds of numbers:
//  * MEASURED from what the user actually said: words, turns, pace (only
//    when speaking time was really measured), filler words, participation.
//  * JUDGED by Groq with a scoring guide: fluency, grammar, confidence,
//    vocabulary, topic quality, interaction. If Groq fails, local
//    estimates are used and the report says so (source: "local").
// With very little speech the report says it is only a rough estimate.

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

const SUBJECTIVE = ["fluency", "grammar", "confidence", "vocabulary", "topic", "interaction"];

const WEIGHTS = {
    fluency: 0.15,
    grammar: 0.10,
    confidence: 0.15,
    vocabulary: 0.10,
    speed: 0.05,
    topic: 0.20,
    participation: 0.15,
    interaction: 0.10
};

const WORD = /[A-Za-zऀ-ॿ']+/g;

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

const wordCount = (text) => (String(text).match(WORD) || []).length;

// Filler words. Browser speech recognition usually removes "um" and "uh",
// so those two are only counted when the recognizer kept them. "like" and
// "you know" are counted only in filler positions, not as real words
// ("I like this idea", "do you know").
const FILLERS = {
    um: /\bum+\b/gi,
    uh: /\b(?:uh+|er+|erm|ah+)\b/gi,
    like: /\b(?:so|and|but|was|is|it's|were|are|then)\s+like\b(?!\s+(?:to|a|an|the|this|that|these|those|my|your|our|his|her|their)\b)/gi,
    know: /(?<!\b(?:do|did|if|can|would|will|could|should)\s)\byou know\b(?!\s+(?:what|how|why|that|about|where|who|which|the))/gi,
    other: /\b(?:basically|literally|i mean)\b/gi
};

function analyze(input) {

    const transcript = input.transcript;

    const userTurns = transcript.filter(t => t.isUser);

    const userText = userTurns.map(t => t.text).join(" ");

    const totalWords = wordCount(userText);

    // Pace: only from turns whose speaking time was actually measured
    const timedTurns = userTurns.filter(t => t.timed && t.speakSeconds >= 2);

    const timedWords = timedTurns.reduce((n, t) => n + wordCount(t.text), 0);

    const timedSeconds = timedTurns.reduce((n, t) => n + t.speakSeconds, 0);

    const timingMeasured = timedWords >= 20 && timedSeconds > 0;

    const wpm = timingMeasured ? Math.round(timedWords / (timedSeconds / 60)) : null;

    // Speaking time: measured where we have it, estimated (about 2.3 words
    // per second) for the rest
    const untimedWords = totalWords - timedWords;

    const speakSeconds = Math.round(timedSeconds + untimedWords / 2.3);

    const speakEstimated = untimedWords > 0;

    const fillers = {
        um: countMatches(userText, FILLERS.um),
        uh: countMatches(userText, FILLERS.uh),
        like: countMatches(userText, FILLERS.like),
        know: countMatches(userText, FILLERS.know),
        other: countMatches(userText, FILLERS.other)
    };

    fillers.total = fillers.um + fillers.uh + fillers.like + fillers.know + fillers.other;

    // User replies that directly follow an AI message containing a question
    let questionsAnswered = 0;

    transcript.forEach((t, i) => {
        if (t.isUser && i > 0 && !transcript[i - 1].isUser &&
            transcript[i - 1].text.includes("?")) {
            questionsAnswered++;
        }
    });

    const longWords = (userText.toLowerCase().match(WORD) || []).filter(w => w.length > 3);

    const uniqueRatio = longWords.length
        ? new Set(longWords).size / longWords.length
        : 0;

    return {
        userTurns: userTurns.length,
        userText,
        totalWords,
        speakSeconds,
        speakEstimated,
        timingMeasured,
        wpm,
        fillers,
        questionsAnswered,
        uniqueRatio
    };
}

// How much speech do we have to judge from?
function dataQuality(m) {

    if (m.totalWords < 30) {

        return {
            level: "low",
            note: `Only ${m.totalWords} words of your speech were captured, so this report is a rough estimate. ` +
                  "Speak 3 to 4 times in the next discussion for an accurate score."
        };
    }

    if (m.totalWords < 100 || m.userTurns < 2) {

        return {
            level: "medium",
            note: `Based on ${m.totalWords} words across ${m.userTurns} turn(s). ` +
                  "Speak a little more next time for a more reliable report."
        };
    }

    return { level: "high", note: "" };
}

// Measured scores (always computed locally)
function measuredScores(input, m) {

    const participants = (input.participants || []).length;

    const fairShare = Math.max(1, input.transcript.length / (participants + 1));

    const participation = m.totalWords === 0
        ? 0
        : clamp((m.userTurns / fairShare) * 100);

    let speed = null;

    if (m.wpm !== null) {

        const gap = m.wpm < 110 ? 110 - m.wpm : m.wpm > 160 ? m.wpm - 160 : 0;

        speed = clamp(100 - gap * 1.2);
    }

    return { participation, speed };
}

// Estimates used for the judged scores when Groq is unavailable
function localSubjective(input, m) {

    if (m.totalWords === 0) {

        return { fluency: 0, grammar: 0, confidence: 0, vocabulary: 0, topic: 0, interaction: 0 };
    }

    const fillerRatio = m.fillers.total / m.totalWords;

    let paceGap = 0;

    if (m.wpm !== null) paceGap = m.wpm < 110 ? 110 - m.wpm : m.wpm > 160 ? m.wpm - 160 : 0;

    const topicWords = String(input.topic || "")
        .toLowerCase()
        .match(/[a-z]{4,}/g) || [];

    const userLower = m.userText.toLowerCase();

    const topicHits = topicWords.filter(w => userLower.includes(w)).length;

    const namesMentioned = (input.participants || [])
        .filter(p => p.name && userLower.includes(String(p.name).toLowerCase())).length;

    return {
        fluency: clamp(78 - fillerRatio * 300 - paceGap * 0.4),
        grammar: clamp(65 + Math.min(10, m.totalWords / 10)),
        confidence: clamp(45 + m.userTurns * 5 - fillerRatio * 150),
        vocabulary: clamp(30 + m.uniqueRatio * 55),
        topic: clamp(topicWords.length ? 40 + 45 * (topicHits / topicWords.length) : 55),
        interaction: clamp(35 + namesMentioned * 15 + m.questionsAnswered * 15)
    };
}

function overallScore(scores) {

    let total = 0;
    let weight = 0;

    Object.keys(WEIGHTS).forEach(key => {

        if (scores[key] === null || scores[key] === undefined) return;

        total += scores[key] * WEIGHTS[key];
        weight += WEIGHTS[key];
    });

    return weight ? clamp(total / weight) : 0;
}

function vocabularyLevel(score) {
    return score >= 75 ? "Advanced" : score >= 50 ? "Intermediate" : "Basic";
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
    if (m.wpm !== null && m.wpm >= 110 && m.wpm <= 160) strengths.push("Your speaking pace was comfortable to follow.");
    if (m.questionsAnswered > 0) strengths.push("You responded directly when questions were asked.");
    if (!strengths.length) strengths.push("You made the effort to join the discussion.");

    if (m.userTurns < 3) improvements.push("Speak more often - aim for at least 3 or 4 points in a discussion.");
    if (m.fillers.total > 2) improvements.push("Reduce filler words such as like, you know and basically.");
    if (m.wpm !== null && m.wpm < 110) improvements.push("Speak a little faster and more confidently.");
    if (m.wpm !== null && m.wpm > 160) improvements.push("Slow down slightly so every point lands clearly.");
    if (scores.interaction < 55) improvements.push("Refer to other participants by name and build on their points.");
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

// =======================================
// Groq scoring prompt
// =======================================

const EVAL_SYSTEM = `You are a strict but fair Group Discussion (GD) coach for Indian college placements. You score ONE participant, the person labelled USER, using only what they actually said.

Scoring scale (integers 0 to 100):
- 85-100: outstanding and rare; clear, well reasoned, would impress a placement panel
- 70-84: good
- 55-69: average; understandable but plain or thin
- 35-54: weak
- 0-34: poor
Most students land between 45 and 75. Do NOT give everyone 80 or more. When there is little to judge, score lower instead of guessing high.

What each score means:
- fluency: complete, flowing thoughts rather than fragments or repeated restarts.
- grammar: correct sentences. The text comes from speech recognition, which adds punctuation and quietly fixes small slips, so only penalise clear grammar mistakes.
- confidence: takes a clear stand and states it firmly, without constant hedging such as "maybe I think".
- vocabulary: precise and varied word choice.
- topic: relevance to the topic AND quality of reasoning (reasons, examples), not just mentioning the topic.
- interaction: responds to or builds on what others said, uses people's names, supports or challenges a specific point.

Strengths and improvements must point to what the USER actually said (a short quote or a close paraphrase), not generic tips. Only list words in wordSuggestions that the USER really said.`;

function buildPrompt(input, m) {

    const lines = input.transcript
        .slice(-60)
        .map(t => `${t.isUser ? "USER" : t.speaker}: ${t.text}`)
        .join("\n");

    const people = (input.participants || [])
        .map(p => p.personality ? `${p.name} (${p.personality})` : p.name)
        .join(", ");

    const pace = m.wpm !== null ? `${m.wpm} words per minute` : "pace not measured";

    return `Topic: ${input.topic}
Mode: ${input.mode}
Language: ${input.language}
AI participants: ${people}

Transcript:
${lines}

Facts measured about the USER: ${m.totalWords} words in ${m.userTurns} turn(s), ${pace}.

Return ONLY valid JSON in exactly this shape:

{
  "fluency": 0,
  "grammar": 0,
  "confidence": 0,
  "vocabulary": 0,
  "topic": 0,
  "interaction": 0,
  "strengths": ["2 to 3 items about what the USER actually said"],
  "improvements": ["2 to 3 specific, actionable items"],
  "mentorFeedback": "2 to 3 honest, encouraging sentences",
  "participantFeedback": [{"name": "<AI name>", "comment": "one short natural sentence from that AI to the USER about something specific they said or missed, in that AI's personality"}],
  "wordSuggestions": [{"used": "a weak word the USER said", "better": "a stronger alternative"}],
  "nextFocus": "one skill to practise next",
  "nextTopic": "one suggested GD topic"
}`;
}

const list = (v, max) =>
    (Array.isArray(v) ? v : [])
        .filter(x => typeof x === "string" && x.trim())
        .map(x => x.trim().slice(0, 240))
        .slice(0, max);

// ask: async (prompt, maxTokens, options) => string   (askGroq)
async function buildFeedback(input, ask) {

    const m = analyze(input);

    const quality = dataQuality(m);

    const measured = measuredScores(input, m);

    const local = localSubjective(input, m);

    const localText = localQualitative(input, m, local);

    let source = "local";
    let judged = { ...local };
    let ai = null;

    if (m.totalWords > 0) {

        try {

            const reply = extractJson(await ask(buildPrompt(input, m), 3000, {
                system: EVAL_SYSTEM,
                temperature: 0.2,
                reasoning: "medium"
            }));

            // Accept the reply only if it really contains scores
            const gotScores = SUBJECTIVE.filter(k => Number.isFinite(Number(reply[k]))).length;

            if (gotScores >= 4) {

                ai = reply;
                source = "ai";

                SUBJECTIVE.forEach(k => {

                    if (Number.isFinite(Number(reply[k]))) judged[k] = clamp(Number(reply[k]));
                });
            }

        }

        catch (err) {

            console.error("Feedback AI failed, using local estimate:", err.message);
        }
    }

    // Too little speech to judge: never report a high score from one sentence
    if (quality.level === "low") {

        SUBJECTIVE.forEach(k => { judged[k] = Math.min(judged[k], 60); });
    }

    const scores = {
        ...judged,
        participation: measured.participation,
        speed: measured.speed
    };

    scores.overall = overallScore(scores);

    const strengths = ai ? list(ai.strengths, 5) : [];
    const improvements = ai ? list(ai.improvements, 5) : [];

    const aiNames = new Set((input.participants || []).map(p => String(p.name).toLowerCase()));

    const participantFeedback = ai && Array.isArray(ai.participantFeedback)
        ? ai.participantFeedback
            .filter(p => p && typeof p.name === "string" && typeof p.comment === "string" &&
                         aiNames.has(p.name.trim().toLowerCase()))
            .map(p => ({ name: p.name.trim().slice(0, 40), comment: p.comment.trim().slice(0, 240) }))
            .slice(0, 6)
        : [];

    // Only keep suggestions for words the user really said
    const userLower = m.userText.toLowerCase();

    const wordSuggestions = ai && Array.isArray(ai.wordSuggestions)
        ? ai.wordSuggestions
            .filter(w => w && typeof w.used === "string" && typeof w.better === "string" &&
                         w.used.trim() &&
                         new RegExp("\\b" + w.used.trim().toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b").test(userLower))
            .map(w => ({ used: w.used.trim().slice(0, 30), better: w.better.trim().slice(0, 30) }))
            .slice(0, 4)
        : [];

    const otherTopics = NEXT_TOPICS.filter(
        t => t.toLowerCase() !== String(input.topic || "").toLowerCase()
    );

    return {
        source,
        quality,
        scores,
        metrics: {
            speakSeconds: m.speakSeconds,
            speakEstimated: m.speakEstimated,
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
