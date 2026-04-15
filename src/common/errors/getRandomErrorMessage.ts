import crypto from 'crypto';

/**
 * Returns a random error message from a predefined list of messages.
 *
 * @returns {string} A randomly selected error message.
 */
export function getRandomErrorMessage(): string {
  const errorMessages: string[] = [
    'Oops, my circuits got tangled in digital spaghetti! 🍝🤖',
    'Whoa, I tripped over a virtual shoelace! 🤖👟',
    'Ah, I just had a byte-sized hiccup! 🤖🍔',
    'Looks like I bumbled the binary! 💾🐝',
    'Yikes, my code caught a digital cold! 🤖🤧',
    'Gosh, I stumbled into a loop hole! 🌀🤖',
    'Oopsie, I accidentally swapped my bits with bytes! 🔄🤖',
    'My gears are in a jam, quite a pickle indeed! 🤖🥒',
    'Uh-oh, I spilled some pixels here! 🤖🎨',
    'Hold on, recalibrating my humor sensors! 🤖😂',
  ];
  const randomBytes = crypto.randomBytes(4);
  const randomIndex = randomBytes.readUInt32BE() % errorMessages.length;
  return errorMessages[randomIndex];
}
