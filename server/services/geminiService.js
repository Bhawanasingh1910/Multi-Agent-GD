require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

async function askGemini(prompt) {

    try {

        console.log("Calling Gemini...");

        const response = await ai.models.generateContent({
            model: "gemini-3.6-flash",
            contents: prompt
        });

        console.log("Gemini Success");
        console.dir(response, { depth: null });

        let text = response.text.trim();

        text = text.replace(/```json/g, "");
        text = text.replace(/```/g, "");

        return text.trim();

    } catch (err) {

    if (err.status === 429) {
        console.log("Rate limit reached. Waiting 20 seconds...");

        await new Promise(r => setTimeout(r, 20000));

        return askGemini(prompt);
    }

    throw err;
}
}

module.exports = { askGemini };