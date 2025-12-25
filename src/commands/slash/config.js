const configManager = require('../../config/configurationManager');
const permissions = require('../../utils/permissions');

async function execute(interaction) {
  try {
    // Check permissions
    const userAllowed = permissions.isUserAllowed(interaction.user.id, 'config');
    const roleAllowed = permissions.isRoleAllowed(interaction.member.roles.cache, 'config');

    if (!userAllowed && !roleAllowed) {
      await interaction.reply({
        content: 'You do not have permission to use this command.',
        ephemeral: true,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
    case 'view':
      await handleView(interaction);
      break;
    case 'set':
      await handleSet(interaction);
      break;
    case 'get':
      await handleGet(interaction);
      break;
    case 'reload':
      await handleReload(interaction);
      break;
    default:
      await interaction.reply({
        content: 'Invalid subcommand.',
        ephemeral: true,
      });
    }
  } catch (error) {
    console.error('Error executing config command:', error);
    await interaction.reply({
      content: 'An error occurred while executing the command.',
      ephemeral: true,
    });
  }
}

async function handleView(interaction) {
  const config = configManager.getAll();
  const configString = Object.entries(config)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');

  await interaction.reply({
    content: `Current Configuration:\n${configString}`,
    ephemeral: true,
  });
}

async function handleSet(interaction) {
  const key = interaction.options.getString('key');
  const value = interaction.options.getString('value');

  if (!key || !value) {
    await interaction.reply({
      content: 'Key and value are required.',
      ephemeral: true,
    });
    return;
  }

  // Validate configuration
  const validation = configManager.validate({ [key]: value });
  if (!validation.valid) {
    await interaction.reply({
      content: `Invalid configuration: ${validation.errors.join(', ')}`,
      ephemeral: true,
    });
    return;
  }

  configManager.set(key, value);
  await interaction.reply({
    content: `Configuration updated: ${key} = ${value}`,
    ephemeral: true,
  });
}

async function handleGet(interaction) {
  const key = interaction.options.getString('key');

  if (!key) {
    await interaction.reply({
      content: 'Key is required.',
      ephemeral: true,
    });
    return;
  }

  const value = configManager.get(key);
  await interaction.reply({
    content: `${key}: ${value}`,
    ephemeral: true,
  });
}

async function handleReload(interaction) {
  configManager.reload();
  await interaction.reply({
    content: 'Configuration reloaded.',
    ephemeral: true,
  });
}

module.exports = { execute };