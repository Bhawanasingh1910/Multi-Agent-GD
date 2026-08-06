require("dotenv").config();

const Groq = require("groq-sdk");

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

async function askGroq(prompt) {

    const completion = await groq.chat.completions.create({

        model: "openai/gpt-oss-20b",

        messages: [
            {
                role: "user",
                content: prompt
            }
        ],

        temperature: 0.8,
        max_tokens: 150
    });

    return completion.choices[0].message.content;
}

module.exports = { askGroq };