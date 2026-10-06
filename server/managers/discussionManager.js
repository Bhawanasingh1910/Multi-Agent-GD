const discussions = new Map();

function createDiscussion(id, data) {

    console.log("CREATING:", id);

    discussions.set(id, {
        id,
        topic: data.topic,
        mode: data.mode,
        language: data.language,
        duration: data.duration,
        participants: data.participants,
        conversation: [],
        currentSpeaker: 0
    });

    console.log("NOW IDS:", [...discussions.keys()]);
}

function getDiscussion(id) {

    console.log("LOOKING FOR:", id);
    console.log("ALL IDS:", [...discussions.keys()]);

    return discussions.get(id);
}

function addMessage(id, message) {
    const discussion = discussions.get(id);

    if (!discussion) return;

    discussion.conversation.push(message);
}

function getWeight(personality) {

    switch (personality) {

        case "Aggressive":
            return 5;

        case "Curious":
            return 4;

        case "Friendly":
            return 3;

        case "Logical":
            return 3;

        case "Supportive":
            return 2;

        case "Calm":
            return 2;

        default:
            return 3;
    }
}

function nextSpeaker(id) {

    const discussion = discussions.get(id);

    if (!discussion) return null;

    const participants = discussion.participants;

    let candidates = participants.filter(
        (_, index) => index !== discussion.currentSpeaker
    );

    // Only one AI participant: it keeps speaking after the user
    if (candidates.length === 0) candidates = participants;

    const totalWeight = candidates.reduce(
        (sum, p) => sum + getWeight(p.personality),
        0
    );

    let random = Math.random() * totalWeight;

    let chosen = candidates[0];

    for (const participant of candidates) {

        random -= getWeight(participant.personality);

        if (random <= 0) {
            chosen = participant;
            break;
        }
    }

    discussion.currentSpeaker = participants.findIndex(
        p => p.id === chosen.id
    );

    return chosen;
}

module.exports = {
    createDiscussion,
    getDiscussion,
    addMessage,
    nextSpeaker
};