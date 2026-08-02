require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

async function askGemini(prompt) {

    try {

        const interaction = await ai.interactions.create({

            model: "gemini-3.6-flash",

            input: prompt

        });

        return interaction.output_text;

    }

    catch (error) {

        console.error(error);

        throw error;

    }

}

module.exports = {
    askGemini
};