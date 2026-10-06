const crypto = require("crypto");

const { askGroq } = require("../services/groqService");

const { buildFeedback, extractJson } = require("../services/feedbackService");

const {
    createDiscussion,
    getDiscussion,
    addMessage,
    nextSpeaker
} = require("../managers/discussionManager");


// =======================================
// HOW EACH AI SOUNDS
// =======================================

const PERSONALITY = {
    Aggressive: "assertive and direct. Challenges weak points openly, sounds sure of themselves, short punchy sentences.",
    Calm: "relaxed and measured. Thinks before speaking and softens disagreement.",
    Curious: "inquisitive. Likes asking a sharp 'why' or 'how' about what was just said.",
    Friendly: "warm and encouraging. Agrees where possible and builds on other people's points.",
    Logical: "analytical. Backs points with reasons, cause and effect, numbers or a real example.",
    Supportive: "backs up good points with extra reasoning and helps quieter people join in."
};

// words = target length of one spoken turn
const STYLE = {
    Concise: { how: "very short and to the point.", words: "10 to 20" },
    Casual: { how: "relaxed everyday speech; informal words are fine.", words: "15 to 30" },
    Formal: { how: "careful, proper wording.", words: "15 to 30" },
    Professional: { how: "polished and well organised, but still conversational.", words: "15 to 35" },
    Detailed: { how: "adds a little more explanation or one example.", words: "30 to 50" }
};

const LANGUAGE_RULE = {
    English: "Speak in simple, natural spoken Indian English.",
    Hindi: "Speak in Hindi, written in Devanagari script.",
    Hinglish: "Speak in Hinglish: a natural Hindi-English mix written in Roman (English) letters, the way Indian college students talk."
};

const firstName = (name) => String(name || "").trim().split(/\s+/)[0] || "";

const personalityText = (p) => PERSONALITY[p.personality] || String(p.personality || "");

const styleOf = (p) => STYLE[p.speakingStyle] || { how: String(p.speakingStyle || ""), words: "15 to 35" };

const languageRule = (language) => LANGUAGE_RULE[language] || LANGUAGE_RULE.English;


// =======================================
// TURN PROMPTS
// =======================================

function buildSystem(discussion, speaker, opening) {

    const style = styleOf(speaker);

    return `You are ${speaker.name}, taking part in a live Group Discussion (GD) held for college placement practice in India. Everyone is speaking out loud, so write ONLY what you would actually say.

Your personality (${speaker.personality}): ${personalityText(speaker)}
Your speaking style (${speaker.speakingStyle}): ${style.how}
${languageRule(discussion.language)}

How to speak:
1. ${opening
        ? "You are opening the discussion: say what the topic means to you in your own words and give your first clear opinion."
        : "React to the specific point that was just made: agree with a reason, disagree politely with a reason, add an example, or ask one sharp question. Then add your own angle."}
2. Say one main idea only. Use ${style.words} words, in 1 to 3 spoken sentences.
3. Sound like a real college student talking, not writing: use contractions, no lists, no headings, no emojis, no quotation marks, no stage directions.
4. Mention people by first name only now and then (for example "I see Priya's point, but..."), not in every turn.
5. Never repeat an idea that has already been said. If the talk is going in circles, bring up a fresh angle that is still about the topic.
6. Do not greet people again, do not introduce yourself, and do not summarise or wrap up the discussion.
7. Do not start with filler praise like "Great point". Vary how you start.
8. Stay in character as ${speaker.name}.

Output ONLY the words you say. No name label, no JSON.`;
}

function buildTurnPrompt(discussion, speaker, situation) {

    const userName = firstName(discussion.userName) || "the user";

    const people = discussion.participants
        .map(p => `- ${p.name} (${p.gender}), ${p.personality}, ${p.speakingStyle}`)
        .join("\n");

    const history = discussion.conversation
        .slice(-14)
        .map(line => line.startsWith("User: ")
            ? `${userName} (USER): ${line.slice(6)}`
            : line)
        .join("\n");

    return `Topic: ${discussion.topic}
Mode: ${discussion.mode}

People in the room:
${people}
- ${userName} (the real human student; their lines are marked USER)

Conversation so far:
${history || "(nobody has spoken yet)"}

${situation}

Now say your next line as ${speaker.name}.`;
}

