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
// START DISCUSSION
// =======================================

async function startDiscussion(req, res) {

    try {

        const {
            topic,
            mode,
            language,
            duration,
            participants
        } = req.body;

        const discussionId = crypto.randomUUID();
        console.log("Generated ID:", discussionId);

        createDiscussion(discussionId, {
            topic,
            mode,
            language,
            duration,
            participants
        });
        console.log("Discussion Created:", discussionId);

        const firstSpeaker = participants[0];

        const prompt = `
You are ${firstSpeaker.name}.

You are an Indian college student in a Placement Group Discussion.

Topic:
${topic}

Your Personality:
${firstSpeaker.personality}

Speaking Style:
${firstSpeaker.speakingStyle}

Rules:

- Speak first.
- Sound like a real student.
- Use simple English.
- Maximum 2 or 3 short sentences.
- Around 20-35 words.
- Don't explain everything.
- Don't sound like ChatGPT.
- Be natural.

Return ONLY JSON.

{
"name":"${firstSpeaker.name}",
"message":"..."
}
`;
        let reply;

try {

    const replyText = await askGroq(prompt);
    reply = extractJson(replyText);

}
catch {

    // Gemini failed (quota exceeded)

    reply = {
        name: firstSpeaker.name,
        message: `Hi everyone! Let's start our discussion on ${topic}. I would like to hear all opinion.`
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

        const history = discussion.conversation
    .slice(-12)   // last 12 messages
    .join("\n");

        const participantInfo = discussion.participants
                    .map(p => `
        Name : ${p.name}
        Gender : ${p.gender}
        Personality : ${p.personality}
        Speaking Style : ${p.speakingStyle}
        `)
                    .join("\n");

       const prompt = `
You are simulating a participant in a REAL Indian engineering college Group Discussion (GD).

=========================
DISCUSSION CONTEXT
=========================
Topic: ${discussion.topic}
Mode: ${discussion.mode}
Language: ${discussion.language}

=========================
CURRENT SPEAKER PROFILE
=========================
Name: ${speaker.name}
Gender: ${speaker.gender}
Personality: ${speaker.personality}
Speaking Style: ${speaker.speakingStyle}

=========================
ALL PARTICIPANTS
=========================
${participantInfo}

=========================
CONVERSATION HISTORY
=========================
${history}
=========================
RESPONSE GUIDELINES
=========================

You are ${speaker.name}, an Indian engineering student in a placement Group Discussion.

Your personality:
${speaker.personality}

Speaking style:
${speaker.speakingStyle}

Follow these rules:

1. Stay in character.
Sometimes your response can be very short.

Examples:

"I agree."

"Good point."

"I don't think so."

"Exactly."

"That's fair."

Not every turn needs a long explanation.

2. React to the previous speaker only if it feels natural.

3. Do NOT keep extending the same argument.

If the discussion has already focused on one point for several turns, naturally move to another aspect.

Possible new directions:
- advantages
- disadvantages
- practical implementation
- student perspective
- industry perspective
- cost
- ethics
- future trends
- technology
- challenges
- examples
- government policies
- environmental impact
- social impact

4. Your response should do ONLY ONE of these:

- introduce a new argument
- politely disagree
- support someone with reasoning
- ask another participant ONE meaningful question
- give a practical example
- compare two viewpoints
- bring discussion back to the main topic

Do NOT end every response with a question.

Most responses should simply express an opinion naturally.

5. Avoid repeating ideas already discussed unless you are challenging them.

6. Never copy previous responses.

7. Use different openings every time.

Avoid repeating:
- Wait, but...
- Honestly...
- See, what happens is...

Instead naturally vary openings like:
- I agree...
- I see your point...
- Another perspective is...
- Let's consider...
- In my opinion...
- From a student's perspective...
- I'd like to add...
- One thing we haven't discussed...
- Can I challenge that idea?

8. Keep it conversational.

- 1–2 sentences
- 15–30 words
- Natural spoken English
- Sound like a real college student
Use contractions naturally.

Examples:

I'm
I'd
We've
It's
Don't
Can't

Occasionally hesitate naturally.

Examples:

"I think..."
"Maybe..."
"I'm not completely sure..."
"Personally..."
- Don't sound like AI

Never reuse phrases from the previous response.

Avoid copying words or sentence structures from other participants.

Express the same idea differently if necessary.

9. If the previous speaker is the USER, treat the user as a real GD participant. Respond naturally to the user's point when appropriate. You may agree, disagree, challenge the point, ask a follow-up question, or build on it. Do not always directly address the user; continue the discussion naturally when appropriate.

=========================
OUTPUT
=========================

Return ONLY valid JSON.

{
  "name":"${speaker.name}",
  "message":"..."
}`;

        let reply;

try {

    const replyText = await askGroq(prompt);
    console.log("Groq Reply:", replyText);

    reply = extractJson(replyText);

}
catch (err) {

    console.error("=========== GROQ ERROR ===========");
    console.dir(err, { depth: null });
    console.error("==================================");

    reply = {
        name: speaker.name,
        message: "Sorry, I couldn't generate a response."
    };

}

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
                speakSeconds: Number(t.speakSeconds) || 0
            }));

        const result = await buildFeedback({
            topic: String(topic || "").slice(0, 200),
            mode: String(mode || "").slice(0, 60),
            language: String(language || "").slice(0, 40),
            participants: Array.isArray(participants)
                ? participants.slice(0, 8).map(p => ({ name: String(p && p.name || "").slice(0, 40) }))
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

    feedback

};