import axios from 'axios';

export async function performPerplexitySearch(query: string): Promise<string> {
    try {
        const response = await axios.post(process.env.PERPLEXITY_URL!, { query });
        return `Search results for "${query}": ${response.data}`;
    } catch (error) {
        return `Failed to fetch results: ${(error as Error).message}`;
    }
}
