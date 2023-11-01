const fetch = require('cross-fetch');
global.fetch = fetch;

const Replicate = require('replicate');

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

async function handleImageMessage(message, replicate) {
    try {
        const attachments = message.attachments;
        if (attachments.size > 0) {
            const imageUrl = attachments.first().url;
            console.debug(`Image URL: ${imageUrl}`);
            await message.channel.send('Image detected. Running analysis using Llava 13b on Replicant...');
            const modelVersion = "2facb4a474a0462c15041b78b1ad70952ea46b5ec6ad29583c0b29dbd4249591";
            const prediction = await replicate.predictions.create({
                version: modelVersion,
                input: { image: imageUrl },
                webhook: process.env.WEBHOOK_URL,
                webhook_events_filter: ["completed"]
            });
            const predictionId = prediction.id;
            console.log(`Prediction ID: ${predictionId}`);
            return true;
        } else {
            console.debug('No attachments found');
            return false;
        }
    } catch (error) {
        console.error(`Error in handleImageMessage: ${error.message}`);
        return false;
    }
}

module.exports = { handleImageMessage };
