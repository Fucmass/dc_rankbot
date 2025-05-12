const { Client, Events, SlashCommandBuilder, GatewayIntentBits, PermissionsBitField } = require('discord.js');
const { token } = require("./config.json");

// Create a new Discord client with specific intents
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}!`);

  // Define and register commands
  const ping = new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!');
  await client.application?.commands.create(ping);

  const selfdemote = new SlashCommandBuilder()
    .setName('selfdemote')
    .setDescription('Demotes yourself from the server.');
  await client.application?.commands.create(selfdemote);

  const rank = new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Shows your rank in the server.');
  await client.application?.commands.create(rank);

  const giverole = new SlashCommandBuilder()
    .setName('giverole')
    .setDescription('Gives a role to a user.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to give the role to.')
        .setRequired(true))
    .addRoleOption(option =>
      option.setName('role')
        .setDescription('The role to assign.')
        .setRequired(true));
  await client.application?.commands.create(giverole);


  const adduser = new SlashCommandBuilder()
    .setName('adduser')
    .setDescription('Adds a user to the database.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to add to the database.')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('roles')
        .setDescription('The roles to assign to the user.')
        .setRequired(true));
  await client.application?.commands.create(adduser);
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  // Handle /ping command
  if (interaction.commandName === 'ping') {
    interaction.reply('Pong!');
  }

  // Handle /selfdemote command
  if (interaction.commandName === 'selfdemote') {
    interaction.reply('You have been demoted!');
  }

  // Handle /rank command
  if (interaction.commandName === 'rank') {
    const member = interaction.member;
    const specificRoles = ['Perms', 'Dirty Outsiders'];

    const roles = member.roles.cache
      .filter(role => specificRoles.includes(role.name))
      .map(role => role.name)
      .join(', ');

    if (roles.length > 0) {
      await interaction.reply(`You have these roles: ${roles}`);
    } else {
      await interaction.reply('You do not have any of the specified roles.');
    }
  }

  // Handle /giverole command
  if (interaction.commandName === 'giverole') {
    const targetUser = interaction.options.getUser('user');
    const targetRole = interaction.options.getRole('role');
    const member = interaction.guild.members.cache.get(targetUser.id);

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return interaction.reply({ content: 'You do not have permission to manage roles.', ephemeral: true });
    }

    if (!member) {
      return interaction.reply({ content: 'User not found in this server.', ephemeral: true });
    }

    try {
      await member.roles.add(targetRole);
      await interaction.reply(`Successfully gave the role **${targetRole.name}** to **${targetUser.tag}**.`);
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: 'Failed to assign the role. Make sure the bot has the correct permissions and the role is below the bot\'s highest role.', ephemeral: true });
    }
  }
});

client.login(token); 