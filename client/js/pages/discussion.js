// =======================================
// Discussion Page
// =======================================

const config = JSON.parse(localStorage.getItem("discussionConfig") || "null");
const session = JSON.parse(localStorage.getItem("discussionSession") || "null");

// No login or no discussion in progress -> go back instead of crashing
if (!Store.getUser() || !config || !session || !session.discussionId || !session.response) {

    window.location.replace(Store.getUser() ? "create-room.html" : "auth.html");

    throw new Error("No active discussion - redirecting");
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// Language used for speech recognition and the AI voices
const SPEECH_LANG = { English: "en-IN", Hindi: "hi-IN", Hinglish: "en-IN" }[config.language] || "en-IN";

const meetingGrid = document.getElementById("meeting-grid");
const transcriptBody = document.getElementById("transcript-body");
const transcriptPanel = document.getElementById("transcript-panel");
const discussionRoom = document.getElementById("discussion-room");

const topic = document.getElementById("discussion-topic");
const mode = document.getElementById("discussion-mode");
const language = document.getElementById("discussion-language");

const micBtn = document.getElementById("mic-btn");
const pauseBtn = document.getElementById("pause-btn");
const resumeBtn = document.getElementById("resume-btn");
const endBtn = document.getElementById("end-btn");
const leaveBtn = document.getElementById("leave-btn");
const toggleTranscriptBtn = document.getElementById("toggle-transcript-btn");

topic.textContent = config.topic;
mode.textContent = config.mode;
language.textContent = config.language;
const timer = document.getElementById("discussion-timer");

// =======================================
// Discussion State
// =======================================

let paused = false;
let ended = false;
let discussionRunning = true;

let seconds = 0;
let pausedSeconds = 0;

// Everything said, saved to history when the discussion ends
const record = {
    id: session.discussionId,
    topic: config.topic,
    mode: config.mode,
    language: config.language,
    duration: Number(config.duration) || 0,
    participants: config.participants.map(p => ({
        name: p.name,
        gender: p.gender,
        personality: p.personality,
        speakingStyle: p.speakingStyle
    })),
    startedAt: new Date().toISOString(),
    endedAt: null,
    elapsedSeconds: 0,
    pausedSeconds: 0,
    transcript: [],
    feedback: null
};

function logLine(speaker, text, isUser, speakSeconds, timed) {

    record.transcript.push({
        speaker,
        text,
        isUser: !!isUser,
        speakSeconds: speakSeconds || 0,
        // true only when the speaking time was really measured (used for pace)
        timed: !!timed
    });
}

// =======================================
// Timer (stops while paused, ends the GD at the chosen duration)
// =======================================

setInterval(() => {

    if (ended) return;

    if (paused) {

        pausedSeconds++;

        return;
    }

    seconds++;

    timer.textContent = Store.mmss(seconds);

    if (record.duration && seconds >= record.duration * 60) {

        alert("Time is up! Preparing your feedback.");

        endDiscussion(true);
    }

}, 1000);

// =======================================
// Create AI Card
// =======================================

function createCard(participant) {

    return `
    <div class="participant-card listening" id="card-${participant.id}">

        <img src="${participant.avatar}" alt="Avatar">

        <div class="participant-name">
            ${Store.esc(participant.name)}
        </div>

        <div class="participant-personality">
            ${Store.esc(participant.personality)}
        </div>

        <div class="participant-style">
            ${Store.esc(participant.speakingStyle)}
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

<div class="participant-card user-card" id="user-card">

    <img src="../assets/images/default.png">

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

const userCard = document.getElementById("user-card");

// =======================================
// First AI Message
// =======================================


const first = session.response;

// =======================================
// Speak Text
// =======================================

async function speak(participant, text) {

    participant = participant || {};

    return new Promise((resolve) => {

        speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

       const voices = speechSynthesis.getVoices();

let voice;

if (SPEECH_LANG === "hi-IN") {

    // Hindi voices
    const hindi = voices.filter(v => /^hi/i.test(v.lang || ""));

    voice = participant.gender === "Female"
        ? hindi.find(v => v.name.includes("Swara")) || hindi[0]
        : hindi.find(v => v.name.includes("Madhur")) || hindi[0];

}
else if (participant.gender === "Female") {

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

if (voice) utterance.voice = voice;
utterance.lang = SPEECH_LANG;

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

        // Resolve on end AND on error (a cancelled utterance must not hang the loop)
        utterance.onend = resolve;
        utterance.onerror = resolve;

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
        <div class="speaker-name">${Store.esc(name)}</div>
        <div class="speaker-text"></div>
    `;

    transcriptBody.appendChild(wrapper);

    const textDiv = wrapper.querySelector(".speaker-text");

    const words = message.split(" ");

    for (let i = 0; i < words.length; i++) {

        // Hold the text while the discussion is paused
        while (paused && !ended) await sleep(100);

        textDiv.textContent += words[i] + " ";

        transcriptBody.scrollTop = transcriptBody.scrollHeight;

        await sleep(100);

    }

}


// =======================================
// Highlight Current Speaker
// =======================================

function highlightSpeaker(name){

    document.querySelectorAll(".participant-card").forEach(card=>{

        // The user's card is managed by the mic code
        if (card.classList.contains("user-card")) return;

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

    if (!card) return;

    card.classList.remove("listening");

    card.classList.add("speaking");

    card.querySelector(".participant-status").textContent="Speaking";

}

// =======================================
// User Participation (mic)
// =======================================

const SpeechRecognitionAPI =
    window.SpeechRecognition || window.webkitSpeechRecognition;

// True from mic click until the user's message is saved (or discarded).
// While true, nextTurn() does nothing, so the discussion loop's next
// tick after this is the single AI turn that sees the user's message.
let userTurnActive = false;
let recognition = null;

// A mic click that arrives while an AI is still talking is queued and
// starts listening as soon as that AI finishes (so the AI's voice is
// never recorded and the click is not lost).
let micQueued = false;
let aiTurnBusy = false;

function setUserStatus(text) {

    const status = userCard.querySelector(".participant-status");

    if (status) status.textContent = text;
}

// state: idle | queued | listening | sending
function setMicUi(state) {

    micBtn.classList.toggle("listening", state === "listening");
    micBtn.classList.toggle("queued", state === "queued");

    userCard.classList.toggle("speaking", state === "listening");

    const labels = {
        idle: "Ready",
        queued: "Your turn is next...",
        listening: "Listening... speak now",
        sending: "Sending..."
    };

    const tips = {
        idle: "Click to speak",
        queued: "Waiting for the AI to finish",
        listening: "Click again when you are done",
        sending: "Sending your message"
    };

    setUserStatus(labels[state]);

    micBtn.title = tips[state];
}

setMicUi("idle");

function startQueuedMic() {

    if (!micQueued) return;

    micQueued = false;

    startListening();
}

// How long you can pause before your turn counts as finished.
// Clicking the mic again always ends your turn immediately.
const END_OF_TURN_SILENCE_MS = 4000;

async function sendUserMessage(text, speakSeconds, timed) {

    // Transcript first, then the existing userMessage endpoint
    const typing = typeTranscript("You", text);

    try {

        const result = await apiPost("/api/ai/discussion/user", {
            discussionId: session.discussionId,
            message: text
        });

        if (!result.success) {
            throw new Error(result.message || "User message failed");
        }

        logLine("You", text, true, speakSeconds, timed);

    }

    catch (err) {

        console.error(err);
        alert("Your message could not be sent: " + err.message);

    }

    finally {

        await typing;

        userTurnActive = false;

        setMicUi("idle");

    }
}

// Set when the user (or the silence timer) ends the turn on purpose
let stopRequested = false;

function startListening() {

    let finalText = "";
    let heardNothing = false;
    let fatalError = false;
    let restarts = 0;

    // Real speaking time = first speech started -> last speech ended
    let firstSpeechAt = 0;
    let lastSpeechEndAt = 0;
    let lastResultAt = 0;

    let silenceTimer = null;

    stopRequested = false;

    setMicUi("listening");

    const rec = new SpeechRecognitionAPI();

    recognition = rec;

    rec.lang = SPEECH_LANG;
    // Keep listening through pauses: one answer can have several sentences
    rec.continuous = true;
    rec.interimResults = true;

    const armSilenceTimer = () => {

        clearTimeout(silenceTimer);

        // Only after the user has actually said something
        if (!finalText.trim()) return;

        silenceTimer = setTimeout(() => {

            stopRequested = true;

            try { rec.stop(); } catch { /* already stopped */ }

        }, END_OF_TURN_SILENCE_MS);
    };

    rec.onspeechstart = () => {

        if (!firstSpeechAt) firstSpeechAt = Date.now();

        clearTimeout(silenceTimer);
    };

    rec.onspeechend = () => {

        lastSpeechEndAt = Date.now();

        armSilenceTimer();
    };

    rec.onresult = (e) => {

        let interim = "";

        for (let i = e.resultIndex; i < e.results.length; i++) {

            if (e.results[i].isFinal) {

                finalText += e.results[i][0].transcript + " ";

                lastResultAt = Date.now();

            }

            else {

                interim += e.results[i][0].transcript;
            }
        }

        if (!firstSpeechAt) firstSpeechAt = Date.now();

        clearTimeout(silenceTimer);

        // Show what is being heard so the user knows it works
        const heard = (finalText + interim).trim();

        if (heard) setUserStatus("Listening: ..." + heard.slice(-45));

        if (!interim) armSilenceTimer();
    };

    rec.onerror = (e) => {

        console.error("Speech recognition error:", e.error);

        const messages = {
            "not-allowed": "Microphone access is blocked. Click the lock icon in the address bar, allow the microphone, then try again.",
            "service-not-allowed": "Microphone access is blocked. Click the lock icon in the address bar, allow the microphone, then try again.",
            "audio-capture": "No microphone was found. Please connect one and try again.",
            "network": "Speech recognition needs an internet connection (the browser sends your audio to its speech service)."
        };

        if (e.error === "no-speech") heardNothing = true;

        if (messages[e.error]) {

            fatalError = true;

            alert(messages[e.error]);
        }
    };

    // Browsers end a session after a long silence even in continuous mode.
    // Keep listening until the user's turn is really over.
    rec.onend = () => {

        if (!stopRequested && !fatalError && !ended && restarts < 30 && recognition === rec) {

            restarts++;

            try {

                rec.start();

                return;

            }

            catch { /* fall through and finish */ }
        }

        clearTimeout(silenceTimer);

        recognition = null;

        // Discussion already ended (End / Leave / time up): drop the rest
        if (ended) return;

        const text = finalText.trim();

        // Empty speech is never submitted
        if (!text) {

            userTurnActive = false;

            setMicUi("idle");

            if (heardNothing) {

                setUserStatus("Didn't hear you. Try again.");

                setTimeout(() => {

                    if (!userTurnActive) setUserStatus("Ready");

                }, 2500);
            }

            return;
        }

        // Measured speaking time. If the browser gave no speech start/end
        // events, say "not measured" instead of guessing from mic-open time.
        const speechEnd = lastSpeechEndAt > firstSpeechAt ? lastSpeechEndAt : lastResultAt - 700;

        const seconds = firstSpeechAt && speechEnd > firstSpeechAt
            ? (speechEnd - firstSpeechAt) / 1000
            : 0;

        const timed = seconds >= 2;

        setMicUi("sending");

        sendUserMessage(text, timed ? seconds : 0, timed);
    };

    try {

        rec.start();

    }

    catch (err) {

        console.error(err);

        recognition = null;
        userTurnActive = false;

        setMicUi("idle");
    }
}

micBtn.addEventListener("click", () => {

    if (ended) return;

    // Second click while listening = finished speaking
    if (recognition) {

        stopRequested = true;

        recognition.stop();

        return;
    }

    // Already queued or sending a message
    if (userTurnActive) return;

    if (!SpeechRecognitionAPI) {

        alert("Speech recognition is not supported in this browser. Please use Chrome or Edge.");

        return;
    }

    if (paused) {

        setUserStatus("Resume the discussion first");

        setTimeout(() => {

            if (!userTurnActive) setUserStatus("Ready");

        }, 2000);

        return;
    }

    // Pauses new AI turns from now on
    userTurnActive = true;

    // An AI is talking (or its reply is loading): wait for it to finish
    if (aiTurnBusy || speechSynthesis.speaking) {

        micQueued = true;

        setMicUi("queued");

        return;
    }

    startListening();
});

// =======================================
// Next AI Turn
// =======================================

// Stop the loop (instead of alerting forever) if the server keeps failing
let failures = 0;

function turnFailed(message) {

    failures++;

    console.error("Turn failed:", message);

    if (failures >= 3 && discussionRunning) {

        discussionRunning = false;

        alert("The discussion stopped because the server is not responding (" + message + "). " +
              "Make sure the server is running, then start a new discussion.");
    }
}

async function nextTurn() {

    if (speechSynthesis.speaking || userTurnActive || paused || ended) {
        return;
    }

    aiTurnBusy = true;

    try {

        console.log("Calling nextTurn...");

        const result = await apiPost("/api/ai/discussion/next", {
            discussionId: session.discussionId
        });

        if (!result.success) {

            turnFailed(result.message || "request failed");

            return;
        }

        failures = 0;

        const data = result.response;

        // Wait out a pause; drop the reply if the discussion ended meanwhile
        while (paused && !ended) await sleep(100);

        if (ended) return;

        highlightSpeaker(data.name);

        const participant = config.participants.find(
            p => p.name.trim() === data.name.trim()
        );

        logLine(data.name, data.message, false, 0);

        await Promise.all([
            typeTranscript(data.name, data.message),
            speak(participant, data.message)
        ]);


    }

    catch (err) {

        turnFailed(err.message);

    }

    finally {

        aiTurnBusy = false;

        startQueuedMic();

    }

}

// =======================================
// Controls: pause / resume / transcript / end / leave
// =======================================

resumeBtn.style.display = "none";

pauseBtn.addEventListener("click", () => {

    if (ended || paused) return;

    paused = true;

    speechSynthesis.pause();

    pauseBtn.style.display = "none";
    resumeBtn.style.display = "";

});

resumeBtn.addEventListener("click", () => {

    if (ended || !paused) return;

    paused = false;

    speechSynthesis.resume();

    resumeBtn.style.display = "none";
    pauseBtn.style.display = "";

});

toggleTranscriptBtn.addEventListener("click", () => {

    const hidden = transcriptPanel.style.display === "none";

    transcriptPanel.style.display = hidden ? "" : "none";

    // Let the participants use the full width while the transcript is hidden
    discussionRoom.style.gridTemplateColumns = hidden ? "" : "1fr";

});

function stopEverything() {

    ended = true;
    discussionRunning = false;

    speechSynthesis.cancel();

    if (recognition) recognition.abort();
}

// End: save the session and open the feedback page
function endDiscussion(auto) {

    if (ended) return;

    if (!auto && !confirm("End the discussion and get your feedback?")) return;

    stopEverything();

    record.endedAt = new Date().toISOString();
    record.elapsedSeconds = seconds;
    record.pausedSeconds = pausedSeconds;

    Store.upsertSession(record);

    window.location.href = "feedback.html?id=" + encodeURIComponent(record.id);
}

// Leave: discard this discussion and go back to the dashboard
function leaveDiscussion() {

    if (ended) return;

    if (!confirm("Leave this discussion? It will not be saved and no feedback will be created.")) return;

    stopEverything();

    window.location.href = "dashboard.html";
}

endBtn.addEventListener("click", () => endDiscussion(false));

leaveBtn.addEventListener("click", leaveDiscussion);

window.addEventListener("beforeunload", () => speechSynthesis.cancel());

// =======================================
// Start Discussion
// =======================================

async function discussionLoop() {

    while (discussionRunning) {

        // Random delay between speakers
        const delay = 1500 + Math.random() * 1000;

        await sleep(delay);

        await nextTurn();
    }
}

async function startDiscussion() {

    const firstParticipant = config.participants.find(
        p => p.name.trim() === first.name.trim()
    );

    highlightSpeaker(first.name);

    logLine(first.name, first.message, false, 0);

    aiTurnBusy = true;

    await Promise.all([
        typeTranscript(first.name, first.message),
        speak(firstParticipant, first.message)
    ]);

    aiTurnBusy = false;

    startQueuedMic();

    // Start continuous discussion
    discussionLoop();
}

startDiscussion();
