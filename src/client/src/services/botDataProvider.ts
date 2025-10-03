import axios from 'axios';

export interface Bot {
  id: string;
  name: string;
  messageProvider: string;
  llmProvider: string;
  persona?: string;
  systemInstruction?: string;
  mcpServers: string[];
  mcpGuard: {
    enabled: boolean;
    type: 'owner' | 'custom';
    allowedUserIds: string[];
  };
  isActive: boolean;
  envOverrides?: Record<string, { isOverridden: boolean; redactedValue?: string }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateBotRequest {
  name: string;
  messageProvider: string;
  llmProvider: string;
  persona?: string;
  systemInstruction?: string;
  mcpServers?: string[];
  mcpGuard?: {
    enabled: boolean;
    type: 'owner' | 'custom';
    allowedUserIds: string[];
  };
  isActive?: boolean;
}

export interface UpdateBotRequest extends Partial<CreateBotRequest> {
  id: string;
}

// Enhanced data provider for bot CRUD operations
export class BotDataProvider {
  private baseURL = '/api/admin/agents';

  async getList(params?: {
    pagination?: { page: number; perPage: number };
    sort?: { field: string; order: 'ASC' | 'DESC' };
    filter?: Record<string, any>;
  }) {
    try {
      const queryParams = new URLSearchParams();
      
      if (params?.pagination) {
        queryParams.append('_page', params.pagination.page.toString());
        queryParams.append('_limit', params.pagination.perPage.toString());
      }
      
      if (params?.sort) {
        queryParams.append('_sort', params.sort.field);
        queryParams.append('_order', params.sort.order);
      }
      
      if (params?.filter) {
        Object.entries(params.filter).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            queryParams.append(key, value.toString());
          }
        });
      }

      const response = await axios.get(`${this.baseURL}?${queryParams}`);
      
      return {
        data: response.data.agents || [],
        total: response.data.total || response.data.agents?.length || 0,
      };
    } catch (error) {
      console.error('Error fetching bots:', error);
      throw new Error('Failed to fetch bots');
    }
  }

  async getOne(id: string) {
    try {
      const response = await axios.get(`${this.baseURL}/${id}`);
      return { data: response.data.agent };
    } catch (error) {
      console.error('Error fetching bot:', error);
      throw new Error(`Failed to fetch bot with id: ${id}`);
    }
  }

  async create(data: CreateBotRequest) {
    try {
      const response = await axios.post(this.baseURL, data);
      return { data: response.data.agent };
    } catch (error) {
      console.error('Error creating bot:', error);
      throw new Error('Failed to create bot');
    }
  }

  async update(id: string, data: Partial<CreateBotRequest>) {
    try {
      const response = await axios.put(`${this.baseURL}/${id}`, data);
      return { data: response.data.agent };
    } catch (error) {
      console.error('Error updating bot:', error);
      throw new Error(`Failed to update bot with id: ${id}`);
    }
  }

  async delete(id: string) {
    try {
      await axios.delete(`${this.baseURL}/${id}`);
      return { data: { id } };
    } catch (error) {
      console.error('Error deleting bot:', error);
      throw new Error(`Failed to delete bot with id: ${id}`);
    }
  }

  async deleteMany(ids: string[]) {
    try {
      const deletePromises = ids.map(id => this.delete(id));
      await Promise.all(deletePromises);
      return { data: ids };
    } catch (error) {
      console.error('Error deleting multiple bots:', error);
      throw new Error('Failed to delete bots');
    }
  }

  // Additional utility methods
  async validate(data: Partial<CreateBotRequest>) {
    try {
      const response = await axios.post('/api/webui/validate-config', { botConfig: data });
      return response.data.data;
    } catch (error) {
      console.error('Error validating bot config:', error);
      throw new Error('Failed to validate bot configuration');
    }
  }

  async getProviders() {
    try {
      const response = await axios.get('/api/webui/providers');
      return response.data.data;
    } catch (error) {
      console.error('Error fetching providers:', error);
      throw new Error('Failed to fetch providers');
    }
  }

  async getPersonas() {
    try {
      const response = await axios.get(`${this.baseURL}/personas`);
      return response.data.personas || [];
    } catch (error) {
      console.error('Error fetching personas:', error);
      throw new Error('Failed to fetch personas');
    }
  }

  async getMCPServers() {
    try {
      const response = await axios.get('/api/admin/mcp/servers');
      return response.data.servers || [];
    } catch (error) {
      console.error('Error fetching MCP servers:', error);
      throw new Error('Failed to fetch MCP servers');
    }
  }

  async getSystemStatus() {
    try {
      const response = await axios.get('/api/webui/system-status');
      return response.data.data;
    } catch (error) {
      console.error('Error fetching system status:', error);
      throw new Error('Failed to fetch system status');
    }
  }
}

// Singleton instance
export const botDataProvider = new BotDataProvider();