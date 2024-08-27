import axios from 'axios';
import ConfigurationManager from '@src/common/config/ConfigurationManager';

// Flowise API Client for interacting with a local Flowise instance
export class FlowiseClient {
  private baseURL: string;
  private apiKey: string;

  constructor() {
    this.baseURL = ConfigurationManager.FLOWISE_BASE_URL;
    this.apiKey = ConfigurationManager.FLOWISE_API_KEY;
  }

  // Trigger a Flowise process by its ID
  public async triggerProcess(processId: string, data: Record<string, any> = {}): Promise<any> {
    try {
      const response = await axios.post(`${this.baseURL}/process/${processId}/run`, data, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error triggering Flowise process:', error);
      throw error;
    }
  }

  // Fetch process details by ID
  public async getProcess(processId: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseURL}/process/${processId}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching Flowise process details:', error);
      throw error;
    }
  }
}
