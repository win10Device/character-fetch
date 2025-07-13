const { SlashCommandBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, ModalBuilder, EmbedBuilder } = require('discord.js');

const axios = require('axios');
const Discord = require('discord.js');
const { Jimp, intToRGBA } = require('jimp');
const { Searcher, fuzzy } = require('fast-fuzzy');
const crypto = require("crypto");
const fs = require('fs');
const config = require('../../config.json');
const Fetcher = require('../../module/fetchers.js');
//var banned_tags = JSON.parse(fs.readFileSync('json/banned_tags.json', 'utf8'));

console.log("a");
function getRandomInt(min, max){const minCeiled=Math.ceil(min);const maxFloored=Math.floor(max);return Math.floor(Math.random()*(maxFloored-minCeiled)+minCeiled);}
function generateRandomString(length,encoding='hex'){const byteLength=Math.ceil(length/2);return crypto.randomBytes(byteLength).toString(encoding).slice(0,length);}
async function getAverageColour(url){if(url==null)return{r:~~100,g:~~100,b:~~100};const image = await Jimp.read(url);var rgb={r:0,g:0,b:0};var count=0;for(let x=0;x<image.bitmap.width;x++)for(let y=0;y<image.bitmap.height;y++){var color=intToRGBA(image.getPixelColor(x,y));rgb.r+=color.r;rgb.g+=color.g;rgb.b+=color.b;count++;}return{r:~~Math.floor(rgb.r/count),g:~~Math.floor(rgb.g/count),b:~~Math.floor(rgb.b/count)};}

