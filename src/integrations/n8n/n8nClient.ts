import axios from 'axios';
import ConfigurationManager from '@src/common/config/ConfigurationManager';

// N8n API Client for interacting with a local N8n instance
export class N8nClient {
  private baseURL: string;
  private apiKey: string;

  constructor() {
    this.baseURL = ConfigurationManager.getConfig('N8N_API_BASE_URL', 'http://localhost:5678/api/v1');
    this.apiKey = ConfigurationManager.getConfig('N8N_API_KEY', '');
  }

  // Trigger a workflow by its ID
  public async triggerWorkflow(workflowId: string, data: Record<string, any> = {}): Promise<any> {
    try {
      const response = await axios.post(`${this.baseURL}/workflows/${workflowId}/run`, data, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error triggering N8n workflow:', error);
      throw error;
    }
  }

  // Fetch workflow details by ID
  public async getWorkflow(workflowId: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseURL}/workflows/${workflowId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching N8n workflow details:', error);
      throw error;
    }
  }

  // Get execution results by execution ID
  public async getExecution(executionId: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseURL}/executions/${executionId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching N8n execution details:', error);
      throw error;
    }
  }
}
