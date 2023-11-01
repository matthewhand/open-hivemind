async function initializeFetch() {
    const nodeFetch = await import('node-fetch');
    global.fetch = nodeFetch.default;
    global.Headers = nodeFetch.Headers;
}

module.exports = { initializeFetch };
