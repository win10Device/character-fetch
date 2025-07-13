const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('help')
		.setDescription('a'),
	async execute(interaction, client, con, stats) {
          const commands = client.lcommands;
          await interaction.reply(
                  {
                    content: "### Help\n" +
                             `</fetch:${commands.find((x) => x.name === "fetch").id}>\n` +
                             "> **character**:\n> The name of the character, characters will be suggested as you type\n" +
                             "> **nsfw**:\n> (Optional) Fetch NSFW varient of character\n> -# (Only works in NSFW marked Channels)\n\n" +
                             "On a fetch, you'll have 3 types of buttons\n" +
                             "<:refreshfetch:1393793655709368370>\t\t - Refresh Fetch\n" +
                             "<:deletefetch:1393793609400193065>\t\t - Delete Fetch\n<:backfetch:1393793733538877532> " +
                             "<:forwardfetch:1393793842997756096> - Cycle through your fetch history\n\n" +
                             `</characters:${commands.find((x) => x.name === "characters").id}>\n` +
                             "> Shows the entire character list\n" +
                             `</ping:${commands.find((x) => x.name === "ping").id}>\n` +
                             "> Gets Ping between Discord, You and the Bot",
                    flags: MessageFlags.Ephemeral
                  }
                );
	},
};
