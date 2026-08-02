require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function main() {
  const models = await ai.models.list();

  for await (const model of models) {
    if (model.supportedActions?.includes("generateContent")) {
      console.log(model.name);
    }
  }
}

main();