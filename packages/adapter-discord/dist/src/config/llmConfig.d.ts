import convict from 'convict';
declare const llmConfig: convict.Config<{
    LLM_PROVIDER: string;
    LLM_PARALLEL_EXECUTION: boolean;
}>;
export default llmConfig;
//# sourceMappingURL=llmConfig.d.ts.map