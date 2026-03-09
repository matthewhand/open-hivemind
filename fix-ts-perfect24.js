const fs = require('fs');

let b = fs.readFileSync('src/client/src/pages/BotsPage.tsx', 'utf8');

// I should probably just restore BotsPage and do it correctly.
// Ah, the CI failure was what I was supposed to be fixing before the user interrupted me.