// Works out what the next speaker should respond to
function describeSituation(discussion) {

    const userName = firstName(discussion.userName) || "the user";

    const last = discussion.conversation[discussion.conversation.length - 1] || "";

    const colon = last.indexOf(": ");

    const prevSpeaker = colon > 0 ? last.slice(0, colon) : "";

    const prevText = colon > 0 ? last.slice(colon + 2) : last;

    const lines = [];

    if (prevSpeaker === "User") {

        lines.push(
            `The previous speaker is the USER (${userName}). ` +
            "If the previous speaker is the USER, treat the user as a real GD participant. " +
            "Respond naturally to the user's point when appropriate. " +
            "You may agree, disagree, challenge the point, ask a follow-up question, or build on it. " +
            "Do not always directly address the user; continue the discussion naturally when appropriate."
        );

    }

    else {

        lines.push(`The last speaker was ${prevSpeaker || "someone"}. Respond to what they just said.`);

        // Every 4th AI turn without the user, bring them in by name
        if (discussion.turnsSinceUser >= 4 && discussion.turnsSinceUser % 4 === 0) {

            lines.push(
                `${userName} (the user) has not spoken for a while. ` +
                `Briefly respond to the last point, then ask ${userName} by name what they think. Keep it short.`
            );
        }
    }

    const firstWord = prevText.trim().split(/\s+/)[0];

    if (firstWord && firstWord.length < 20) {

        lines.push(`Do not begin your line with the word "${firstWord.replace(/[^\wऀ-ॿ']/g, "")}".`);
    }

    return lines.join("\n");
}


// =======================================
// CLEAN THE MODEL'S REPLY
// =======================================

