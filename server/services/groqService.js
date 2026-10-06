require("dotenv").config();

const Groq = require("groq-sdk");

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

// options:
//   system       - optional system message (rules / role)
//   temperature  - creativity (default 0.8; use a low value for scoring)
//   reasoning    - "low" | "medium" | "high" (default "low")
async function askGroq(prompt, maxTokens = 1024, options = {}) {

    const messages = [];

    if (options.system) {
        messages.push({ role: "system", content: options.system });
    }

    messages.push({ role: "user", content: prompt });

    const completion = await groq.chat.completions.create({

        model: "openai/gpt-oss-20b",

        messages,

        temperature: options.temperature ?? 0.8,

        // gpt-oss is a reasoning model: hidden reasoning tokens count toward
        // the limit, so a small limit leaves the visible answer EMPTY.
        reasoning_effort: options.reasoning || "low",
        max_completion_tokens: maxTokens
    });

    return completion.choices[0].message.content;
}

module.exports = { askGroq };
