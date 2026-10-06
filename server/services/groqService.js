require("dotenv").config();

const Groq = require("groq-sdk");

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

async function askGroq(prompt, maxTokens = 1024) {

    const completion = await groq.chat.completions.create({

        model: "openai/gpt-oss-20b",

        messages: [
            {
                role: "user",
                content: prompt
            }
        ],

        temperature: 0.8,

        // gpt-oss is a reasoning model: hidden reasoning tokens count toward
        // the limit, so a small limit leaves the visible answer EMPTY.
        reasoning_effort: "low",
        max_completion_tokens: maxTokens
    });

    return completion.choices[0].message.content;
}

module.exports = { askGroq };