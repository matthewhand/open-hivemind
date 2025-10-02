export interface Agent {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'idle';
  persona: string;
  createdAt: string;
 lastSeen: string;
}

// Mock data for demonstration
const mockAgents: Agent[] = [
  {
    id: '1',
    name: 'Agent Alpha',
    status: 'online',
    persona: 'Support Bot',
    createdAt: '2023-01-15',
    lastSeen: '2023-10-01T10:30:00Z',
  },
  {
    id: '2',
    name: 'Agent Beta',
    status: 'offline',
    persona: 'Sales Assistant',
    createdAt: '2023-02-20',
    lastSeen: '2023-09-28T15:45:00Z',
  },
  {
    id: '3',
    name: 'Agent Gamma',
    status: 'idle',
    persona: 'Technical Support',
    createdAt: '2023-03-10',
    lastSeen: '2023-10-01T08:15:00Z',
  },
];

export const getAgents = async (): Promise<Agent[]> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));
  return [...mockAgents]; // Return a copy to prevent direct mutations
};

export const createAgent = async (agentData: Omit<Agent, 'id' | 'createdAt' | 'lastSeen'>): Promise<Agent> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const newAgent: Agent = {
    id: `agent-${Date.now()}`,
    ...agentData,
    createdAt: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
  };
  
  mockAgents.push(newAgent);
  return newAgent;
};

export const updateAgent = async (id: string, agentData: Partial<Omit<Agent, 'id'>>): Promise<Agent> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const index = mockAgents.findIndex(agent => agent.id === id);
  if (index === -1) {
    throw new Error(`Agent with id ${id} not found`);
  }
  
  const updatedAgent = {
    ...mockAgents[index],
    ...agentData,
    lastSeen: new Date().toISOString(),
  };
  
  mockAgents[index] = updatedAgent;
  return updatedAgent;
};

export const deleteAgent = async (id: string): Promise<void> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const index = mockAgents.findIndex(agent => agent.id === id);
  if (index !== -1) {
    mockAgents.splice(index, 1);
  }
};