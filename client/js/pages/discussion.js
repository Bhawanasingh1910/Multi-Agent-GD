// =======================================
// Discussion Page
// =======================================

const config = JSON.parse(localStorage.getItem("discussionConfig"));
const session = JSON.parse(localStorage.getItem("discussionSession"));
console.log(session);
console.log(session.discussionId);

const meetingGrid = document.getElementById("meeting-grid");
const transcriptBody = document.getElementById("transcript-body");

const topic = document.getElementById("discussion-topic");
const mode = document.getElementById("discussion-mode");
const language = document.getElementById("discussion-language");

topic.textContent = config.topic;
mode.textContent = config.mode;
language.textContent = config.language;
const timer = document.getElementById("discussion-timer");

let seconds = 0;

setInterval(() => {

    seconds++;

    const min = String(Math.floor(seconds / 60)).padStart(2, "0");
    const sec = String(seconds % 60).padStart(2, "0");

    timer.textContent = `${min}:${sec}`;

}, 1000);

// =======================================
// Create AI Card
// =======================================

function createCard(participant) {

    return `
    <div class="participant-card listening" id="card-${participant.id}">

        <img src="${participant.avatar}" alt="Avatar">

        <div class="participant-name">
            ${participant.name}
        </div>

        <div class="participant-personality">
            ${participant.personality}
        </div>

        <div class="participant-style">
            ${participant.speakingStyle}
        </div>

        <div class="participant-status">
            Listening
        </div>

        <div class="voice-bars">

            <span></span>
            <span></span>
            <span></span>
            <span></span>

        </div>

    </div>
    `;
}

// =======================================
// Render AI
// =======================================

config.participants.forEach(ai => {

    meetingGrid.innerHTML += createCard(ai);

});

// =======================================
// User Card
// =======================================

meetingGrid.innerHTML += `

<div class="participant-card user-card">

    <img src="../assets/images/default-profile.png">

    <div class="participant-name">

        You

    </div>

    <div class="participant-personality">

        User

    </div>

    <div class="participant-style">

        Speaker

    </div>

    <div class="participant-status">

        Ready

    </div>

</div>

`;

// =======================================
// First AI Message
// =======================================


const first = session.response;

// =======================================
// Speak Text
// =======================================

async function speak(participant, text) {
    console.log("Speaking participant:", participant);
    console.log("Text:", text);

    return new Promise((resolve) => {

        speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

       const voices = speechSynthesis.getVoices();

let voice;

if (participant.gender === "Female") {

    voice =
        voices.find(v => v.name.includes("Neerja")) ||
        voices.find(v => v.name.includes("Emma")) ||
        voices.find(v => v.name.includes("Ava"));

}
else{

    voice =
        voices.find(v => v.name.includes("Prabhat")) ||
        voices.find(v => v.name.includes("Brian")) ||
        voices.find(v => v.name.includes("Andrew"));

}

utterance.voice = voice;
utterance.lang = "en-IN";

        // Speaking Style
        switch (participant.speakingStyle) {

            case "Concise":
                utterance.rate = 1.15;
                break;

            case "Detailed":
                utterance.rate = 0.85;
                break;

            case "Professional":
                utterance.rate = 0.95;
                break;

            default:
                utterance.rate = 1;
        }

        // Personality
        switch (participant.personality) {

            case "Aggressive":
                utterance.pitch = 0.8;
                break;

            case "Friendly":
                utterance.pitch = 1.3;
                break;

            case "Calm":
                utterance.pitch = 0.9;
                break;

            default:
                utterance.pitch = 1;
        }

        utterance.onend = resolve;

        speechSynthesis.speak(utterance);

    });

}

// =======================================
// Add Transcript
// =======================================

async function typeTranscript(name, message) {

    const wrapper = document.createElement("div");

    wrapper.className = "transcript-message";

    wrapper.innerHTML = `
        <div class="speaker-name">${name}</div>
        <div class="speaker-text"></div>
    `;

    transcriptBody.appendChild(wrapper);

    const textDiv = wrapper.querySelector(".speaker-text");

    const words = message.split(" ");

    for (let i = 0; i < words.length; i++) {

        textDiv.innerHTML += words[i] + " ";

        transcriptBody.scrollTop = transcriptBody.scrollHeight;

        await new Promise(r => setTimeout(r, 100));

    }

}


// =======================================
// Highlight Current Speaker
// =======================================

