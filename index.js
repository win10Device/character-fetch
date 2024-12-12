// Require the necessary discord.js classes
const { Client, Events, GatewayIntentBits } = require('discord.js');
const config = require('./config.json');
const { Collection } = require('discord.js')
const { ActivityType } = require('discord.js')
const axios = require('axios');
const path = require('path');
const fs = require('fs');
var list = JSON.parse(fs.readFileSync('json/list.json', 'utf8'));
var stats = JSON.parse(fs.readFileSync('json/stats.json', 'utf8'));

function rescan() {
  Object.keys(list).forEach(function(key, idx, arr){
    setTimeout(() => {
      Object.keys(list[key].characters).forEach(function(k, i, a) {
        try {
          setTimeout(() => {
            var char = list[key].characters[k].fetch;
            axios.get(`https://danbooru.donmai.us/posts?tags=${char}`).then(function (response) {
              var a = response.data.substring(response.data.lastIndexOf('<a class="paginator-page desktop-only"'));
              var c = parseInt(a.substring(a.indexOf('">')+2, a.indexOf('</a>')));
              console.log(`Updating Danbooru page max for ${list[key].characters[k].name}...`);
              list[key].characters[k].pagemax[0] = (c >= 1000) ? 1000 : c;

              fs.writeFile('json/list.json', JSON.stringify(list,null,2), err => {
                if (err) {
                  console.error(err);
                } else {
                }
              });

            });
            if (typeof(list[key].characters[k].pixiv) !== 'undefined') {
              var char = encodeURIComponent(list[key].characters[k].pixiv);
              axios.get(`https://www.pixiv.net/ajax/search/artworks/${char}?word=${char}&order=date_d&mode=all&p=1&csw=0&s_mode=s_tag_full&type=all&lang=en&version=1c9a02aed9d76a9163650e70702997c6ac3bf7b5`,
              { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0', 'Cookie': config.pixiv.cookie }  }).then(function (response) {

                var c = response.data.body.illustManga.lastPage;
                console.log(`Updating Pixiv page max for ${list[key].characters[k].name}...`);
                list[key].characters[k].pagemax[1] = c;

                fs.writeFile('json/list.json', JSON.stringify(list,null,2), err => {
                  if (err) {
                    console.error(err);
                  } else {
                  }
                });
              });
            }
          }, i * 2000);
        } catch (e) {
          console.error(`Failed to get for ${list[key].characters[k].name}!`);
        }
      });
    }, (list[key].characters.length * 2000));
  });
  //stats.last_reset = Date.now();
  fs.writeFile('json/list.json', JSON.stringify(list,null,2), err => {
    if (err) {
      console.error(err);
    }
  });
}
rescan();
setInterval(function() {
  if(stats.last_reset + 2.628e+9 <= Date.now()) {
    stats.character = [];
    stats.general.monthly_fetch = 0;
    stats.general.monthly_block = 0;
    stats.last_reset = Date.now();
    rescan();
  }
}, 8.64e+7);
setInterval(function() {
  fs.writeFile('json/stats.json', JSON.stringify(stats,null,2), err => {
    if (err) {
      console.error(err);
    }
  });
}, 60000);

//const request = require('request');

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// When the client is ready, run this code (only once).
// The distinction between `client: Client<boolean>` and `readyClient: Client<true>` is important for TypeScript developers.
// It makes some properties non-nullable.
client.once(Events.ClientReady, readyClient => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
  client.user.setPresence({
    activities: [{
        name: 'the ever expanding universe',
        type: ActivityType.Watching,
    }],
    status: 'online'
  });
});
client.on(Events.InteractionCreate, interaction => {
  if (!interaction.isChatInputCommand()) return;
  console.log(`${interaction.user.globalName} (${interaction.user.username} - ${interaction.user.id}) ran the command /${interaction.commandName}`);
});

// Log in to Discord with your client's token
client.login(config.token);

client.commands = new Collection();

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		// Set a new item in the Collection with the key as the command name and the value as the exported module
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}
client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;
        if (interaction.guild != null)
          if (interaction.guild.id == "1304480258527072307") { //'Rin's server
            await interaction.reply({ content: `Sorry, but you aren't allowed to use the bot here`, ephemeral: true });
            return;
          }
        if (interaction.user != null) {
          if (interaction.user.id == "832898834358075414") { //drew
            await interaction.reply({ content: `get blocked idiot [haha](https://media.tenor.com/jkrntNKtKGkAAAAM/frieren-fern.gif)`, ephemeral: true});
            return;
          }
        }
	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction, client, list, stats);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	}
});
//await rest.put(
//	Routes.applicationCommands(clientId),
//	{ body: commands },
//);
