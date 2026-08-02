require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

async function main() {

    const interaction = await ai.interactions.create({

        model: "gemini-3.6-flash",

        input: "Say Hello"

    });

    console.log(interaction.output_text);

}

main();