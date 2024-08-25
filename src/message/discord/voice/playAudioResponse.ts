import { getRandomErrorMessage } from '@src/utils/getRandomErrorMessage';
import { redactSensitiveInfo } from '@src/utils/redactSensitiveInfo';
import { handleError } from '@src/utils/handleError';

export function playAudioResponse(channel, audioBuffer) {
    try {
        // Some audio playing logic
    } catch (error) {
        handleError(error, channel);
    }
}
