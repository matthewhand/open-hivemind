import Debug from 'debug';
import Ajv from 'ajv';

const debug = Debug('app:MCPSchemaRegistry');

export class MCPSchemaRegistry {
  private static instance: MCPSchemaRegistry;
  private ajv: Ajv;

  // Map of serverName -> Map of toolName -> any (original JSON schema)
  private schemas = new Map<string, Map<string, any>>();

  // Map of serverName -> Map of toolName -> ValidateFunction
  private validators = new Map<string, Map<string, any>>();

  private constructor() {
    this.ajv = new Ajv({ strict: false, allErrors: true });
  }

  public static getInstance(): MCPSchemaRegistry {
    if (!MCPSchemaRegistry.instance) {
      MCPSchemaRegistry.instance = new MCPSchemaRegistry();
    }
    return MCPSchemaRegistry.instance;
  }

  /**
   * Register a tool schema for a specific server and tool
   */
  public registerToolSchema(serverName: string, toolName: string, inputSchema: any): void {
    if (!serverName || !toolName) {
      debug('Cannot register schema: serverName and toolName are required');
      return;
    }

    if (!this.schemas.has(serverName)) {
      this.schemas.set(serverName, new Map<string, any>());
      this.validators.set(serverName, new Map<string, any>());
    }

    if (!inputSchema) {
      debug(`No input schema provided for tool ${toolName} on server ${serverName}`);
      return;
    }

    try {
      this.schemas.get(serverName)?.set(toolName, inputSchema);
      const validate = this.ajv.compile(inputSchema);
      this.validators.get(serverName)?.set(toolName, validate);
      debug(`Successfully registered schema for tool ${toolName} on server ${serverName}`);
    } catch (error) {
      debug(`Error compiling schema for tool ${toolName} on server ${serverName}:`, error);
    }
  }

  /**
   * Get the registered schema for a specific tool
   */
  public getToolSchema(serverName: string, toolName: string): any {
    return this.schemas.get(serverName)?.get(toolName) || null;
  }

  /**
   * Validate arguments against a registered schema
   * Throws an error if validation fails
   */
  public validateToolArguments(serverName: string, toolName: string, args: any): void {
    const serverValidators = this.validators.get(serverName);
    if (!serverValidators) {
      // If server is not registered, we pass validation (or should we fail?)
      // Allowing to pass to not break things if schema is not available
      return;
    }

    const validate = serverValidators.get(toolName);
    if (!validate) {
      // If tool is not registered or has no schema, allow it
      return;
    }

    const isValid = validate(args);
    if (!isValid) {
      const errors = validate.errors;
      const rejectionReason = this.ajv.errorsText(errors);

      // Log rejected call
      debug(`Tool execution rejected for ${toolName} on ${serverName}`);
      debug(`Rejection reason: ${rejectionReason}`);
      debug(`Argument summary: ${JSON.stringify(args).substring(0, 100)}`);

      const error_enhanced = new Error(`Validation failed for tool ${toolName} arguments: ${rejectionReason}`);
      (error_enhanced as any).suggestions = ['Check the tool parameter requirements', 'Ensure parameter types match the schema'];
      (error_enhanced as any).canRetry = false;
      (error_enhanced as any).toolName = toolName;
      (error_enhanced as any).serverName = serverName;
      throw error_enhanced;
    }
  }
}

export default MCPSchemaRegistry;
