// Mock WebSocket implementation for testing real-time features
export class MockWebSocket {
 static instances: MockWebSocket[] = [];
  
  url: string;
  readyState: number = WebSocket.CONNECTING;
  onopen: ((this: WebSocket, ev: Event) => any) | null = null;
 onclose: ((this: WebSocket, ev: CloseEvent) => any) | null = null;
  onmessage: ((this: WebSocket, ev: MessageEvent) => any) | null = null;
  onerror: ((this: WebSocket, ev: Event) => any) | null = null;

  private eventListeners: { [type: string]: Function[] } = {};
  private messageQueue: any[] = [];

  constructor(url: string, protocols?: string | string[]) {
    this.url = url;
    MockWebSocket.instances.push(this);
    // Simulate immediate connection for testing
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) {
        this.onopen.call(this, new Event('open'));
      }
      this.dispatchEvent('open', new Event('open'));
    }, 0);
  }

  send(data: string) {
    // In a real implementation, this would send data to the server
    // For testing, we can simulate receiving responses
    console.log(`MockWebSocket sending: ${data}`);
  }

  close(code?: number, reason?: string) {
    this.readyState = WebSocket.CLOSED;
    const closeEvent = new CloseEvent('close', { code, reason });
    if (this.onclose) {
      this.onclose.call(this, closeEvent);
    }
    this.dispatchEvent('close', closeEvent);
  }

  addEventListener(type: string, listener: Function) {
    if (!this.eventListeners[type]) {
      this.eventListeners[type] = [];
    }
    this.eventListeners[type].push(listener);
  }

  removeEventListener(type: string, listener: Function) {
    if (this.eventListeners[type]) {
      const index = this.eventListeners[type].indexOf(listener);
      if (index > -1) {
        this.eventListeners[type].splice(index, 1);
      }
    }
  }

  dispatchEvent(type: string, event: Event) {
    if (this.eventListeners[type]) {
      this.eventListeners[type].forEach(listener => {
        listener(event);
      });
    }
  }

  // Method to simulate receiving a message from the server
  simulateMessage(data: any) {
    const messageEvent = new MessageEvent('message', { data: JSON.stringify(data) });
    if (this.onmessage) {
      this.onmessage.call(this, messageEvent);
    }
    this.dispatchEvent('message', messageEvent);
  }

  // Method to simulate connection error
  simulateError() {
    this.readyState = WebSocket.CLOSED;
    const errorEvent = new Event('error');
    if (this.onerror) {
      this.onerror.call(this, errorEvent);
    }
    this.dispatchEvent('error', errorEvent);
  }

 // Method to simulate disconnection
  simulateDisconnect() {
    this.readyState = WebSocket.CLOSED;
    const closeEvent = new CloseEvent('close', { code: 1000, reason: 'Simulated disconnect' });
    if (this.onclose) {
      this.onclose.call(this, closeEvent);
    }
    this.dispatchEvent('close', closeEvent);
  }

 // Method to simulate connection
  simulateConnect() {
    this.readyState = WebSocket.OPEN;
    const openEvent = new Event('open');
    if (this.onopen) {
      this.onopen.call(this, openEvent);
    }
    this.dispatchEvent('open', openEvent);
  }

  // Static method to simulate messages to all instances
  static simulateMessageToAll(data: any) {
    MockWebSocket.instances.forEach(instance => {
      instance.simulateMessage(data);
    });
  }

  // Static method to simulate disconnection for all instances
  static simulateDisconnectAll() {
    MockWebSocket.instances.forEach(instance => {
      instance.simulateDisconnect();
    });
  }
}

// Mock the global WebSocket for testing
export const setupMockWebSocket = () => {
  // Save original WebSocket
  const originalWebSocket = global.WebSocket;
  
  // Override global WebSocket with our mock
  (global as any).WebSocket = MockWebSocket;
  
  return {
    restore: () => {
      (global as any).WebSocket = originalWebSocket;
    },
    instances: MockWebSocket.instances,
  };
};