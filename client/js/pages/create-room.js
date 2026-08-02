// =======================================================
// Multi-Agent GD
// Create Discussion Page
// =======================================================

document.addEventListener("DOMContentLoaded", () => {

    // ============================================
    // DOM Elements
    // ============================================

    const customTopic = document.getElementById("custom-topic");

    const topic = document.getElementById("topic");

    const mode = document.getElementById("mode");

    const language = document.getElementById("language");

    const duration = document.getElementById("duration");

    const aiCount = document.getElementById("ai-count");

    const aiContainer = document.getElementById("ai-container");

    const startDiscussionBtn =
        document.getElementById("start-discussion");

    const errorMessage =
        document.getElementById("error-message");



    // ============================================
    // Summary Elements
    // ============================================

    const summaryTopic =
        document.getElementById("summary-topic");

    const summaryMode =
        document.getElementById("summary-mode");

    const summaryLanguage =
        document.getElementById("summary-language");

    const summaryDuration =
        document.getElementById("summary-duration");

    const summaryAiCount =
        document.getElementById("summary-ai-count");

    const summaryAiNames =
        document.getElementById("summary-ai-names");

    const estimatedTurns =
        document.getElementById("estimated-turns");



    // ============================================
    // Avatar Images
    // ============================================

    const maleAvatars = [

        "../assets/images/male1.png",

        "../assets/images/male2.png",

        "../assets/images/male3.png"

    ];

    const femaleAvatars = [

        "../assets/images/female1.png",

        "../assets/images/female2.png",

        "../assets/images/female3.png"

    ];



    // ============================================
    // AI Personalities
    // ============================================

    const personalities = [

        "Friendly",

        "Logical",

        "Aggressive",

        "Calm",

        "Curious",

        "Supportive"

    ];



    // ============================================
    // Speaking Styles
    // ============================================

    const speakingStyles = [

        "Professional",

        "Formal",

        "Casual",

        "Detailed",

        "Concise"

    ];



    // ============================================
    // Generate One AI Card
    // ============================================

    function createAiCard(index) {

        return `

        <div class="ai-card">

            <img
                class="ai-avatar"
                src="${maleAvatars[index % 3]}"
                alt="AI Avatar">

            <h3>

                AI Participant ${index + 1}

            </h3>

            <label>Name</label>

            <input
                type="text"
                class="ai-name"
                placeholder="Enter AI Name">

            <label>Gender</label>

            <select class="ai-gender">

                <option value="Male">

                    Male

                </option>

                <option value="Female">

                    Female

                </option>

            </select>

            <label>Personality</label>

            <select class="ai-personality">

                ${personalities.map(personality =>

                    `<option>${personality}</option>`

                ).join("")}

            </select>

            <label>Speaking Style</label>

            <select class="ai-style">

                ${speakingStyles.map(style =>

                    `<option>${style}</option>`

                ).join("")}

            </select>

        </div>

        `;

    }



    // ============================================
    // Generate All AI Cards
    // ============================================

    function renderAiCards() {

        aiContainer.innerHTML = "";

        const totalAi = Number(aiCount.value);

        for(let i = 0; i < totalAi; i++){

            aiContainer.innerHTML += createAiCard(i);

        }

    }



    // ============================================
    // Initial Render
    // ============================================

    renderAiCards();


        // ============================================
    // Update Discussion Summary
    // ============================================

    function updateSummary() {

        // Topic

        if (customTopic.value.trim() !== "") {

            summaryTopic.textContent = customTopic.value.trim();

        }

        else if (topic.value !== "") {

            summaryTopic.textContent = topic.value;

        }

        else {

            summaryTopic.textContent = "Not Selected";

        }

        // Mode

        summaryMode.textContent = mode.value;

        // Language

        summaryLanguage.textContent = language.value;

        // Duration

        summaryDuration.textContent =
            duration.value + " Minutes";

        // AI Count

        summaryAiCount.textContent =
            aiCount.value + " Participants";

        // Estimated Turns

        const turns = Number(duration.value) * 2 + Number(aiCount.value) * 3;

        estimatedTurns.textContent =
            turns + " Turns";

        // AI Names

        const aiNames = document.querySelectorAll(".ai-name");

        const names = [];

        aiNames.forEach((input, index) => {

            if (input.value.trim() === "") {

                names.push("AI " + (index + 1));

            }

            else {

                names.push(input.value.trim());

            }

        });

        if(summaryAiNames){

            summaryAiNames.textContent = names.join(", ");

        }

    }



    // ============================================
    // Update Avatar When Gender Changes
    // ============================================

    function updateAvatars() {

        const genderSelects =
            document.querySelectorAll(".ai-gender");

        const avatars =
            document.querySelectorAll(".ai-avatar");

        genderSelects.forEach((gender, index) => {

            gender.addEventListener("change", () => {

                if(gender.value === "Male"){

                    avatars[index].src =
                        maleAvatars[index % maleAvatars.length];

                }

                else{

                    avatars[index].src =
                        femaleAvatars[index % femaleAvatars.length];

                }

            });

        });

    }



    // ============================================
    // Attach Events to AI Cards
    // ============================================

    function attachAiEvents() {

        document.querySelectorAll(".ai-name")
            .forEach(input => {

                input.addEventListener("input", updateSummary);

            });

        updateAvatars();

    }



    // ============================================
    // AI Count Change
    // ============================================

    aiCount.addEventListener("change", () => {

        renderAiCards();

        attachAiEvents();

        updateSummary();

    });



    // ============================================
    // Discussion Setting Events
    // ============================================

    customTopic.addEventListener("input", updateSummary);

    topic.addEventListener("change", updateSummary);

    mode.addEventListener("change", updateSummary);

    language.addEventListener("change", updateSummary);

    duration.addEventListener("change", updateSummary);



    // ============================================
    // Initial Setup
    // ============================================

    attachAiEvents();

    updateSummary();

        // ============================================
    // Validation
    // ============================================

    function showError(message){

        if(errorMessage){

            errorMessage.textContent = message;

        }

    }

    function clearError(){

        if(errorMessage){

            errorMessage.textContent = "";

        }

    }



    // ============================================
    // Collect AI Data
    // ============================================

    function getAiParticipants(){

        const aiCards = document.querySelectorAll(".ai-card");

        const participants = [];

        aiCards.forEach((card,index)=>{

            const avatar =
                card.querySelector(".ai-avatar").src;

            const name =
                card.querySelector(".ai-name").value.trim();

            const gender =
                card.querySelector(".ai-gender").value;

            const personality =
                card.querySelector(".ai-personality").value;

            const speakingStyle =
                card.querySelector(".ai-style").value;

            participants.push({

                id:index+1,

                name:
                    name === ""
                    ? `AI ${index+1}`
                    : name,

                avatar,

                gender,

                personality,

                speakingStyle

            });

        });

        return participants;

    }



    // ============================================
    // Save Discussion Configuration
    // ============================================

    function saveDiscussion(){

        const finalTopic =

            customTopic.value.trim() !== ""

            ? customTopic.value.trim()

            : topic.value;

        const discussion = {

            topic:finalTopic,

            mode:mode.value,

            language:language.value,

            duration:Number(duration.value),

            aiCount:Number(aiCount.value),

            estimatedTurns:
                Number(duration.value) * 2 +
                Number(aiCount.value) * 3,

            participants:getAiParticipants()

        };

        localStorage.setItem(

            "discussionConfig",

            JSON.stringify(discussion)

        );

    }



    // ============================================
    // Validate Form
    // ============================================

    function validateDiscussion(){

        clearError();

        const finalTopic =

            customTopic.value.trim() ||

            topic.value;

        if(finalTopic===""){

            showError(

                "Please enter or select a discussion topic."

            );

            return false;

        }

        const aiCards =

            document.querySelectorAll(".ai-card");

        for(const card of aiCards){

            const name =

                card.querySelector(".ai-name")
                .value
                .trim();

            if(name===""){

                showError(

                    "Please give every AI participant a name."

                );

                return false;

            }

        }

        return true;

    }

        // ============================================
    // Start Discussion
    // ============================================

    startDiscussionBtn.addEventListener("click", () => {

        if (!validateDiscussion()) {

            return;

        }

        saveDiscussion();

        window.location.href = "discussion.html";

    });



    // ============================================
    // Restore Previous Configuration (Optional)
    // ============================================

    function loadPreviousConfiguration() {

        const savedData = JSON.parse(

            localStorage.getItem("discussionConfig")

        );

        if (!savedData) {

            return;

        }

        // Discussion Settings

        customTopic.value = savedData.topic || "";

        mode.value = savedData.mode || "Placement GD";

        language.value = savedData.language || "English";

        duration.value = savedData.duration || "10";

        aiCount.value = savedData.aiCount || 2;

        // Generate AI Cards

        renderAiCards();

        const aiCards = document.querySelectorAll(".ai-card");

        savedData.participants.forEach((participant, index) => {

            if (!aiCards[index]) return;

            aiCards[index].querySelector(".ai-name").value =
                participant.name;

            aiCards[index].querySelector(".ai-gender").value =
                participant.gender;

            aiCards[index].querySelector(".ai-personality").value =
                participant.personality;

            aiCards[index].querySelector(".ai-style").value =
                participant.speakingStyle;

            aiCards[index].querySelector(".ai-avatar").src =
                participant.avatar;

        });

        attachAiEvents();

        updateSummary();

    }



    // ============================================
    // Initialize Page
    // ============================================

    loadPreviousConfiguration();

    attachAiEvents();

    updateSummary();

});