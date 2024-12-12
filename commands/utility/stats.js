const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('stats')
		.setDescription('Shows stats'),
	async execute(interaction, client, list, stats) {
          //const delay = Math.abs(Date.now() - interaction.createdTimestamp);

          //await client.guilds.cache.fetch(); // update the chache for accurate info.
          let serverCount = client.guilds.cache.size;
          var msg =
            `total attempted fetches: ${stats.general.lifetime_fetch}\n`+
            `total posts blocked: ${stats.general.lifetime_block}\n**Top stats for this month**\n`;
          var arr = stats.character;
          arr.sort(function(a, b) {
            return b.amount - a.amount;
          });
          if(arr.length >= 3) arr = arr.slice(0,3);
          arr.forEach((item) => {
            msg += `${item.name} fetch count: ${item.amount}\nBlocked:\n`;
            var temp = item.blocked;
            temp.sort(function(a, b) {
              return b.count - a.count;
            });
            if(temp.length >= 5) temp = temp.slice(0,5);
            temp.forEach((item) => {
              msg += `- ||${item.name}: ${item.count}||\n`;
            });
            msg += '\n';
          });
          await interaction.reply(`${msg}**Server Count**: ${serverCount}`);
	},
};
