import { performPerplexitySearch } from '@command/common/perplexity';

export const PerplexityCommand = {
    name: 'perplexity',
    description: 'Perform a search using Perplexity AI',
    execute: async (args: string[]) => {
        const query = args.join(' ');
        const result = await performPerplexitySearch(query);
        return result;
    }
};
