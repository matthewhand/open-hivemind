const handleImageMessage = async (message, replicate) => {
    try {
        const attachments = message.attachments;
        if (attachments.size > 0) {
            const imageUrl = attachments.first().url;

            console.debug(`Image URL: ${imageUrl}`);  // Debugging line

            // Send a message to the channel
            await message.channel.send('Image detected. Running analysis using Llava 13b on Replicant...');

            const modelVersion = "2facb4a474a0462c15041b78b1ad70952ea46b5ec6ad29583c0b29dbd4249591";
            const prediction = await replicate.predictions.create({
                version: modelVersion,
                input: {
                    image: imageUrl,  // Assuming the image is publicly accessible
                },
                webhook: process.env.WEBHOOK_URL,  // Use environment variable for webhook URL
                webhook_events_filter: ["completed"]
            });

            // Optionally, you could store the prediction ID to correlate the webhook call later
            const predictionId = prediction.id;
            console.log(`Prediction ID: ${predictionId}`);  // This line is already providing some debug info

            return true;  // Image was detected and analysis initiated
        } else {
            console.debug('No attachments found');  // Debugging line
            return false;  // No image was detected
        }
    } catch (error) {
        console.error(`Error in handleImageMessage: ${error.message}`);  // Error handling line
        return false;  // An error occurred, assume no image was detected
    }
};
