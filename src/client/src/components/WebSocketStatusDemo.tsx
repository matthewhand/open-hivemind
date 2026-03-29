import React, { useState } from 'react';
import WebSocketStatusIndicator from './WebSocketStatusIndicator';

/**
 * Demo component showing all WebSocket connection states.
 * Useful for testing and documentation.
 *
 * To use: Import and render this component in any page during development.
 */
export const WebSocketStatusDemo: React.FC = () => {
  const [selectedState, setSelectedState] = useState<'connected' | 'disconnected' | 'reconnecting' | 'failed'>('connected');
  const [showLabel, setShowLabel] = useState(true);
  const [size, setSize] = useState<'sm' | 'md' | 'lg'>('md');

  // Mock WebSocket context for demo purposes
  const mockStates = {
    connected: {
      connectionState: 'connected' as const,
      reconnectAttempt: 0,
      nextRetryIn: 0,
    },
    disconnected: {
      connectionState: 'disconnected' as const,
      reconnectAttempt: 0,
      nextRetryIn: 0,
    },
    reconnecting: {
      connectionState: 'reconnecting' as const,
      reconnectAttempt: 3,
      nextRetryIn: 5,
    },
    failed: {
      connectionState: 'failed' as const,
      reconnectAttempt: 0,
      nextRetryIn: 0,
    },
  };

  return (
    <div className="p-8 space-y-8">
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-2xl mb-4">WebSocket Status Indicator Demo</h2>

          {/* Controls */}
          <div className="space-y-4">
            <div>
              <label className="label">
                <span className="label-text font-semibold">Connection State</span>
              </label>
              <div className="flex gap-2 flex-wrap">
                <button
                  className={`btn btn-sm ${selectedState === 'connected' ? 'btn-success' : 'btn-outline'}`}
                  onClick={() => setSelectedState('connected')}
                >
                  Connected
                </button>
                <button
                  className={`btn btn-sm ${selectedState === 'reconnecting' ? 'btn-warning' : 'btn-outline'}`}
                  onClick={() => setSelectedState('reconnecting')}
                >
                  Reconnecting
                </button>
                <button
                  className={`btn btn-sm ${selectedState === 'disconnected' ? 'btn-error' : 'btn-outline'}`}
                  onClick={() => setSelectedState('disconnected')}
                >
                  Disconnected
                </button>
                <button
                  className={`btn btn-sm ${selectedState === 'failed' ? 'btn-error' : 'btn-outline'}`}
                  onClick={() => setSelectedState('failed')}
                >
                  Failed
                </button>
              </div>
            </div>

            <div>
              <label className="label">
                <span className="label-text font-semibold">Size</span>
              </label>
              <div className="flex gap-2">
                <button
                  className={`btn btn-sm ${size === 'sm' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setSize('sm')}
                >
                  Small
                </button>
                <button
                  className={`btn btn-sm ${size === 'md' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setSize('md')}
                >
                  Medium
                </button>
                <button
                  className={`btn btn-sm ${size === 'lg' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setSize('lg')}
                >
                  Large
                </button>
              </div>
            </div>

            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-2">
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={showLabel}
                  onChange={(e) => setShowLabel(e.target.checked)}
                />
                <span className="label-text font-semibold">Show Label</span>
              </label>
            </div>
          </div>

          {/* Divider */}
          <div className="divider">Preview</div>

          {/* Preview */}
          <div className="bg-base-100 rounded-lg p-8 flex items-center justify-center">
            <WebSocketStatusIndicator
              size={size}
              showLabel={showLabel}
            />
          </div>

          {/* State Info */}
          <div className="alert alert-info">
            <div className="text-sm">
              <div className="font-semibold mb-1">Current State Information:</div>
              <div>Connection State: <code className="bg-base-200 px-2 py-0.5 rounded">{selectedState}</code></div>
              {selectedState === 'reconnecting' && (
                <>
                  <div>Reconnect Attempt: <code className="bg-base-200 px-2 py-0.5 rounded">{mockStates[selectedState].reconnectAttempt}</code></div>
                  <div>Next Retry In: <code className="bg-base-200 px-2 py-0.5 rounded">{mockStates[selectedState].nextRetryIn}s</code></div>
                </>
              )}
            </div>
          </div>

          {/* All States Overview */}
          <div className="divider">All States</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card bg-success/10 border border-success/20">
              <div className="card-body py-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Connected</span>
                  <WebSocketStatusIndicator size="sm" />
                </div>
                <p className="text-xs opacity-70">Green dot - Connection active</p>
              </div>
            </div>

            <div className="card bg-warning/10 border border-warning/20">
              <div className="card-body py-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Reconnecting</span>
                  <WebSocketStatusIndicator size="sm" />
                </div>
                <p className="text-xs opacity-70">Yellow pulsing dot - Attempting reconnection</p>
              </div>
            </div>

            <div className="card bg-error/10 border border-error/20">
              <div className="card-body py-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Disconnected</span>
                  <WebSocketStatusIndicator size="sm" />
                </div>
                <p className="text-xs opacity-70">Red dot - Connection lost</p>
              </div>
            </div>

            <div className="card bg-error/10 border border-error/20">
              <div className="card-body py-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Failed</span>
                  <WebSocketStatusIndicator size="sm" />
                </div>
                <p className="text-xs opacity-70">Red pulsing dot - Connection failed</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Examples */}
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <h3 className="card-title">Toast Notification Examples</h3>
          <p className="text-sm opacity-70 mb-4">
            These are the toast notifications users will see during connection state changes:
          </p>

          <div className="space-y-4">
            {/* Connection Lost Toast */}
            <div className="mockup-window bg-base-300 border">
              <div className="bg-base-200 p-4">
                <div className="alert alert-warning shadow-lg max-w-md ml-auto">
                  <div className="flex items-start space-x-3 flex-1">
                    <span className="text-xl">⚠️</span>
                    <div className="flex-1">
                      <div className="font-semibold text-sm">Connection lost</div>
                      <div className="text-sm opacity-80 mt-1">Reconnecting...</div>
                    </div>
                    <button className="btn btn-ghost btn-xs btn-circle">✕</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Reconnecting with Countdown */}
            <div className="mockup-window bg-base-300 border">
              <div className="bg-base-200 p-4">
                <div className="alert alert-warning shadow-lg max-w-md ml-auto">
                  <div className="flex items-start space-x-3 flex-1">
                    <span className="text-xl">⚠️</span>
                    <div className="flex-1">
                      <div className="font-semibold text-sm">Connection lost</div>
                      <div className="text-sm opacity-80 mt-1">Retrying in 5s... (attempt 3)</div>
                      <div className="flex gap-2 mt-2">
                        <button className="btn btn-xs btn-primary">Retry now</button>
                      </div>
                    </div>
                    <button className="btn btn-ghost btn-xs btn-circle">✕</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Reconnected Success */}
            <div className="mockup-window bg-base-300 border">
              <div className="bg-base-200 p-4">
                <div className="alert alert-success shadow-lg max-w-md ml-auto">
                  <div className="flex items-start space-x-3 flex-1">
                    <span className="text-xl">✅</span>
                    <div className="flex-1">
                      <div className="font-semibold text-sm">Reconnected!</div>
                      <div className="text-sm opacity-80 mt-1">Connection restored successfully.</div>
                    </div>
                    <button className="btn btn-ghost btn-xs btn-circle">✕</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Connection Failed */}
            <div className="mockup-window bg-base-300 border">
              <div className="bg-base-200 p-4">
                <div className="alert alert-error shadow-lg max-w-md ml-auto">
                  <div className="flex items-start space-x-3 flex-1">
                    <span className="text-xl">❌</span>
                    <div className="flex-1">
                      <div className="font-semibold text-sm">Connection failed</div>
                      <div className="text-sm opacity-80 mt-1">Unable to connect to the server.</div>
                      <div className="flex gap-2 mt-2">
                        <button className="btn btn-xs btn-primary">Retry</button>
                      </div>
                    </div>
                    <button className="btn btn-ghost btn-xs btn-circle">✕</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Instructions */}
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <h3 className="card-title">Integration Points</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <span className="badge badge-primary badge-sm mt-0.5">Desktop</span>
              <span>Status indicator shown in top-right corner with label</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="badge badge-secondary badge-sm mt-0.5">Mobile</span>
              <span>Compact indicator in header next to rate limit indicator</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="badge badge-accent badge-sm mt-0.5">Toasts</span>
              <span>Appear in bottom-right corner (configurable position)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebSocketStatusDemo;
