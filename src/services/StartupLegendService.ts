import Debug from 'debug';
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
        console.info('\n╔══════════════════════════════════════════════════════════════════════════════╗');
        console.info('║                      🎲 PROBABILITY MODIFIERS LEGEND                         ║');
        console.info('╠══════════════════════════════════════════════════════════════════════════════╣');
        console.info('║  Base          : Starting probability (default 1-5%)                         ║');
        console.info('║  +Recent       : Bonus when bot has spoken recently in this channel (+0.5)   ║');
        console.info('║  UserDensity   : Penalty for multiple users talking (-2% per extra user)     ║');
        console.info('║  BotDensity    : Penalty for multiple bots talking (-5% per extra bot)       ║');
        console.info('║  MsgDensity    : Penalty for self-spamming recently (-5% per msg)            ║');
        console.info('║  +UserResponse : Bonus for responding to a human user (+0.05)                ║');
        console.info('║  +OnTopic      : Bonus if message is semantically relevant to context (+0.4) ║');
        console.info('║  -OffTopic     : Penalty if message effectively changes subject (-0.1)       ║');
        console.info('║  -NoOpportunity: Penalty if message offers no clear reply opportunity (-0.5) ║');
        console.info('║  BotResponse   : Modifier for responding to other bots (default -0.1)        ║');
        console.info('║  +Mention      : Direct address bonus (+1.0, guaranteed reply)               ║');
        console.info('║  AddressedToOther: Penalty if message starts with @SomeoneElse (-0.5)        ║');
        console.info('╚══════════════════════════════════════════════════════════════════════════════╝\n');

        appLogger.debug('Startup legend printed');
    }
}
