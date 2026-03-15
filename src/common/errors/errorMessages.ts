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

function getRandomErrorMessage(): string {
  const randomIndex = Math.floor(Math.random() * errorMessages.length);
  return errorMessages[randomIndex];
}
