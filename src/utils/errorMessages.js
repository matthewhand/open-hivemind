// errorMessages.js
const errorMessages = [
    "Oops, I tripped over my own code! 🤖",
    "Whoa, I got a bit tangled in my wires there. 🌐",
    "Ah, my circuits are in a twist! 🔧",
    "Looks like I zapped the wrong bytes! ⚡",
    "Yikes, I think I just had a code hiccup. 🤖🤧"
];

// Function to get a random error message
function getRandomErrorMessage() {
    const randomIndex = Math.floor(Math.random() * errorMessages.length);
    return errorMessages[randomIndex];
}

module.exports = getRandomErrorMessage;
