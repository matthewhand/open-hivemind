import Debug from "debug";
export interface Alias {
    handler: string;
    description: string;
    category?: string; // Optional category property
}

export const aliases: Record<string, Alias> = {
    'video': {
        handler: 'http:modal',
        description: 'Queries video transcripts via RAG (mostly tech and AI related).'
    },
    'web': {
        handler: 'perplexity',
        description: 'Searches the web for content relating to the query.'
    },
    'gpt4': {
        handler: 'flowise:gpt4',
        description: 'Leverages the GPT-4 AI model for generating human-like text responses.'
    },
    'docs': {
        handler: 'flowise:docs',
        description: 'Queries documentation related to Flowise development (from the GitHub).'
    },
    'qdrant': {
        handler: 'flowise:qdrant',
        description: 'Utilizes the Qdrant vector search engine for efficient data retrieval.'
    },
    'pinecone': {
        handler: 'flowise:pinecone',
        description: 'Engages Pinecone to perform similarity search at scale.'
    },
    'mtg': {
        handler: 'flowise:qdrant_pplx',
        description: 'Specific handler for Magic: The Gathering related queries using Qdrant.'
    },
    'magic': {
        handler: 'flowise:qdrant_oai',
        description: 'Handles broader magical and fantasy queries, using an OpenAI model tuned with Qdrant.'
    },
    'deep': {
        handler: 'quivr:philosophic',
        description: 'Dives deep into philosophical queries and provides thought-provoking answers.'
    },
    'geb': {
        handler: 'quivr:philosophic geb',
        description: 'Targets discussions around “Gödel, Escher, Bach”, exploring loops and recursive systems.'
    },
    'book': {
        handler: 'quivr:literature',
        description: 'Finds and discusses literature across genres and time periods.'
    },
    'shakespear': {
        handler: 'quivr:literature shakespear',
        description: 'Specialized in Shakespeare’s works, providing analysis, quotes, and interpretations.'
    },
    'suntzu': {
        handler: 'quivr:literature suntzu',
        description: 'Focuses on Sun Tzu’s "The Art of War", interpreting strategies and teachings.'
    },
};
