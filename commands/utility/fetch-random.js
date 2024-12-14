const { SlashCommandBuilder } = require('discord.js');
//const request = require('request');
const axios = require('axios');

const Discord = require('discord.js');
const { EmbedBuilder } = require('discord.js');
const { AttachmentBuilder } = require('discord.js');
const crypto = require("crypto");
const fs = require('fs');
const config = require('../../config.json');

var banned_tags = JSON.parse(fs.readFileSync('json/banned_tags.json', 'utf8'));

console.log("a");

async function fetch() {
  var i = 0;
  var blocked = [];
  var item = { data: null, blocked: [], count: 0 };
  while(i <= 10) {
    const n = crypto.randomInt(1, 1000);
    var url = `https://danbooru.donmai.us/posts.json?login=${config.danbooru.usr}&api_key=${config.danbooru.key}&page=${n}&rating=g`;
    item.count = i;
    const instance = axios.create({
      baseURL: url,
      timeout: 10000,
      headers: {'User-Agent': 'foobar'}
    });
    var response = await instance.get(url);
    if(response.status == 200) {
      //TODO: Fix phrasing for Artist and Source on fetch-random
      response.data.forEach((item,index,arr) => {
        banned_tags.normal.forEach((tag) => {
          if(item.tag_string.includes(tag)) {
            delete response.data[index];
            blocked.push(tag);
          }
        });
        if (!(["jpg","jpeg","gif","png"]).includes(item.file_ext)) delete response.data[index];
        if ((item.tag_string_artist+"").startsWith("banned_artist")) delete response.data[index];
      });
      response.data = response.data.filter(item => (typeof(item.id)!=='undefined'));
      item.blocked = blocked;
      if(response.data.length<=0)i++;
      else {
        //item.count = i;
        /*item.data*/
        var thing = response.data[(response.data.length > 1) ? crypto.randomInt(1, response.data.length) : 1];
        if (typeof(thing) === 'undefined') {
          i++;
        } else {
          item.data = thing;
          return item;
          break;
        }
      }
    } else {
      i++;
    }
    delete response;
  }
  if(i >= 10) {
    item.count = i;
    return item;
  }
}

module.exports = {
        data: new SlashCommandBuilder()
	.setName('fetch-random')
	.setDescription('Fetches a random character from danbooru'),
        async execute(interaction, client, list, stats) {
          try {
            const message = await interaction.deferReply({ ephemeral: false, fetchReply: true });
            var char = await fetch();
            if (char !== null) {
              stats.general.lifetime_fetch += char.count + 1;
              stats.general.lifetime_block += char.blocked.length;
              stats.general.monthly_fetch += char.count + 1;
              stats.general.monthly_block += char.blocked.length;
              if(char.data !== null) {
                const exampleEmbed = new EmbedBuilder()
                  .setColor(0x0099FF)
                  .setTitle('Fetch')
                  .setURL(`https://danbooru.donmai.us/posts/${char.data.id}`)
                  .addFields(
                    { name: 'Blocked Porn Post(s)', value: `${char.blocked.length}`, inline: true },
                    { name: 'Overall Retries', value: `${char.count}`, inline: true },
                  )
                  .setImage(char.data.file_url)
                  .addFields(
                    { name: '\n', value: '\n' },
                    { name: 'Artist', value: (char.data.tag_string_artist!=="") ? `[${char.data.tag_string_artist}](https://danbooru.donmai.us/posts?tags=${char.data.tag_string_artist}&z=1)` : "Unknown", inline: true },
                    { name: 'Source',value: ((char.data.source + "").startsWith("http")) ? `[url](${char.data.source})` : `[url](${char.data.url})`, inline: true }
                  )
                exampleEmbed.setTimestamp()
                interaction.editReply({content: ``, embeds: [exampleEmbed], ephemeral: false})
                 //Read message back to make sure the image embedded correctly
                setTimeout(function() {
                  //API call is made because message cache from 'client.channels' always returns 0 for width and height, even if 'forced' is set
                  axios.get(`https://discord.com/api/v10/channels/${message.channelId}/messages/${message.id}`, {
                    headers: { Authorization: config.token, "User-Agent": "discord bot" }
                  }, { validateStatus: false }).then(res => {
                    if (res.data != null) {
                      if (res.data.embeds[0].image)
                        if(res.data.embeds[0].image.width == 0) {
                          message.reply(`Discord failed to embed the image - so... [image](${char.data.file_url})`);
                        }
                    }
                  })
                  .catch((error) => {
                    if (error == typeof(String))
                      console.log('error ' + error);
                  });
                }, 3500);
              } else {
                interaction.editReply({content: `:frowning: Failed to fetch image after 10 attempts\nthis usually means there was too much unsafe content`})
              }
            }

          } catch (error) {
            console.log(error);
            if (error instanceof TypeError) {
              await interaction.deferReply({ ephemeral: false, fetchReply: true });
              interaction.editReply({content: `Hi! - you need to specific what you want to fetch - try \`/fetch \` and see your options` });
            }
          }
        }
}