function search(find, list, format) {
  let matches = [], found = [];
  let s = "";
  let count = 0;
  for (const str of list) {
    if (str.includes(find)) {
      if (count < 5) {
        found.push((format) ? str.replace(find,`**__${find}__**`) : str);
        matches.push(str);
        count++;
      } else break;
    }
  }
  let aaa = [];
  for (const str of list)
    aaa.push([str, fuzzy(find,str)]);
  aaa.sort(function(a,b){return b[1]-a[1]});
  for (const val of aaa.slice(0,5))
    if (!matches.includes(val[0]))
      found.push(val[0]);
  return found;
}
async function Rnd(c,nsfw) {
  const func = Fetcher.fetchers;
  const options = Object.keys(c);
  const option = options[getRandomInt(0,options.length)];
  return await func[option](c[option],config,nsfw);
}
module.exports = {
  data: new SlashCommandBuilder()
    .setName('fetch')
    .setDescription('Fetches desired object'),
  async execute(interaction, client, con, stats, refresh) {
    try {
      const r = typeof(refresh) !== 'undefined'
      if (!r)
        await interaction.deferReply({ ephemeral: false, fetchReply: true });
      let a = null, nsfw = false;
      if (!r) {
        if (interaction.options != null) {
          if (interaction.options["_hoistedOptions"].length > 0) {
            const cv = interaction.options["_hoistedOptions"].find((x) => x.name == 'character');
            const cn = interaction.options["_hoistedOptions"].find((x) => x.name == 'nsfw');
            a = (typeof(cv) !== 'undefined') ? cv.value : null;
            nsfw = (typeof(cn) !== 'undefined') ? cn.value : false;
            if (nsfw) {
              if (interaction.channel) {
                if (!interaction.channel.nsfw && a != null) {
                  await interaction.editReply({content: "You cannot fetch an NSFW image here!"});
                  return;
                }
              } else {
                await interaction.editReply({content: "You can't fetch an NSFW here because it's unknown if this channel is NSFW"});
                return;
              }
            }
          }
        }
      } else {
        a = refresh.value;
        nsfw = refresh.nsfw;
      }
      if (a != null) {
        const sql = 'SELECT * FROM characters WHERE name = ?';
        con.execute(sql, [a], async (err, results) => {
          if (err) {
            console.error('Error executing query:', err.stack);
            await interaction.editReply({content: `database error:\nerr.stack`});
            return;
          }
          if (results.length > 0) {
            const c = JSON.parse(results[0].fetchmeta);
            if (c.bn) nsfw = false;
            const char = await Rnd(c,nsfw);
            if (char != null && char.data != null) {
              const id = generateRandomString(16,'hex');
              const color = await getAverageColour(char.data.thumbnail);
              const Embed = new EmbedBuilder()
                .setColor([color.r,color.g,color.b])
                .setTitle('Fetch')
                .setURL(`${char.data.uri}`)
                .addFields(
                  { name: 'Blocked Post(s)', value: `${char.blocked.length}`, inline: true },
                  { name: 'Retries', value: `${char.count}`, inline: true }
                )
                .setImage(char.data.img)
                .addFields(
                  { name: '\n', value: '\n' },
                  { name: 'Artist', value: `${char.data.artist}`, inline:true },
                  { name: 'Source', value: `${char.data.source}`, inline:true }
                )
              Embed.setTimestamp()

              const embed_json = JSON.stringify(Embed.toJSON())

              Embed.addFields({ name: '', value: `-# ||${id}||`})
              const deleteBtn = new ButtonBuilder()
                .setCustomId('delete')
                .setLabel('✖')
                .setStyle(ButtonStyle.Danger);
              const refreshBtn = new ButtonBuilder()
                .setCustomId(`refresh-${id}${results[0].name}${Number(nsfw)}`)
                .setLabel('↻')
                .setStyle(ButtonStyle.Primary);
              const row = new ActionRowBuilder();

              if (!r) {
                row.addComponents(refreshBtn,deleteBtn);
              } else {
                const backBtn = new ButtonBuilder()
                  .setCustomId(`hb${id}${Number(nsfw)}`)
                  .setLabel('<')
                  .setStyle(ButtonStyle.Secondary)
                row.addComponents(backBtn,refreshBtn,deleteBtn);
              }
              const msg = await interaction.editReply({content: ``, embeds: [Embed], components: [row]});


              con.execute(
                'INSERT INTO `history` (`id`,`guild`,`channel`,`message`,`cat`,`ch`,`embed`,`raw_data`,`backward_post`,`value`) VALUES (?,?,?,?,?,?,?,?,?,?)',
                [id, msg.guildId, msg.channelId, msg.id, results[0].cat, results[0].id, embed_json, char.raw, ((r) ? refresh.previous : null), results[0].name], async (err, results) => {
                if (err) {
                  throw err;
                  return;
                }
                if (r) {
                  con.execute(`UPDATE history SET forward_post=? WHERE id=?`, [id,refresh.previous], (err, r) => {
                    //console.log(r);
                  });
                }
                //console.log(results);
              });

            } else await interaction.editReply({content: ':frowning: Failed to fetch image'});
          } else {
            const list = search(a,stats.names,true);
            await interaction.editReply({content: '<:5944toradora1:1277132596286849177> Nothing was found' + ((list.length>0)?`\nDid you perhaps mean:\n${list.join('\n')}`:'')});
          }
        });
      } else {
        const command = client.lcommands.find((x) => x.name == 'help');
        interaction.editReply({content: `Hi!\nYou can get help on commands using </help:${command.id}>`})
      }
    } catch (error) {
      console.log(error);
      await interaction.deferReply({ ephemeral: false, fetchReply: true });
      interaction.editReply({content: 'error - check console'});
    }
  },
  async autocomplete(interaction, client, con, stats) {
    const focusedValue = interaction.options.getFocused();
    let list = [];

    if (focusedValue.length > 0)
      list = search(focusedValue, stats.names, false);
    else {
      if (stats.names.length >= 20) {
        const offset = getRandomInt(0,stats.names.length-10);
        list = stats.names.slice(offset,offset+10);
      } else {
        list = stats.names.slice(0,19);
      }
    }
    await interaction.respond(
      list.map(choice => ({ name: stats.name_meta[choice], value: choice })),
    );
  },
  async buttonInteraction(interaction, client, con, stats) {
    switch (interaction.customId) {
      case 'delete':
        if (interaction.message.interactionMetadata.user.id == interaction.user.id) {
          try {
            const channel = await client.channels.fetch(interaction.message.channelId);
            await channel.messages.delete(interaction.message.id)
          } catch (e) {
            interaction.update({content:"(Deleted)\n-# Unable to delete actual message object, assuming user install",embeds:[],components:[]});
          }
        } else {
          await interaction.reply({ content: "You can't delete this because you weren't the one who ran the command", flags: MessageFlags.Ephemeral });
        }
        break;
      default:
        if (interaction.customId.startsWith('refresh-')) {
          if (interaction.message.interactionMetadata.user.id == interaction.user.id) {
            const timestamp = (interaction.message.editedTimestamp == null ? interaction.message.createdTimestamp : interaction.message.editedTimestamp)
            if (Math.floor(Math.abs(Date.now() - timestamp)/1000) < 3600) {
              const co = interaction.message.components[0].components.map((button) => ButtonBuilder.from(button).setDisabled(true));
              const row = new ActionRowBuilder().setComponents(co);
              await interaction.update({components: [row]});
              await this.execute(interaction,client,con,stats,{value: interaction.customId.substring(24,interaction.customId.length-1), previous: interaction.customId.substring(8,24), nsfw: Boolean(Number(interaction.customId.substring(interaction.customId.length-1)))});
            } else {
              await interaction.reply({ content: "You can't refresh an old fetch!", flags: MessageFlags.Ephemeral });
            }
          } else await interaction.reply({ content: "You can't refresh this because you weren't the one who ran the command", flags: MessageFlags.Ephemeral });
        }
        if (interaction.customId.startsWith('h')) {
          const result = (await new Promise((resolve,reject) => {
            let sql = 'SELECT * FROM history WHERE ';
            switch (interaction.customId.substring(1,2)) {
              case 'f': //Search Forward
                sql += "backward_post=?"
                break;
              case 'b': //Search Backward
                sql += "forward_post=?"
                break;
            }
            con.execute(sql, [interaction.customId.substring(2,interaction.customId.length-1)], async (err, results) => {
              if (err) reject(err)
              resolve(results[0]);
            });
          }));
          const nsfw = Number(interaction.customId.substring(interaction.customId.length-1));
          const frwdBtn = new ButtonBuilder()
            .setCustomId(`ZPh1`)
            .setLabel('>')
            .setStyle(ButtonStyle.Secondary)
          const backBtn = new ButtonBuilder()
            .setCustomId(`ZPh2`)
            .setLabel('<')
            .setStyle(ButtonStyle.Secondary)

          if (result.backward_post == null) {
            backBtn.setDisabled(true);
            frwdBtn.setCustomId(`hf${result.id}${nsfw}`);
          } else {
            backBtn.setCustomId(`hb${result.id}${nsfw}`);
            if (result.forward_post == null)
              //No parent
              frwdBtn
                .setCustomId(`refresh-${result.id}${result.value}${nsfw}`)
                .setLabel('↻')
                .setStyle(ButtonStyle.Primary);
            else
              frwdBtn.setCustomId(`hf${result.id}${nsfw}`);
          }
          const row = new ActionRowBuilder().addComponents(backBtn, frwdBtn);
          const Embed = new EmbedBuilder(JSON.parse(result.embed));
          Embed.addFields({ name: '', value: `-# ||${result.id}||`})
          await interaction.update({content: ``, embeds: [Embed], components: [row]});
        }
        break;
    }
  }
}