function cleanLine(raw, names = []) {

    if (typeof raw !== "string") throw new Error("Empty reply");

    let text = raw.trim();

    // Sometimes the model still answers with JSON
    if (text.startsWith("{") || text.includes("```")) {

        try {

            const parsed = extractJson(text);

            if (parsed && typeof parsed.message === "string") text = parsed.message;

        }

        catch { /* not JSON, keep the text */ }
    }

    text = text.replace(/```[a-z]*\n?|```/g, "").trim();

    // Remove a leading "Name:" label
    const label = text.match(/^\**\s*([A-Za-zऀ-ॿ][\wऀ-ॿ .'-]{0,30}?)\s*\**\s*:\s*\**\s+/);

    if (label) {

        const who = label[1].trim().toLowerCase();

        if (/^user$/.test(who) || names.some(n => String(n).trim().toLowerCase() === who)) {

            text = text.slice(label[0].length);
        }
    }

    text = text
        .replace(/^["“‘'`]+|["”’'`]+$/g, "")
        .replace(/\*+/g, "")
        .replace(/\s*\n+\s*/g, " ")
        .replace(/\s{2,}/g, " ")
        .trim();

    if (text.length > 450) {

        const cut = text.slice(0, 450);

        const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("? "), cut.lastIndexOf("! "));

        text = end > 150 ? cut.slice(0, end + 1) : cut.trim();
    }

    if (!text) throw new Error("Empty reply");

    return text;
}

// One retry: an occasional empty or failed reply should not skip a turn
async function generateLine(system, user, names) {

    let lastError;

    for (let attempt = 0; attempt < 2; attempt++) {

        try {

            const raw = await askGroq(user, 1024, { system, temperature: 0.9 });

            console.log("Groq Reply:", raw);

            return cleanLine(raw, names);

        }

        catch (err) {

            lastError = err;

            console.error("=========== GROQ ERROR (attempt " + (attempt + 1) + ") ===========");
            console.error(err && err.message ? err.message : err);
        }
    }

    throw lastError;
}


// =======================================
// START DISCUSSION
// =======================================

async function startDiscussion(req, res) {

    try {

        const {
            topic,
            mode,
            language,
            duration,
            participants,
            userName
        } = req.body;

        if (!topic || !Array.isArray(participants) || participants.length === 0) {

            return res.status(400).json({
                success: false,
                message: "A topic and at least one AI participant are required"
            });
        }

        const discussionId = crypto.randomUUID();
        console.log("Generated ID:", discussionId);

        createDiscussion(discussionId, {
            topic,
            mode,
            language,
            duration,
            participants,
            userName
        });
        console.log("Discussion Created:", discussionId);

        const discussion = getDiscussion(discussionId);

        const firstSpeaker = participants[0];

        let reply;

        try {

            const message = await generateLine(
                buildSystem(discussion, firstSpeaker, true),
                buildTurnPrompt(discussion, firstSpeaker, "Nobody has spoken yet. You speak first."),
                participants.map(p => p.name)
            );

            reply = { name: firstSpeaker.name, message };

        }

        catch {

            reply = {
                name: firstSpeaker.name,
                message: `Hi everyone! Let's start our discussion on ${topic}. I'd like to hear everyone's opinion.`
            };
        }

        addMessage(
            discussionId,
            `${reply.name}: ${reply.message}`
        );

        res.json({
            success: true,
            discussionId,
            response: reply
        });
    }

    catch (err) {

        res.status(500).json({

            success: false,

            message: err.message

        });

    }

}



// =======================================
// NEXT AI TURN
// =======================================

async function nextTurn(req, res) {

     console.log("NEXT TURN CALLED");

    try {

        const { discussionId } = req.body;
        console.log("Received:", discussionId);

        const discussion = getDiscussion(discussionId);

        if (!discussion) {

            return res.status(404).json({

                success: false,

                message: "Discussion not found"

            });

        }

        const speaker = nextSpeaker(discussionId);
        console.log("Speaker:", speaker);

        let message;

        try {

            message = await generateLine(
                buildSystem(discussion, speaker, false),
                buildTurnPrompt(discussion, speaker, describeSituation(discussion)),
                discussion.participants.map(p => p.name)
            );

        }

        catch {

            // Nothing is added to the conversation and nothing is spoken:
            // the client just skips this turn.
            return res.status(502).json({
                success: false,
                message: "The AI could not respond. Check the Groq key and limits in the server window."
            });
        }

        const reply = { name: speaker.name, message };

        console.log("Reply:", reply);

        addMessage(
            discussionId,
            `${reply.name}: ${reply.message}`
        );

        res.json({
            success: true,
            response: reply
        });

    }

    catch (err) {

        res.status(500).json({

            success: false,

            message: err.message

        });

    }

}



// =======================================
// USER MESSAGE
// =======================================

function userMessage(req, res) {

    const {

        discussionId,

        message

    } = req.body;

    const text = typeof message === "string" ? message.trim() : "";

    if (!text) {

        return res.status(400).json({

            success: false,

            message: "Message is empty"

        });

    }

    if (!getDiscussion(discussionId)) {

        return res.status(404).json({

            success: false,

            message: "Discussion not found"

        });

    }

    addMessage(

        discussionId,

        `User: ${text}`

    );

    res.json({

        success: true

    });

}


// =======================================
// FEEDBACK
// =======================================

async function feedback(req, res) {

    try {

        const {
            topic,
            mode,
            language,
            participants,
            transcript
        } = req.body;

        if (!Array.isArray(transcript) || transcript.length === 0) {

            return res.status(400).json({
                success: false,
                message: "Transcript is empty"
            });
        }

        // Basic size limits + shape check
        const cleanTranscript = transcript
            .slice(-300)
            .filter(t => t && typeof t.text === "string" && t.text.trim())
            .map(t => ({
                speaker: String(t.speaker || "").slice(0, 40),
                text: t.text.trim().slice(0, 1000),
                isUser: t.isUser === true,
                speakSeconds: Number(t.speakSeconds) || 0,
                timed: t.timed === true
            }));

        const result = await buildFeedback({
            topic: String(topic || "").slice(0, 200),
            mode: String(mode || "").slice(0, 60),
            language: String(language || "").slice(0, 40),
            participants: Array.isArray(participants)
                ? participants.slice(0, 8).map(p => ({
                    name: String(p && p.name || "").slice(0, 40),
                    personality: String(p && p.personality || "").slice(0, 30)
                }))
                : [],
            transcript: cleanTranscript
        }, askGroq);

        res.json({ success: true, feedback: result });

    }

    catch (err) {

        res.status(500).json({
            success: false,
            message: err.message
        });
    }
}

module.exports = {

    startDiscussion,

    nextTurn,

    userMessage,

    feedback,

    // exported for tests
    cleanLine

};
