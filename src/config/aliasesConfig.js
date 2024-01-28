const aliases = {
    // HTTP handler
    'video': 'http:modal',

    // PPLX handler
    'web': 'perplexity',

    // Flowise handler
    'gpt4': 'flowise:gpt4',
    'docs': 'flowise:docs',
    'qdrant': 'flowise:qdrant',
    'pinecone': 'flowise:pinecone',
    'mtg': 'flowise:qdrant_pplx',
    'magic': 'flowise:qdrant_oai',

    // Quivr handler
    'deep': 'quivr:philosophic',
    'geb': 'quivr:philosophic geb',
    'book': 'quivr:literature',
    'shakespear': 'quivr:literature shakespear',
    'suntzu': 'quivr:literature suntzu',

    // Add more aliases her

}

module.exports = { aliases };
