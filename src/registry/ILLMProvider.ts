import { IProvider } from './IProvider';

export interface ILLMProvider extends IProvider {
  type: 'llm';
  // Add LLM specific methods if needed, currently acting as a marker/config provider
}
