require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

async function testModel(model) {

    try {

        console.log(`\nTesting: ${model}`);

        const response = await ai.models.generateContent({
            model,
            contents: "Reply with only: Hello"
        });

        console.log("✅ SUCCESS");
        console.log(response.text);

    } catch (err) {

        console.log("❌ FAILED");

        console.log("Status:", err.status);

        console.log(err.message);

    }

}

async function main() {

    await testModel("gemini-3.6-flash");
    

}

main();