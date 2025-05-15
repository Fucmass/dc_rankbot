const { Client, Events, SlashCommandBuilder, GatewayIntentBits, PermissionsBitField, MessageFlags } = require('discord.js');
const { token } = require("./config.json");
const mysql = require('mysql2/promise');
require('dotenv').config();



// Create a MariaDB connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});


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



  const rankup = new SlashCommandBuilder()
    .setName('rankup')
    .setDescription('Gives users the next rank.')
    .addStringOption(option =>
      option.setName('users')
        .setDescription('Comma-separated list of user mentions or IDs to rank up.')
        .setRequired(true));
  await client.application?.commands.create(rankup);



  const forcederank = new SlashCommandBuilder()
    .setName('forcederank')
    .setDescription('Demotes users.')
    .addStringOption(option =>
      option.setName('users')
        .setDescription('Comma-separated list of user mentions or IDs to demote.')
        .setRequired(true));
  await client.application?.commands.create(forcederank);



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



  const verifyuser = new SlashCommandBuilder()
    .setName('verifyuser')
    .setDescription('Adds yourself to the database with your current roles.');
  await client.application?.commands.create(verifyuser);
});




client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;


  // Function to check if a user has a required role
  async function hasRequiredRole(discordId, requiredRoles) {
    try {
      const query = `SELECT roles FROM users WHERE discord_id = ?`;
      const [rows] = await pool.execute(query, [discordId]);

      if (rows.length === 0) {
        console.log(`User with Discord ID ${discordId} not found in the database.`);
        return false; // User not found in the database
      }

      const userRoles = rows[0].roles.split(', '); // Assuming roles are stored as a comma-separated string
      console.log(`User roles: ${userRoles}`);
      console.log(`Required roles: ${requiredRoles}`);

      return requiredRoles.some(role => userRoles.includes(role));
    } catch (error) {
      console.error('Error checking user roles:', error);
      return false;
    }
  }


  // Handle /ping command
  if (interaction.commandName === 'ping') {
    try {
      const sentTimestamp = interaction.createdTimestamp; // Timestamp when the interaction was created
      const currentTimestamp = Date.now(); // Current timestamp
      const responseTime = currentTimestamp - sentTimestamp; // Calculate the response time

      await interaction.reply(`Pong! Response time: ${responseTime}ms`);
    } catch (error) {
      console.error('Error replying to /ping command:', error);
      await interaction.reply({ content: 'An error occurred while processing the command.', ephemeral: true });
    }
  }


  // Handle /selfdemote command
  if (interaction.commandName === 'selfdemote') {
    interaction.reply('You have been demoted!');
  }


  // Handle /rank command
  if (interaction.commandName === 'rank') {
    const member = interaction.member;
    const specificRoles = ['Perms', 'Normie', 'Dirty Outsider'];

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


  // Handle /rankup command
  if (interaction.commandName === 'rankup') {
    const roleHierarchy = ['test role 1', 'test role 2', 'test role 3']; // Add roles in ascending order of hierarchy

    const requiredRoles = ['Perms'];
    const hasAccess = await hasRequiredRole(interaction.user.id, requiredRoles);
    if (!hasAccess) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    const usersInput = interaction.options.getString('users');
    const userIds = usersInput.split(',').map(user => user.trim().replace(/[<@!>]/g, '')); // Extract user IDs from mentions or raw input

    const results = [];

    for (const userId of userIds) {
      const member = interaction.guild.members.cache.get(userId);

      if (!member) {
        results.push(`User with ID ${userId} not found in this server.`);
        continue;
      }

      const currentRole = roleHierarchy.find(roleName => member.roles.cache.some(role => role.name === roleName));

      if (!currentRole) {
        results.push(`${member.user.tag} does not have any roles in the hierarchy.`);
        continue;
      }

      const currentRoleIndex = roleHierarchy.indexOf(currentRole);
      const nextRole = roleHierarchy[currentRoleIndex + 1];

      if (!nextRole) {
        results.push(`${member.user.tag} already has the highest role in the hierarchy.`);
        continue;
      }

      const nextRoleObject = interaction.guild.roles.cache.find(role => role.name === nextRole);

      if (!nextRoleObject) {
        results.push(`The role "${nextRole}" does not exist on this server.`);
        continue;
      }

      try {
        await member.roles.remove(member.roles.cache.find(role => role.name === currentRole));
        await member.roles.add(nextRoleObject);
        results.push(`Successfully promoted **${member.user.tag}** from **${currentRole}** to **${nextRole}**.`);
      } catch (error) {
        console.error(error);
        results.push(`Failed to update roles for **${member.user.tag}**. Make sure the bot has the correct permissions.`);
      }
    }

    await interaction.reply(results.join('\n'));
  }


  // Handle /forcederank command
  if (interaction.commandName === 'forcederank') {
    // Define the role hierarchy
    const roleHierarchy = ['test role 1', 'test role 2', 'test role 3']; // Add roles in ascending order of hierarchy

    // Check if the user has the required roles
    const requiredRoles = ['Perms'];
    const hasAccess = await hasRequiredRole(interaction.user.id, requiredRoles);
    if (!hasAccess) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    const usersInput = interaction.options.getString('users');
    const userIds = usersInput.split(',').map(user => user.trim().replace(/[<@!>]/g, '')); // Extract user IDs from mentions or raw input

    const results = [];

    for (const userId of userIds) {
      const member = interaction.guild.members.cache.get(userId);

      if (!member) {
        results.push(`User with ID ${userId} not found in this server.`);
        continue;
      }

      // Find the highest role the user currently has in the hierarchy
      const currentRole = roleHierarchy.find(roleName => member.roles.cache.some(role => role.name === roleName));
      if (!currentRole) {
        results.push(`${member.user.tag} does not have any roles in the hierarchy.`);
        continue;
      }

      // Determine the previous role in the hierarchy
      const currentRoleIndex = roleHierarchy.indexOf(currentRole);
      const previousRole = roleHierarchy[currentRoleIndex - 1];
      if (!previousRole) {
        results.push(`${member.user.tag} already has the lowest role in the hierarchy.`);
        continue;
      }

      // Get the role objects for the current and previous roles
      const previousRoleObject = interaction.guild.roles.cache.find(role => role.name === previousRole);
      if (!previousRoleObject) {
        results.push(`The role "${previousRole}" does not exist on this server.`);
        continue;
      }

      try {
        // Remove the current role and add the previous role
        await member.roles.remove(member.roles.cache.find(role => role.name === currentRole));
        await member.roles.add(previousRoleObject);
        results.push(`Successfully demoted **${member.user.tag}** from **${currentRole}** to **${previousRole}**.`);
      } catch (error) {
        console.error(error);
        results.push(`Failed to update roles for **${member.user.tag}**. Make sure the bot has the correct permissions.`);
      }
    }

    await interaction.reply(results.join('\n'));
  }




    // Handle /giverole command
    if (interaction.commandName === 'giverole') {

      // Check if the user has the required roles
      const requiredRoles = ['Perms'];
      // Gives access to users with the specified roles
      const hasAccess = await hasRequiredRole(interaction.user.id, requiredRoles);
      if (!hasAccess) {
        return interaction.reply({ content: 'You do not have permission to use this command.', flags: MessageFlags.Ephemeral });
      }

      // Proceed with the command
      const targetUser = interaction.options.getUser('user');
      const targetRole = interaction.options.getRole('role');
      const member = interaction.guild.members.cache.get(targetUser.id);




      if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
        return interaction.reply({ content: 'You do not have permission to manage roles.', flags: MessageFlags.Ephemeral });
      }

      if (!member) {
        return interaction.reply({ content: 'User not found in this server.', flags: MessageFlags.Ephemeral });
      }

      try {
        await member.roles.add(targetRole);
        await interaction.reply(`Successfully gave the role **${targetRole.name}** to **${targetUser.tag}**.`);
      } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'Failed to assign the role. Make sure the bot has the correct permissions and the role is below the bot\'s highest role.', ephemeral: true });
      }
    }


    // Handle /verifyuser command
    if (interaction.commandName === 'verifyuser') {
      const targetUser = interaction.user; // Automatically get the user who invoked the command
      const member = interaction.guild.members.cache.get(targetUser.id);

      if (!member) {
        return interaction.reply({ content: 'User not found in this server.', ephemeral: true });
      }
      const specificRoles = ['Perms', 'Normie'];
      // Get the user's roles that match the specific roles
      const roles = member.roles.cache
        .filter(role => specificRoles.includes(role.name))
        .map(role => role.name)
        .join(', ');

      try {
        // Insert the user into the database
        const query = `
        INSERT INTO users (discord_id, username, roles, created_at)
        VALUES (?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE username = VALUES(username), roles = VALUES(roles);
      `;
        const [result] = await pool.execute(query, [targetUser.id, targetUser.tag, roles]);

        await interaction.reply(`You have been added to the database with the following roles: **${roles}** (Database ID: **${result.insertId}**).`);
      } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'Failed to add you to the database.', ephemeral: true });
      }
    }
  });

client.login(token);