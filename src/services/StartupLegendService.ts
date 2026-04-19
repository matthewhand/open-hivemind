import Logger from '@common/logger';

const appLogger = Logger.withContext('app:startup');

/**
 * StartupLegendService
 *
 * Prints a helpful legend explaining the various probability modifiers used in
 * decision logs (e.g., "Density", "NoOpportunity").
 */
export default class StartupLegendService {
  public static printLegend(): void {
    console.info(
      '\n╔══════════════════════════════════════════════════════════════════════════════╗'
    );
    console.info(
      '║                      🎲 PROBABILITY MODIFIERS LEGEND                         ║'
    );
    console.info(
      '╠══════════════════════════════════════════════════════════════════════════════╣'
    );
    console.info(
      '║  Base           : Starting probability (default 0%)                          ║'
    );
    console.info(
      '║  +Recent        : Bonus for recent activity (0.5 / (1 + minutes))            ║'
    );
    console.info(
      '║  UserDensity    : Penalty for multiple users talking (-0.02 per extra)       ║'
    );
    console.info(
      '║  BotRatio       : Penalty if no humans in history (-0.30)                    ║'
    );
    console.info('║  BotHistory     : Penalty for frequency of current bot recently             ║');
    console.info(
      '║  UserCount      : Penalty for multiple people talking (-0.02 per extra)      ║'
    );
    console.info(
      '║  BurstTraffic   : Penalty for total message volume in last 1m (-0.10/msg)    ║'
    );
    console.info('║  Chan           : Channel-specific odds offset (Configurable)               ║');
    console.info(
      '║  -OffTopic      : Penalty for semantic irrelevance (-0.1)                    ║'
    );
    console.info('║  BotResponse    : Penalty for other bots (default -0.1)                     ║');
    console.info('║  +Mention       : Direct address bonus (+0.5)                               ║');
    console.info('║  +Leading       : Address at START of message (+1.0 additional)             ║');
    console.info(
      '║  AddressedToOther: Penalty if addressed elsewhere (-0.5)                     ║'
    );
    console.info(
      '╚══════════════════════════════════════════════════════════════════════════════╝\n'
    );

    appLogger.debug('Startup legend printed');
  }
}