function highlightSpeaker(name){

    document.querySelectorAll(".participant-card").forEach(card=>{

        card.classList.remove("speaking");

        card.classList.add("listening");

        const status = card.querySelector(".participant-status");

        if(status){

            status.textContent="Listening";

        }

    });

    const participant = config.participants.find(

        p=>p.name===name

    );

    if(!participant) return;

    const card = document.getElementById(

        `card-${participant.id}`

    );

    card.classList.remove("listening");

    card.classList.add("speaking");

    card.querySelector(".participant-status").textContent="Speaking";

}

// =======================================
// User Participation (mic)
// =======================================

const micBtn = document.getElementById("mic-btn");
const SpeechRecognitionAPI =
    window.SpeechRecognition || window.webkitSpeechRecognition;

// True from mic start until the user's message is saved (or discarded).
// While true, nextTurn() does nothing, so the discussion loop's next
// tick after this is the single AI turn that sees the user's message.
let userTurnActive = false;
let recognition = null;

// A mic click that arrives while an AI is still talking is queued and
// starts listening as soon as that AI finishes (so the AI's voice is
// never recorded and the click isn't lost).
let micQueued = false;
let aiTurnBusy = false;

function startQueuedMic() {

    if (!micQueued) return;

    micQueued = false;

    startListening();
}

async function sendUserMessage(text) {

    // Transcript first, then the existing userMessage endpoint
    typeTranscript("You", text);

    try {

        const response = await fetch(

            "http://localhost:5000/api/ai/discussion/user",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    discussionId: session.discussionId,
                    message: text
                })
            }
        );

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message || "User message failed");
        }

    }

    catch (err) {

        console.error(err);
        alert("Your message could not be sent: " + err.message);

    }

    finally {

        userTurnActive = false;

    }
}

function startListening() {

    let finalText = "";

    recognition = new SpeechRecognitionAPI();
    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (e) => {

        for (let i = e.resultIndex; i < e.results.length; i++) {

            if (e.results[i].isFinal) {
                finalText += e.results[i][0].transcript + " ";
            }
        }
    };

    recognition.onerror = (e) => {

        console.error("Speech recognition error:", e.error);
    };

    // onend fires exactly once per session -> one message per speech
    recognition.onend = () => {

        recognition = null;

        const text = finalText.trim();

        // Empty speech is never submitted
        if (!text) {

            userTurnActive = false;

            return;
        }

        sendUserMessage(text);
    };

    try {

        recognition.start();

    }

    catch (err) {

        console.error(err);

        recognition = null;
        userTurnActive = false;
    }
}

micBtn.addEventListener("click", () => {

    // Second click while listening = finished speaking
    if (recognition) {

        recognition.stop();

        return;
    }

    // Already queued or sending a message
    if (userTurnActive) return;

    if (!SpeechRecognitionAPI) {

        alert("Speech recognition is not supported in this browser. Please use Chrome or Edge.");

        return;
    }

    // Pauses new AI turns from now on
    userTurnActive = true;

    // An AI is talking (or its reply is loading): wait for it to finish
    if (aiTurnBusy || speechSynthesis.speaking) {

        micQueued = true;

        return;
    }

    startListening();
});

// =======================================
// Next AI Turn
// =======================================
async function nextTurn() {

    if (speechSynthesis.speaking || userTurnActive) {
        return;
    }

    aiTurnBusy = true;

    try {

        console.log("Calling nextTurn...");

        const response = await fetch(
            
            "http://localhost:5000/api/ai/discussion/next",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    discussionId: session.discussionId
                })
            }
        );

        const result = await response.json();

        if (!result.success) {

            console.log(result);

            return;
        }

        let data;

        try {

           data = result.response;

        }

        catch {

            console.log("Invalid Gemini JSON");
            console.log(result.response);

            return;
        }

        highlightSpeaker(data.name);

        const participant = config.participants.find(
    p => p.name.trim() === data.name.trim()
);

        await Promise.all([
            typeTranscript(data.name, data.message),
            speak(participant, data.message)
        ]);


    }

    catch (err) {

        console.error(err);
        alert(err.message);

    }

    finally {

        aiTurnBusy = false;

        startQueuedMic();

    }

}
// =======================================
// Start Discussion
// =======================================

let discussionRunning = true;

async function discussionLoop() {

    while (discussionRunning) {

        // Random delay between speakers
        const delay = 1500 + Math.random() * 1000;

        await new Promise(resolve => setTimeout(resolve, delay));

        await nextTurn();
    }
}

async function startDiscussion() {

    const firstParticipant = config.participants.find(
        p => p.name.trim() === first.name.trim()
    );

    highlightSpeaker(first.name);

    await Promise.all([
        typeTranscript(first.name, first.message),
        speak(firstParticipant, first.message)
    ]);

    startQueuedMic();

    // Start continuous discussion
    discussionLoop();
}

startDiscussion();