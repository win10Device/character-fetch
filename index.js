// Require the necessary discord.js classes
const { Client, Events, GatewayIntentBits, Collection, ActivityType } = require('discord.js');
const config = require('./config.json');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
let mysql = require('mysql2');

var stats = JSON.parse(fs.readFileSync('json/stats.json', 'utf8'));

async function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

let con = mysql.createPool({ //mysql.createConnection({
  host: config.db.address,
  port: config.db.port,
  user: config.db.user,
  password: config.db.pass,
  database: config.db.db,
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0
});

stats.names = []; //List used for character name searching
stats.name_meta = {};
/*
con.connect(async function(err) {
  if (err) throw err;
  console.log("Database connected!");
  scan();
});
*/
scan();

function scan() {
  con.query('SELECT * FROM characters;', async function(err,results) {
    if (err) {
      throw err;
      return;
    }
    stats.names = [];
    if (results.length > 0) {
      let query = "";
      const time = Math.floor(Date.now() / 1000);
      for (i in results) {
        let ch = results[i];
        stats.names.push(ch.name);
        stats.name_meta[ch.name] = ch.fullname;
        let meta = JSON.parse(ch.fetchmeta);
        let update = false;
        let updated_at= Math.floor((new Date(ch.updated).getTime()) / 1000);
        if (isNaN(updated_at)) updated_at = 1;
        if (Math.abs(time - updated_at) >= 2629800) {
          for (let i = 0; i <= 1; i++) {
            if (i==1 && ch.bn) continue;
            Object.keys(meta).forEach(async (key) => {
              switch (key) {
                case 'danbooru':
                  axios.get(`https://danbooru.donmai.us/posts?tags=${meta.danbooru.n}${(i==1)?"+rating%3Aexplicit":""}`).then(function (response) {
                    let a = response.data.substring(response.data.lastIndexOf('<a class="paginator-page desktop-only"'));
                    let c = parseInt(a.substring(a.indexOf('">')+2, a.indexOf('</a>')));
                    console.log(`Getting Danbooru page max for ${ch.name}...`);
                    if (isNaN(c)) {
                      meta.danbooru.p[i] = 1;
                      console.log("HTML scrape returned null, assuming max page of 1...");
                    } else {
                      if (meta.danbooru.p[i] != c) {
                        update = true;
                        meta.danbooru.p[i] = (c >= 1000) ? 1000 : c;
                      }
                    }
                  });
                  break;
                case 'gelbooru':
                  axios.get(`https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&tags=${meta.gelbooru.n}+${(i==1)?"rating%3Aexplicit":"+rating%3ageneral"}&api_key=${config.gelbooru.key}&user_id=${config.gelbooru.usr}`).then(function (response) {
                    console.log(`Getting Gelbooru page max for ${ch.name}...`);
                    let c = Math.floor(response.data['@attributes'].count/100);
                    if (meta.gelbooru.p[i] != c) {
                      update = true;
                      meta.gelbooru.p[i] = (c >= 200) ? 200 : c;
                    }
                  });
                  break;
                case 'pixiv':
                  if (i == 0) {
                    let char = encodeURIComponent(meta.pixiv.n);
                    axios.get(`https://www.pixiv.net/ajax/search/artworks/${char}?word=${char}&order=date_d&mode=all&p=1&csw=0&s_mode=s_tag_full&type=all&lang=en&version=1c9a02aed9d76a9163650e70702997c6ac3bf7b5`,
                      {
                        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0', 'Cookie': config.pixiv.cookie }
                      }
                    ).then(function (response) {
                      let c = response.data.body.illustManga.lastPage;
                      console.log(`Getting Pixiv page max for ${ch.name}...`);
                      if (meta.pixiv.p[0] != c) {
                        update = true;
                        meta.pixiv.p[0] = c;
                      }
                    });
                  }
                  break;
              }
            });
            await sleep(1000);
          }
          if (update == true) {
            let str = JSON.stringify(meta);
            con.execute('UPDATE characters SET fetchmeta=?, updated=CURRENT_TIMESTAMP() WHERE id=?', [str,ch.id], (err, results) => {
              if (err) {
                throw err;
              }
              if (results.warningStatus != 0 || results.affectedRows != 1) console.log('Unexpected Result from row update: ', results);
              else console.log('OK');
            });
          }
        }
      }
    } else {
      console.warn("No characters in database to check!");
    }
  });
  con.query('SELECT * FROM banned_tags;', async function(err,results) {
    if (err) {
      throw err;
      return;
    }
    if (results.length > 0) {
      const banned_tags = { normal: [], explicit: [] };
      results.forEach((result) => {
        banned_tags.normal.push(result.tag);
        if (result.nsfw) banned_tags.explicit.push(result.tag);
      });
      fs.writeFile('json/banned_tags.json', JSON.stringify(banned_tags,null,2), err => {
        if (err) {
          console.error(err);
        }
      });
    }
  });
}
//var list = JSON.parse(fs.readFileSync('json/list.json', 'utf8'));
//var stats = JSON.parse(fs.readFileSync('json/stats.json', 'utf8'));

function rescan() {

}
//rescan();
setInterval(function() {
  if(stats.last_reset + 2.628e+9 <= Date.now()) {
    stats.character = [];
    stats.general.monthly_fetch = 0;
    stats.general.monthly_block = 0;
    stats.last_reset = Date.now();
//    rescan();
  }
}, 8.64e+7);
//setInterval(function() {
/*
  fs.writeFile('json/stats.json', JSON.stringify(stats,null,2), err => {
    if (err) {
      console.error(err);
    }
  });
*/
//}, 60000);

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// When the client is ready, run this code (only once).
// The distinction between `client: Client<boolean>` and `readyClient: Client<true>` is important for TypeScript developers.
// It makes some properties non-nullable.
client.once(Events.ClientReady, async readyClient => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
  client.user.setPresence({
    activities: [{
        name: 'the ever expanding universe',
        type: ActivityType.Watching,
    }],
    status: 'online'
  });
  client.lcommands = (await client.application.commands.fetch()).map((x)=>{return{id: x.id, name: x.name}})
  //let userInstance = await client.users.cache;
  //console.log(userInstance);
  /*client.lcommands.forEach((a) => {
    console.log(a);
  });*/
  //console.log(client.application.fetch())
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
//  if (!interaction.isChatInputCommand()) return;
  if (interaction.guild != null)
    if (interaction.guild.id == "1304480258527072307") { //'Rin's server
      await interaction.reply({ content: `Sorry, but you aren't allowed to use the bot here`, ephemeral: true });
      return;
    }
  if (interaction.user != null) {
    switch (interaction.user.id) {
//      case "832898834358075414": //drew
      case "708267426114043904": //reaper
        await interaction.reply({ content: `get blocked idiot [haha](https://media.tenor.com/jkrntNKtKGkAAAAM/frieren-fern.gif)`, ephemeral: true});
        return;
    }
  }
  try {
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (typeof(command) === 'undefined') {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
      }
      await command.execute(interaction, client, con, stats);
    }
    if (interaction.isStringSelectMenu()) {
      const command = interaction.client.commands.get(interaction.message.interaction.commandName);
      await command.otherInteraction(interaction, client, con, stats);
    }
    if (interaction.isButton()) {
      const command = interaction.client.commands.get(interaction.message.interaction.commandName);
      await command.buttonInteraction(interaction, client, con, stats);
    }
    if (interaction.isAutocomplete()) {
      const command = interaction.client.commands.get(interaction.commandName);
      await command.autocomplete(interaction, client, con, stats);
    }
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
    } else {
      await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
  }
});
