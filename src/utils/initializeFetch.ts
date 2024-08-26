import Debug from "debug";
export async function initializeFetch(): Promise<void> {
    const nodeFetch = await import('node-fetch');
    global.fetch = nodeFetch.default as unknown as typeof fetch;
    global.Headers = nodeFetch.Headers as unknown as typeof Headers;
}
