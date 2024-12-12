const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies with Pong!'),
	async execute(interaction, client, list, stats) {
          const delay = Math.abs(Date.now() - interaction.createdTimestamp);
          await interaction.reply(`Pong!\n**Latency**: ${delay}ms\n**API Ping**: ${client.ws.ping}ms`);
	},
};
