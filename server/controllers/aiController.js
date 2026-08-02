const { askGemini } = require("../services/geminiService");

async function generateDiscussion(req, res) {

    try {

        const {

            topic,
            mode,
            language,
            duration,
            participants

        } = req.body;

        let prompt = `
You are simulating a realistic Group Discussion.

Topic:
${topic}

Mode:
${mode}

Language:
${language}

Discussion Duration:
${duration} minutes

Participants:
${JSON.stringify(participants)}

Rules:

- Start the discussion naturally.
- Every participant has a unique personality.
- Respond only as ONE participant.
- Output JSON only.

Format:

{
"name":"",
"message":""
}
`;

        const result = await askGemini(prompt);

        res.json({

            success: true,
            response: result

        });

    }

    catch (err) {

        res.status(500).json({

            success: false,
            message: err.message

        });

    }

}

module.exports = {
    generateDiscussion
};