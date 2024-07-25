const { generateDependencyReport } = require('@discordjs/voice');
const sodium = require('libsodium-wrappers');
//const nacl = require('tweetnacl');
const OpusEncoder = require('@discordjs/opus').OpusEncoder;

async function testLibraries() {
    console.log('Dependency Report:\n' + generateDependencyReport());

    await sodium.ready;
    console.log('libsodium-wrappers loaded:', sodium);

    //console.log('tweetnacl loaded:', nacl);

    const encoder = new OpusEncoder(48000, 2);
    console.log('OpusEncoder loaded:', encoder);
}

testLibraries().catch(console.error);

