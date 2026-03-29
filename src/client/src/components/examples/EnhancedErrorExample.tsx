/**
 * Example Component Demonstrating Enhanced Error Handling
 *
 * This example shows how to integrate the enhanced error handling system
 * into your React components for marketplace operations, tool execution,
 * provider connections, and bot operations.
 */

import React, { useState } from 'react';
import EnhancedErrorAlert from '../DaisyUI/EnhancedErrorAlert';
import Button from '../DaisyUI/Button';
import { useEnhancedErrorHandling, type ActionableErrorDisplay } from '../../utils/enhancedErrorHandling';

export const EnhancedErrorExample: React.FC = () => {
  const [error, setError] = useState<ActionableErrorDisplay | null>(null);
  const [loading, setLoading] = useState(false);
  const { handleError } = useEnhancedErrorHandling();

  /**
   * Example 1: Marketplace Package Installation
   */
  const handleInstallPackage = async (repoUrl: string) => {
    try {
      setError(null);
      setLoading(true);

      const response = await fetch('/api/marketplace/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw errorData;
      }

      const data = await response.json();
      console.log('Package installed:', data);

      // Show success message
      alert(`Successfully installed ${data.package.displayName}!`);
    } catch (err) {
      const actionableError = handleError(err, 'Installation Failed');
      setError(actionableError);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Example 2: Tool Execution
   */
  const handleExecuteTool = async (serverName: string, toolName: string, args: any) => {
    try {
      setError(null);
      setLoading(true);

      const response = await fetch('/api/mcp/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverName, toolName, arguments: args }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw errorData;
      }

      const data = await response.json();
      console.log('Tool executed:', data);

      // Show result
      alert('Tool executed successfully!');
    } catch (err) {
      const actionableError = handleError(err, 'Tool Execution Failed');
      setError(actionableError);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Example 3: Provider Connection
   */
  const handleConnectProvider = async (providerId: string, config: any) => {
    try {
      setError(null);
      setLoading(true);

      const response = await fetch(`/api/providers/${providerId}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw errorData;
      }

      const data = await response.json();
      console.log('Provider connected:', data);

      // Show success
      alert('Provider connected successfully!');
    } catch (err) {
      const actionableError = handleError(err, 'Connection Failed');
      setError(actionableError);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Example 4: Bot Startup
   */
  const handleStartBot = async (botId: string) => {
    try {
      setError(null);
      setLoading(true);

      const response = await fetch(`/api/bots/${botId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw errorData;
      }

      const data = await response.json();
      console.log('Bot started:', data);

      // Show success
      alert('Bot started successfully!');
    } catch (err) {
      const actionableError = handleError(err, 'Bot Startup Failed');
      setError(actionableError);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Example 5: Simulating Different Error Types
   */
  const simulateError = (errorType: string) => {
    let mockError: any;

    switch (errorType) {
      case 'network':
        mockError = {
          error: 'Network error',
          message: 'Failed to connect to the server',
          errorType: 'network_error',
          suggestions: [
            'Check your internet connection',
            'Verify the service URL is correct',
            'Try again in a few moments',
          ],
          canRetry: true,
          statusCode: 503,
        };
        break;

      case 'auth':
        mockError = {
          error: 'Authentication failed',
          message: 'Invalid API key for OpenAI provider',
          errorType: 'auth_invalid_key',
          suggestions: [
            'Verify your API key is correct',
            'Check that the API key hasn\'t been revoked',
            'Generate a new API key if needed',
          ],
          canRetry: false,
          docsUrl: 'https://docs.open-hivemind.ai/authentication',
          statusCode: 401,
        };
        break;

      case 'rate_limit':
        mockError = {
          error: 'Rate limit exceeded',
          message: 'Too many requests. Retry after 60 seconds.',
          errorType: 'rate_limit_exceeded',
          suggestions: [
            'Wait 60 seconds before trying again',
            'Reduce the frequency of requests',
            'Consider upgrading your plan for higher rate limits',
          ],
          canRetry: true,
          retryAfter: 60,
          docsUrl: 'https://docs.open-hivemind.ai/rate-limits',
          statusCode: 429,
        };
        break;

      case 'validation':
        mockError = {
          error: 'Validation error',
          message: 'Required fields are missing',
          errorType: 'validation_required_field',
          suggestions: [
            'Fill in all required fields marked with *',
            'Check the form for empty required fields',
            'Ensure all mandatory configuration is provided',
          ],
          canRetry: false,
          statusCode: 400,
        };
        break;

      case 'git':
        mockError = {
          error: 'Installation failed',
          message: 'Failed to clone repository from GitHub',
          errorType: 'marketplace_git_error',
          suggestions: [
            'Verify the GitHub repository URL is correct and accessible',
            'Check if the repository is public or you have access',
            'Ensure your server has internet connectivity',
          ],
          canRetry: true,
          docsUrl: 'https://docs.open-hivemind.ai/marketplace/troubleshooting',
          statusCode: 400,
        };
        break;

      case 'build':
        mockError = {
          error: 'Installation failed',
          message: 'Package build failed with exit code 1',
          errorType: 'marketplace_build_failed',
          suggestions: [
            'Check the package build logs for specific errors',
            'The package may have missing or incompatible dependencies',
            'Report the issue to the package maintainer',
          ],
          canRetry: false,
          contactSupport: true,
          docsUrl: 'https://docs.open-hivemind.ai/marketplace/troubleshooting',
          details: 'npm ERR! Failed at the build script',
          correlationId: 'err-123-abc-456',
          statusCode: 500,
        };
        break;

      default:
        mockError = {
          error: 'Unknown error',
          message: 'An unexpected error occurred',
          suggestions: [
            'Try refreshing the page',
            'Check your internet connection',
            'Contact support if the issue persists',
          ],
          canRetry: true,
          contactSupport: true,
        };
    }

    const actionableError = handleError(mockError, mockError.error);
    setError(actionableError);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold mb-4">Enhanced Error Handling Examples</h1>

      {/* Error Alert Display */}
      {error && (
        <EnhancedErrorAlert
          title={error.title}
          message={error.message}
          errorType={error.errorType}
          suggestions={error.suggestions}
          canRetry={error.canRetry}
          retryAfter={error.retryAfter}
          docsUrl={error.docsUrl}
          contactSupport={error.contactSupport}
          correlationId={error.correlationId}
          details={error.details}
          onRetry={() => {
            console.log('Retry clicked');
            setError(null);
          }}
          onDismiss={() => setError(null)}
          className="mb-6"
        />
      )}

      {/* Example Operations */}
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Real Operations</h2>
          <p className="text-sm text-base-content/70 mb-4">
            These buttons trigger real API calls and demonstrate error handling in action.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              variant="primary"
              onClick={() => handleInstallPackage('https://github.com/example/invalid-repo')}
              disabled={loading}
            >
              Install Package (Will Fail)
            </Button>

            <Button
              variant="primary"
              onClick={() => handleExecuteTool('test-server', 'test-tool', {})}
              disabled={loading}
            >
              Execute Tool (May Fail)
            </Button>

            <Button
              variant="primary"
              onClick={() => handleConnectProvider('slack', { invalid: 'config' })}
              disabled={loading}
            >
              Connect Provider (Will Fail)
            </Button>

            <Button
              variant="primary"
              onClick={() => handleStartBot('invalid-bot-id')}
              disabled={loading}
            >
              Start Bot (Will Fail)
            </Button>
          </div>
        </div>
      </div>

      {/* Simulated Errors */}
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Simulated Error Types</h2>
          <p className="text-sm text-base-content/70 mb-4">
            Click these buttons to see different error types and their corresponding messages.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => simulateError('network')}
            >
              Network Error
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => simulateError('auth')}
            >
              Auth Error
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => simulateError('rate_limit')}
            >
              Rate Limit
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => simulateError('validation')}
            >
              Validation Error
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => simulateError('git')}
            >
              Git Error
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => simulateError('build')}
            >
              Build Error
            </Button>
          </div>
        </div>
      </div>

      {/* Documentation */}
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Key Features</h2>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li><strong>Specific Error Types:</strong> Each error is classified for targeted handling</li>
            <li><strong>Actionable Suggestions:</strong> Users get clear steps to resolve issues</li>
            <li><strong>Retry Capability:</strong> Automatic retry with countdown for transient failures</li>
            <li><strong>Documentation Links:</strong> Direct access to relevant troubleshooting guides</li>
            <li><strong>Support Integration:</strong> Easy way to contact support with pre-filled details</li>
            <li><strong>Technical Details:</strong> Collapsible section for debugging information</li>
            <li><strong>Correlation IDs:</strong> Track errors across systems for support</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default EnhancedErrorExample;
