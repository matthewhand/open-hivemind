const COLORS = {
  reset: '\x1b[0m',
  // Greens (bonuses) - lighter to darker
  greenLight: '\x1b[92m', // Bright green (slight bonus)
  greenMed: '\x1b[32m', // Green (moderate bonus)
  greenDark: '\x1b[32;1m', // Bold green (strong bonus)
  // Reds (penalties) - lighter to darker
  redLight: '\x1b[91m', // Bright red (slight penalty)
  redMed: '\x1b[31m', // Red (moderate penalty)
  redDark: '\x1b[31;1m', // Bold red (strong penalty)
  gray: '\x1b[90m', // Gray for neutral
};

/**
 * Generate colorized modifier summary with adjectives for console output
 */
export function generateColorizedModsSummary(mods: Record<string, number | string>): string {
  const parts: string[] = [];

  for (const [name, value] of Object.entries(mods)) {
    if (typeof value !== 'number') {
      continue;
    }

    const absVal = Math.abs(value);
    const isBonus = value > 0;
    const isNeutral = value === 0;

    // Determine adjective and color based on magnitude
    let adjective: string;
    let color: string;

    if (isNeutral) {
      adjective = '';
      color = COLORS.gray;
    } else if (absVal <= 0.1) {
      adjective = 'slight';
      color = isBonus ? COLORS.greenLight : COLORS.redLight;
    } else if (absVal <= 0.3) {
      adjective = 'moderate';
      color = isBonus ? COLORS.greenMed : COLORS.redMed;
    } else if (absVal <= 0.5) {
      adjective = 'strong';
      color = isBonus ? COLORS.greenDark : COLORS.redDark;
    } else {
      adjective = 'very strong';
      color = isBonus ? COLORS.greenDark : COLORS.redDark;
    }

    const sign = value >= 0 ? '+' : '';
    const label = adjective ? `${adjective} ${name}` : name;
    parts.push(`${color}${label}(${sign}${value.toFixed(2)})${COLORS.reset}`);
  }

  return parts.join(' ');
}

/**
 * Generate a human-readable prose explanation of why the bot is responding/skipping
 * Uses modifier magnitudes to add adjectives (slight/moderate/strong)
 */
export function generateProseExplanation(
  mods: Record<string, number | string>,
  decided: boolean,
  wasDirectlyAddressed: boolean,
  hasPostedRecently: boolean
): string {
  // Helper to get adjective based on magnitude
  const getAdjective = (value: number): string => {
    const abs = Math.abs(value);
    if (abs <= 0.1) {
      return 'slightly';
    }
    if (abs <= 0.3) {
      return '';
    } // No adjective for moderate
    if (abs <= 0.5) {
      return 'strongly';
    }
    return 'very strongly';
  };

  // Collect bonuses with magnitudes
  const bonuses: { phrase: string; value: number }[] = [];

  // Direct address reasons
  if (wasDirectlyAddressed) {
    if (typeof mods.Mention === 'number') {
      bonuses.push({ phrase: 'mentioned', value: mods.Mention });
    }
    if (typeof mods.Leading === 'number') {
      bonuses.push({ phrase: 'addressed first', value: mods.Leading });
    }
    if (typeof mods.Reply === 'number') {
      bonuses.push({ phrase: 'replied to', value: mods.Reply });
    }
  }

  // Other bonuses
  if (typeof mods.Recent === 'number' && mods.Recent > 0) {
    bonuses.push({ phrase: 'recently active in chat', value: mods.Recent });
  }
  if (typeof mods.UserActive === 'number' && mods.UserActive > 0) {
    bonuses.push({ phrase: 'user activity', value: mods.UserActive });
  }
  if (typeof mods.OnTopic === 'number') {
    bonuses.push({ phrase: 'on-topic conversation', value: mods.OnTopic });
  }
  if (typeof mods.Q === 'number') {
    bonuses.push({ phrase: 'question asked', value: mods.Q });
  }

  // Collect penalties with magnitudes
  const penalties: { phrase: string; value: number }[] = [];
  if (typeof mods.BotHistory === 'number' && mods.BotHistory < 0) {
    penalties.push({ phrase: 'talked too much', value: mods.BotHistory });
  }
  if (typeof mods.BurstTraffic === 'number' && mods.BurstTraffic < 0) {
    penalties.push({ phrase: 'busy channel', value: mods.BurstTraffic });
  }
  if (typeof mods.Crowded === 'number' && mods.Crowded < 1) {
    penalties.push({ phrase: 'crowded typing', value: 1 - mods.Crowded });
  }
  if (typeof mods.BotRatio === 'number' && mods.BotRatio < 0) {
    penalties.push({ phrase: 'no human participants', value: mods.BotRatio });
  }
  if (typeof mods.AddressedToOther === 'number') {
    penalties.push({ phrase: 'message for someone else', value: mods.AddressedToOther });
  }
  if (typeof mods.OffTopic === 'number') {
    penalties.push({ phrase: 'off-topic', value: mods.OffTopic });
  }

  // Sort by magnitude (highest impact first)
  bonuses.sort((a, b) => b.value - a.value);
  penalties.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

  // Build final sentence with adjectives
  if (decided) {
    if (wasDirectlyAddressed) {
      return bonuses.length > 0
        ? `Responding to direct mention (plus ${bonuses.map((b) => b.phrase).join(', ')}).`
        : 'Responding to direct address.';
    }

    if (bonuses.length > 0) {
      const all = bonuses.map((b) => {
        const adj = getAdjective(b.value);
        return adj ? `${adj} ${b.phrase}` : b.phrase;
      });
      return `Responding due to ${formatList(all)}.`;
    }
    return hasPostedRecently
      ? 'Responding to continue the conversation.'
      : 'Responding based on chance.';
  } else {
    if (penalties.length > 0) {
      const all = penalties.map((p) => {
        const adj = getAdjective(p.value);
        return adj ? `${adj} ${p.phrase}` : p.phrase;
      });
      return `Skipping due to ${formatList(all)}.`;
    }
    return 'Skipping based on low probability.';
  }
}

export function formatList(items: string[]): string {
  if (items.length === 0) {
    return '';
  }
  if (items.length === 1) {
    return items[0];
  }
  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

/**
 * Convert mod string tokens into a structured object for meta output.
 */
export function modsStringsToObject(allModStrings: string[]): Record<string, number | string> {
  const modsObject: Record<string, number | string> = {};
  for (const modStr of allModStrings) {
    // Parse patterns like "Base(0.01 @ never)", "+Recent(+0.5)", "BotHistory(-0.10)"

    const match = modStr.match(/^([+\-×]?)([\w!]+)\(([^)]+)\)$/);
    if (match) {
      // eslint-disable-next-line unused-imports/no-unused-vars
      const [, sign, name, value] = match;
      const numValue = parseFloat(value.replace(/@.*/, '').trim());
      if (!isNaN(numValue)) {
        modsObject[name] = numValue;
      } else {
        modsObject[name] = value; // Keep as string if not purely numeric
      }
    }
  }
  return modsObject;
}
