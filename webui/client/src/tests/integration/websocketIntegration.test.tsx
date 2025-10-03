import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createWebSocketTestUtils, mockMessageGenerators, simulateRealTimeUpdates, simulateConnectionDrop } from '../../mocks/websocketUtils';
import { TestableErrorBoundary } from '../../mocks/errorBoundaryUtils';
import RealTimeUpdates from '../../components/RealTimeUpdates';
import ApiStatusMonitor from '../../components/ApiStatusMonitor';
import ActivityMonitor from '../../components/ActivityMonitor';

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <TestableErrorBoundary>
    {children}
  </TestableErrorBoundary>
);

describe('WebSocket Integration Tests', () => {
  let wsUtils: any;

  beforeEach(() => {
    wsUtils = createWebSocketTestUtils();
  });

  afterEach(() => {
    if (wsUtils) {
      wsUtils.disconnect();
    }
    TestableErrorBoundary.clearInstances();
  });

  describe('WebSocket Connection Management', () => {
    test('should establish WebSocket connection on component mount', async () => {
      render(
        <TestWrapper>
          <RealTimeUpdates />
        </TestWrapper>
      );

      // Wait for WebSocket connection
      await waitFor(() => {
        expect(wsUtils.isConnected()).toBe(true);
      });

      // Verify connection status is displayed
      await waitFor(() => {
        expect(screen.getByText(/connected/i)).toBeInTheDocument();
      });
    });

    test('should handle WebSocket connection failure', async () => {
      // Mock connection failure
      const mockConnect = jest.fn().mockImplementation(() => {
        throw new Error('Connection failed');
      });
      
      // Override the connect method
      wsUtils.connect = mockConnect;

      render(
        <TestWrapper>
          <RealTimeUpdates />
        </TestWrapper>
      );

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText(/connection failed/i)).toBeInTheDocument();
      });
    });

    test('should attempt reconnection on connection loss', async () => {
      render(
        <TestWrapper>
          <RealTimeUpdates />
        </TestWrapper>
      );

      // Wait for initial connection
      await waitFor(() => {
        expect(wsUtils.isConnected()).toBe(true);
      });

      // Simulate connection drop
      simulateConnectionDrop(wsUtils, 1000);

      // Wait for disconnection
      await waitFor(() => {
        expect(screen.getByText(/disconnected/i)).toBeInTheDocument();
      });

      // Wait for reconnection attempt
      await waitFor(() => {
        expect(screen.getByText(/reconnecting/i)).toBeInTheDocument();
      }, { timeout: 2000 });

      // Wait for successful reconnection
      await waitFor(() => {
        expect(screen.getByText(/connected/i)).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    test('should handle multiple reconnection attempts', async () => {
      render(
        <TestWrapper>
          <RealTimeUpdates />
        </TestWrapper>
      );

      // Wait for initial connection
      await waitFor(() => {
        expect(wsUtils.isConnected()).toBe(true);
      });

      // Simulate multiple connection drops
      for (let i = 0; i < 3; i++) {
        wsUtils.simulateDisconnect();
        
        await waitFor(() => {
          expect(screen.getByText(/disconnected/i)).toBeInTheDocument();
        });

        // Wait for reconnection
        await waitFor(() => {
          expect(screen.getByText(/connected/i)).toBeInTheDocument();
        }, { timeout: 3000 });
      }

      // Verify reconnection count
      await waitFor(() => {
        expect(screen.getByText(/reconnection attempts: 3/i)).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Message Handling', () => {
    test('should receive and display real-time updates', async () => {
      render(
        <TestWrapper>
          <RealTimeUpdates />
        </TestWrapper>
      );

      // Wait for connection
      await waitFor(() => {
        expect(wsUtils.isConnected()).toBe(true);
      });

      // Simulate real-time update
      const update = mockMessageGenerators.agentStatusUpdate('test-agent', 'online');
      wsUtils.simulateMessage(update);

      // Wait for update to be displayed
      await waitFor(() => {
        expect(screen.getByText(/test-agent/i)).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText(/online/i)).toBeInTheDocument();
      });
    });

    test('should handle multiple concurrent real-time updates', async () => {
      render(
        <TestWrapper>
          <RealTimeUpdates />
        </TestWrapper>
      );

      // Wait for connection
      await waitFor(() => {
        expect(wsUtils.isConnected()).toBe(true);
      });

      // Simulate multiple updates
      const updates = [
        mockMessageGenerators.agentStatusUpdate('agent-1', 'online'),
        mockMessageGenerators.agentStatusUpdate('agent-2', 'offline'),
        mockMessageGenerators.systemMetrics(),
        mockMessageGenerators.activityUpdate('agent-1', 'message')
      ];

      simulateRealTimeUpdates(wsUtils, updates);

      // Wait for all updates to be processed
      await waitFor(() => {
        expect(screen.getByText('agent-1')).toBeInTheDocument();
        expect(screen.getByText('agent-2')).toBeInTheDocument();
        expect(screen.getByText(/system metrics/i)).toBeInTheDocument();
        expect(screen.getByText(/activity update/i)).toBeInTheDocument();
      }, { timeout: 10000 });
    });

    test('should handle malformed WebSocket messages', async () => {
      render(
        <TestWrapper>
          <RealTimeUpdates />
        </TestWrapper>
      );

      // Wait for connection
      await waitFor(() => {
        expect(wsUtils.isConnected()).toBe(true);
      });

      // Simulate malformed message
      wsUtils.simulateMessage('invalid json');

      // Should handle gracefully without crashing
      await waitFor(() => {
        expect(screen.getByText(/message format error/i)).toBeInTheDocument();
      });
    });

    test('should filter and process specific message types', async () => {
      render(
        <TestWrapper>
          <RealTimeUpdates />
        </TestWrapper>
      );

      // Wait for connection
      await waitFor(() => {
        expect(wsUtils.isConnected()).toBe(true);
      });

      // Simulate different message types
      const agentUpdate = mockMessageGenerators.agentStatusUpdate('test-agent', 'online');
      const systemMetrics = mockMessageGenerators.systemMetrics();
      const errorNotification = mockMessageGenerators.errorNotification('test', 'Test error');

      wsUtils.simulateMessage(agentUpdate);
      wsUtils.simulateMessage(systemMetrics);
      wsUtils.simulateMessage(errorNotification);

      // Verify each message type is handled correctly
      await waitFor(() => {
        expect(screen.getByText(/test-agent/i)).toBeInTheDocument();
        expect(screen.getByText(/system metrics/i)).toBeInTheDocument();
        expect(screen.getByText(/test error/i)).toBeInTheDocument();
      });
    });
  });

  describe('WebSocket Error Handling', () => {
    test('should handle WebSocket errors gracefully', async () => {
      render(
        <TestWrapper>
          <RealTimeUpdates />
        </TestWrapper>
      );

      // Wait for connection
      await waitFor(() => {
        expect(wsUtils.isConnected()).toBe(true);
      });

      // Simulate WebSocket error
      wsUtils.simulateError();

      // Wait for error to be handled
      await waitFor(() => {
        expect(screen.getByText(/websocket error/i)).toBeInTheDocument();
      });
    });

    test('should recover from WebSocket errors', async () => {
      render(
        <TestWrapper>
          <RealTimeUpdates />
        </TestWrapper>
      );

      // Wait for connection
      await waitFor(() => {
        expect(wsUtils.isConnected()).toBe(true);
      });

      // Simulate error
      wsUtils.simulateError();

      // Wait for error handling
      await waitFor(() => {
        expect(screen.getByText(/websocket error/i)).toBeInTheDocument();
      });

      // Simulate recovery
      wsUtils.simulateConnect();

      // Wait for recovery
      await waitFor(() => {
        expect(screen.getByText(/connected/i)).toBeInTheDocument();
      });
    });

    test('should handle WebSocket timeout errors', async () => {
      render(
        <TestWrapper>
          <RealTimeUpdates />
        </TestWrapper>
      );

      // Wait for connection
      await waitFor(() => {
        expect(wsUtils.isConnected()).toBe(true);
      });

      // Simulate timeout by not responding to ping
      const originalSimulateMessage = wsUtils.simulateMessage.bind(wsUtils);
      wsUtils.simulateMessage = (data: any) => {
        if (data.type === 'ping') {
          // Don't respond to ping to simulate timeout
          return;
        }
        originalSimulateMessage(data);
      };

      // Wait for timeout detection
      await waitFor(() => {
        expect(screen.getByText(/connection timeout/i)).toBeInTheDocument();
      }, { timeout: 10000 });
    });
  });

  describe('WebSocket State Management', () => {
    test('should track WebSocket connection state changes', async () => {
      render(
        <TestWrapper>
          <RealTimeUpdates />
        </TestWrapper>
      );

      // Initial state should be connecting
      expect(screen.getByText(/connecting/i)).toBeInTheDocument();

      // Wait for connection
      await waitFor(() => {
        expect(screen.getByText(/connected/i)).toBeInTheDocument();
      });

      // Simulate disconnection
      wsUtils.simulateDisconnect();

      // Wait for disconnection
      await waitFor(() => {
        expect(screen.getByText(/disconnected/i)).toBeInTheDocument();
      });

      // Simulate reconnection
      wsUtils.simulateConnect();

      // Wait for reconnection
      await waitFor(() => {
        expect(screen.getByText(/connected/i)).toBeInTheDocument();
      });
    });

    test('should maintain message queue during disconnection', async () => {
      render(
        <TestWrapper>
          <RealTimeUpdates />
        </TestWrapper>
      );

      // Wait for connection
      await waitFor(() => {
        expect(wsUtils.isConnected()).toBe(true);
      });

      // Simulate disconnection
      wsUtils.simulateDisconnect();

      // Send messages while disconnected
      const update1 = mockMessageGenerators.agentStatusUpdate('agent-1', 'online');
      const update2 = mockMessageGenerators.agentStatusUpdate('agent-2', 'offline');

      wsUtils.simulateMessage(update1);
      wsUtils.simulateMessage(update2);

      // Verify messages are queued
      await waitFor(() => {
        expect(screen.getByText(/messages queued: 2/i)).toBeInTheDocument();
      });

      // Reconnect
      wsUtils.simulateConnect();

      // Wait for queued messages to be processed
      await waitFor(() => {
        expect(screen.getByText('agent-1')).toBeInTheDocument();
        expect(screen.getByText('agent-2')).toBeInTheDocument();
      });
    });
  });

  describe('WebSocket Performance', () => {
    test('should handle high-frequency message updates', async () => {
      render(
        <TestWrapper>
          <RealTimeUpdates />
        </TestWrapper>
      );

      // Wait for connection
      await waitFor(() => {
        expect(wsUtils.isConnected()).toBe(true);
      });

      // Send high-frequency updates
      const startTime = Date.now();
      const messageCount = 100;

      for (let i = 0; i < messageCount; i++) {
        const update = mockMessageGenerators.activityUpdate(`agent-${i}`, 'message');
        wsUtils.simulateMessage(update);
      }

      // Wait for all messages to be processed
      await waitFor(() => {
        expect(screen.getByText(new RegExp(`${messageCount} updates processed`))).toBeInTheDocument();
      }, { timeout: 15000 });

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Verify performance is acceptable (less than 5 seconds for 100 messages)
      expect(processingTime).toBeLessThan(5000);
    });

    test('should handle large message payloads', async () => {
      render(
        <TestWrapper>
          <RealTimeUpdates />
        </TestWrapper>
      );

      // Wait for connection
      await waitFor(() => {
        expect(wsUtils.isConnected()).toBe(true);
      });

      // Create large payload
      const largeData = {
        type: 'large_data',
        data: Array(1000).fill(0).map((_, i) => ({
          id: i,
          name: `item-${i}`,
          description: `Description for item ${i}`.repeat(10),
          metadata: {
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            tags: [`tag-${i}`, `category-${i % 10}`]
          }
        }))
      };

      wsUtils.simulateMessage(largeData);

      // Wait for large message to be processed
      await waitFor(() => {
        expect(screen.getByText(/large data processed/i)).toBeInTheDocument();
      }, { timeout: 10000 });
    });
  });

  describe('WebSocket Integration with Components', () => {
    test('should integrate WebSocket with API Status Monitor', async () => {
      render(
        <TestWrapper>
          <ApiStatusMonitor />
        </TestWrapper>
      );

      // Wait for connection
      await waitFor(() => {
        expect(wsUtils.isConnected()).toBe(true);
      });

      // Simulate API status update via WebSocket
      const statusUpdate = mockMessageGenerators.apiStatusUpdate('test-endpoint', 'error', 5000);
      wsUtils.simulateMessage(statusUpdate);

      // Wait for status update to be reflected
      await waitFor(() => {
        expect(screen.getByText(/test-endpoint/i)).toBeInTheDocument();
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });

    test('should integrate WebSocket with Activity Monitor', async () => {
      render(
        <TestWrapper>
          <ActivityMonitor />
        </TestWrapper>
      );

      // Wait for connection
      await waitFor(() => {
        expect(wsUtils.isConnected()).toBe(true);
      });

      // Simulate activity update via WebSocket
      const activityUpdate = mockMessageGenerators.activityUpdate('test-agent', 'message');
      wsUtils.simulateMessage(activityUpdate);

      // Wait for activity update to be reflected
      await waitFor(() => {
        expect(screen.getByText(/test-agent/i)).toBeInTheDocument();
        expect(screen.getByText(/message/i)).toBeInTheDocument();
      });
    });

    test('should handle multiple components with shared WebSocket', async () => {
      render(
        <TestWrapper>
          <div>
            <ApiStatusMonitor />
            <ActivityMonitor />
            <RealTimeUpdates />
          </div>
        </TestWrapper>
      );

      // Wait for connection
      await waitFor(() => {
        expect(wsUtils.isConnected()).toBe(true);
      });

      // Send different types of updates
      const statusUpdate = mockMessageGenerators.apiStatusUpdate('endpoint-1', 'online');
      const activityUpdate = mockMessageGenerators.activityUpdate('agent-1', 'message');
      const agentUpdate = mockMessageGenerators.agentStatusUpdate('agent-1', 'online');

      wsUtils.simulateMessage(statusUpdate);
      wsUtils.simulateMessage(activityUpdate);
      wsUtils.simulateMessage(agentUpdate);

      // Wait for all components to receive updates
      await waitFor(() => {
        expect(screen.getByText(/endpoint-1/i)).toBeInTheDocument();
        expect(screen.getByText(/agent-1/i)).toBeInTheDocument();
        expect(screen.getByText(/online/i)).toBeInTheDocument();
      });
    });
  });

  describe('WebSocket Cleanup', () => {
    test('should cleanup WebSocket connection on component unmount', async () => {
      const { unmount } = render(
        <TestWrapper>
          <RealTimeUpdates />
        </TestWrapper>
      );

      // Wait for connection
      await waitFor(() => {
        expect(wsUtils.isConnected()).toBe(true);
      });

      // Unmount component
      unmount();

      // Verify WebSocket is disconnected
      expect(wsUtils.isConnected()).toBe(false);
    });

    test('should cleanup event listeners on component unmount', async () => {
      const { unmount } = render(
        <TestWrapper>
          <RealTimeUpdates />
        </TestWrapper>
      );

      // Wait for connection
      await waitFor(() => {
        expect(wsUtils.isConnected()).toBe(true);
      });

      // Send message to verify listeners are working
      const update = mockMessageGenerators.agentStatusUpdate('test-agent', 'online');
      wsUtils.simulateMessage(update);

      await waitFor(() => {
        expect(screen.getByText(/test-agent/i)).toBeInTheDocument();
      });

      // Unmount component
      unmount();

      // Send another message
      const update2 = mockMessageGenerators.agentStatusUpdate('test-agent-2', 'offline');
      wsUtils.simulateMessage(update2);

      // Verify message is not processed (component is unmounted)
      expect(screen.queryByText(/test-agent-2/i)).not.toBeInTheDocument();
    });
  });
});