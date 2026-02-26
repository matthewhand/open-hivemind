import Debug from 'debug';
import { DatabaseManager } from '@src/database/DatabaseManager';
import { MCPService } from '@src/mcp/MCPService';

const debug = Debug('app:HealthCheckService');

export interface HealthCheckResult {
    database: boolean;
    mcpServers: { [serverName: string]: boolean };
    timestamp: string;
}

export interface DetailedHealthCheckResult extends HealthCheckResult {
    configuration: boolean;
    services: boolean;
}

/**
 * Service for performing health checks on system dependencies.
 * Checks database connectivity, MCP server connections, and configuration status.
 */
export class HealthCheckService {
    private static instance: HealthCheckService;

    private constructor() { }

    /**
     * Gets the singleton instance of HealthCheckService.
     *
     * @returns {HealthCheckService} The singleton instance
     */
    public static getInstance(): HealthCheckService {
        if (!HealthCheckService.instance) {
            HealthCheckService.instance = new HealthCheckService();
        }
        return HealthCheckService.instance;
    }

    /**
     * Check database connectivity by executing a simple query.
     *
     * @returns {Promise<boolean>} True if database is healthy, false otherwise
     */
    public async checkDatabase(): Promise<boolean> {
        try {
            const db = DatabaseManager.getInstance();

            // Check if database is configured and connected
            if (!db.isConfigured() || !db.isConnected()) {
                debug('Database not configured or not connected');
                return false;
            }

            // Execute simple query to verify connection is working
            // Using get method which is available on the DatabaseManager
            const result = await db.getStats();
            debug('Database health check passed, stats:', result);
            return true;
        } catch (error) {
            debug('Database health check failed:', error);
            return false;
        }
    }

    /**
     * Check MCP server connection status.
     * Returns a map of server names to their health status.
     *
     * @returns {Promise<{ [serverName: string]: boolean }>} Map of server health status
     */
    public async checkMCPServers(): Promise<{ [serverName: string]: boolean }> {
        const results: { [serverName: string]: boolean } = {};

        try {
            const mcpService = MCPService.getInstance();
            const connectedServers = mcpService.getConnectedServers();

            // If a server is in the connected servers list, it's considered healthy
            for (const serverName of connectedServers) {
                results[serverName] = true;
                debug(`MCP server ${serverName} is healthy`);
            }

            // Also check if there are tools available for each server
            const allTools = mcpService.getAllTools();
            debug(`Total MCP tools available: ${allTools.length}`);
        } catch (error) {
            debug('MCP servers health check failed:', error);
        }

        return results;
    }

    /**
     * Check if configuration is properly loaded.
     *
     * @returns {Promise<boolean>} True if configuration is healthy
     */
    public async checkConfiguration(): Promise<boolean> {
        try {
            // Basic configuration check - verify that essential config can be accessed
            // The ConfigurationManager is a singleton that loads config on first access
            // If we can import and use it, configuration is healthy
            const { ConfigurationManager } = await import('@src/config/ConfigurationManager');
            const configManager = ConfigurationManager.getInstance();

            // Try to get the environment config to verify config is loaded
            const envConfig = configManager.getConfig('environment');
            if (envConfig) {
                debug('Configuration health check passed');
                return true;
            }

            debug('Configuration health check: no environment config found');
            return false;
        } catch (error) {
            debug('Configuration health check failed:', error);
            return false;
        }
    }

    /**
     * Check if core services are operational.
     *
     * @returns {Promise<boolean>} True if services are healthy
     */
    public async checkServices(): Promise<boolean> {
        try {
            // Check if we can access key services
            // This is a basic check - services are considered healthy if they can be instantiated
            const mcpService = MCPService.getInstance();
            const db = DatabaseManager.getInstance();

            // Services exist and are accessible
            debug('Services health check passed');
            return true;
        } catch (error) {
            debug('Services health check failed:', error);
            return false;
        }
    }

    /**
     * Perform a full health check on all dependencies.
     *
     * @returns {Promise<HealthCheckResult>} Complete health check results
     */
    public async performFullCheck(): Promise<HealthCheckResult> {
        debug('Performing full health check...');

        const [database, mcpServers] = await Promise.all([
            this.checkDatabase(),
            this.checkMCPServers(),
        ]);

        const result: HealthCheckResult = {
            database,
            mcpServers,
            timestamp: new Date().toISOString(),
        };

        debug('Full health check result:', result);
        return result;
    }

    /**
     * Perform a detailed health check including all dependencies.
     *
     * @returns {Promise<DetailedHealthCheckResult>} Detailed health check results
     */
    public async performDetailedCheck(): Promise<DetailedHealthCheckResult> {
        debug('Performing detailed health check...');

        const [database, mcpServers, configuration, services] = await Promise.all([
            this.checkDatabase(),
            this.checkMCPServers(),
            this.checkConfiguration(),
            this.checkServices(),
        ]);

        const result: DetailedHealthCheckResult = {
            database,
            mcpServers,
            configuration,
            services,
            timestamp: new Date().toISOString(),
        };

        debug('Detailed health check result:', result);
        return result;
    }

    /**
     * Check if the system is ready to accept requests.
     * This is used for readiness probes.
     *
     * @returns {Promise<boolean>} True if system is ready
     */
    public async isReady(): Promise<boolean> {
        const health = await this.performFullCheck();

        // System is ready if database is available (or not required)
        // MCP servers are optional - system can function without them
        return health.database || !this.isDatabaseRequired();
    }

    /**
     * Check if the system is alive.
     * This is used for liveness probes.
     *
     * @returns {boolean} True if system is alive
     */
    public isAlive(): boolean {
        // If we can execute this, the system is alive
        return true;
    }

    /**
     * Determine if database is required for the system to function.
     * This can be configured based on environment or deployment.
     *
     * @returns {boolean} True if database is required
     */
    private isDatabaseRequired(): boolean {
        // In most deployments, database is optional for basic functionality
        // Set DATABASE_REQUIRED=true to make database health check mandatory
        return process.env.DATABASE_REQUIRED === 'true';
    }
}

export default HealthCheckService;
