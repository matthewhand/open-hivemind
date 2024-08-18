function splitMessage(message, maxLength = 2000) {
    return message.match(new RegExp(`.{1,${maxLength}}(\\s|$)`, 'g')) || [];
}

function getRandomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function startTypingIndicator(channel) {
    channel.sendTyping();
    return setInterval(() => channel.sendTyping(), 15000);
}

module.exports = { splitMessage, getRandomDelay, startTypingIndicator };
