import Debug from 'debug';
import express, { type Application } from 'express';
import type { SlackEventProcessor } from '../SlackEventProcessor';
import type { SlackInteractiveHandler } from '../SlackInteractiveHandler';
import type { SlackSignatureVerifier } from '../SlackSignatureVerifier';

const debug = Debug('app:SlackService:RouteRegistry');

/**
 * Handles registration of Slack-related routes and middleware
 */
export class SlackRouteRegistry {
  private app: Application;

  constructor(app: Application) {
    this.app = app;
  }

  /**
   * Register routes for a specific Slack bot
   */
  public registerBotRoutes(
    botName: string,
    signatureVerifier: SlackSignatureVerifier,
    eventProcessor: SlackEventProcessor,
    interactiveHandler: SlackInteractiveHandler
  ): void {
    debug(`Registering routes for bot: ${botName}`);

    // Action endpoint with URL-encoded middleware
    this.app.post(
      `/slack/${botName}/action-endpoint`,
      express.urlencoded({ extended: true }),
      signatureVerifier.verify.bind(signatureVerifier),
      eventProcessor.handleActionRequest.bind(eventProcessor)
    );

    // Interactive endpoint with URL-encoded middleware
    this.app.post(
      `/slack/${botName}/interactive-endpoint`,
      express.urlencoded({ extended: true }),
      signatureVerifier.verify.bind(signatureVerifier),
      interactiveHandler.handleRequest.bind(interactiveHandler)
    );

    // Help endpoint for slash commands
    this.app.post(
      `/slack/${botName}/help`,
      express.urlencoded({ extended: true }),
      signatureVerifier.verify.bind(signatureVerifier),
      eventProcessor.handleHelpRequest.bind(eventProcessor)
    );

    debug(`Routes registered for bot: ${botName}`);
  }

  /**
   * Register routes for multiple bots
   */
  public registerMultipleBotRoutes(
    botConfigs: Map<
      string,
      {
        signatureVerifier: SlackSignatureVerifier;
        eventProcessor: SlackEventProcessor;
        interactiveHandler: SlackInteractiveHandler;
      }
    >
  ): void {
    for (const [botName, components] of botConfigs) {
      this.registerBotRoutes(
        botName,
        components.signatureVerifier,
        components.eventProcessor,
        components.interactiveHandler
      );
    }
  }

  /**
   * Unregister routes for a specific bot (useful for cleanup)
   */
  public unregisterBotRoutes(botName: string): void {
    debug(`Unregistering routes for bot: ${botName}`);
    // Note: Express doesn't have a built-in way to remove routes,
    // but this method provides a placeholder for future implementation
    // or for tracking which routes are registered
  }
}
