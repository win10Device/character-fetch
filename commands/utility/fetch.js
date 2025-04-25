const { SlashCommandBuilder } = require('discord.js');
//const request = require('request');
const axios = require('axios');

const Discord = require('discord.js');
const { EmbedBuilder } = require('discord.js');
const { AttachmentBuilder } = require('discord.js');
const {Jimp, intToRGBA } = require('jimp');
const crypto = require("crypto");
const fs = require('fs');
const config = require('../../config.json');
var banned_tags = JSON.parse(fs.readFileSync('json/banned_tags.json', 'utf8'));

console.log("a");
function getRandomInt(min, max){const minCeiled=Math.ceil(min);const maxFloored=Math.floor(max);return Math.floor(Math.random()*(maxFloored-minCeiled)+minCeiled);}
async function getAverageColour(url){if(url==null)return{r:~~100,g:~~100,b:~~100};const image = await Jimp.read(url);var rgb={r:0,g:0,b:0};var count=0;for(let x=0;x<image.bitmap.width;x++)for(let y=0;y<image.bitmap.height;y++){var color=intToRGBA(image.getPixelColor(x,y));rgb.r+=color.r;rgb.g+=color.g;rgb.b+=color.b;count++;}return{r:~~Math.floor(rgb.r/count),g:~~Math.floor(rgb.g/count),b:~~Math.floor(rgb.b/count)};}

async function fetchDanbooru(c, nsfw) {
  var i = 0;
  var blocked = [];
  console.log(`Danbooru fetch - ${c.name}`);
  var item = { data: null, blocked: [], count: 0 };
  while(i <= 10) {
    const n = (c.pagemax[0] > 1) ? crypto.randomInt(1, c.pagemax[0]) : 1;
    var url = `https://danbooru.donmai.us/posts.json?login=${config.danbooru.usr}&api_key=${config.danbooru.key}&page=${n}&tags=${c.fetch}`;
    item.count = i;
    const instance = axios.create({
      baseURL: url,
      timeout: 5000,
      headers: {'User-Agent': 'foobar'}
    });
    var response = await instance.get(url);
    if(response.status == 200) {
      var bannedtags = banned_tags.normal.slice();
      if (typeof(c.exclude_tags) !== 'undefined') {
        bannedtags.forEach((item,index,arr) => {
          if (c.exclude_tags.includes(item)) delete bannedtags[index];
        });
      }
      response.data.forEach((item,index,arr) => {
        bannedtags.forEach((tag) => {
          if(item.tag_string.includes(tag)) {
            delete response.data[index];
            blocked.push(tag);
          }
        });
        if (!(["jpg","jpeg","gif","png"]).includes(item.file_ext)) delete response.data[index];
        if (item.tag_string.includes("comic")) delete response.data[index];
        if ((item.tag_string_artist+"").startsWith("banned_artist")) delete response.data[index];
      });
      response.data = response.data.filter(item => (typeof(item.id)!=='undefined'));
      item.blocked = blocked;
      if(response.data.length<=0)i++;
      else {
        var thing = response.data[(response.data.length > 1) ? crypto.randomInt(1, response.data.length) : 1];
        if (typeof(thing) === 'undefined') {
          i++;
        } else {
          var artist = "";
          if (thing.tag_string_artist.includes("\n")) {
            thing.tag_string_artist.forEach(function(item) {
              artist =+ `[${item}](https://danbooru.donmai.us/posts?tags=${encodeURIComponent(item)}&z=1)\n`
            });
          } else {
            artist = (thing.tag_string_artist!=="") ? `[${thing.tag_string_artist}](https://danbooru.donmai.us/posts?tags=${encodeURIComponent(thing.tag_string_artist)}&z=1)` : "Unknown";
          }
          item.data = {
            artist: artist,
            source: ((thing.source+"").startsWith("http")) ? (`[url](${thing.source})`) : `[url](https://danbooru.donmai.us/posts/${thing.id})`,
            uri: `https://danbooru.donmai.us/posts/${thing.id}`,
            img: thing.file_url,
            thumbnail: thing.preview_file_url
          };
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

async function fetchGelbooru(c, nsfw) {
  var i = 0;
  var blocked = [];
  if (typeof(c.gelbooru) !== 'undefined' && !c.gelbooru) {
    console.log("Gelbooru was set to false on this character - passing on to Danbooru fetcher");
    return await fetchDanbooru(character, char_cache, nsfw);
  }
  console.log(`Gelbooru fetch - ${c.name}`);
  var item = { data: null, blocked: [], count: 0 }
  var pagemax = (typeof(c.pixiv) === 'undefined') ? c.pagemax[1] : c.pagemax[2];
  //pagemax = 20; //Test
  while(i <= 10) {
    const n = (pagemax > 1) ? crypto.randomInt(1, pagemax) : 1;
    var url = `https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&pid=${n}&tags=${c.fetch}+rating%3ageneral`;

    item.count = i;
    const instance = axios.create({
      baseURL: url,
      timeout: 5000,
      headers: {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0', 'Content-Type': 'application/json' }
    });
    var response = await instance.get(url);
    if(response.status == 200) {
      var bannedtags = banned_tags.normal.slice();
      if (typeof(c.exclude_tags) !== 'undefined') {
        bannedtags.forEach((item,index,arr) => {
          if (c.exclude_tags.includes(item)) delete bannedtags[index];
        });
      }
      response.data.post.forEach((item,index,arr) => {
        bannedtags.forEach((tag) => {
          if(item.tags.includes(tag)) {
            delete response.data.post[index];
            blocked.push(tag);
          }
        });
        if (!(["jpg","jpeg","gif","png","webp"]).includes(item.file_url)) delete response.data[index];
        if (item.tags.includes("video")) delete response.data[index];
        if (item.tags.includes("comic")) delete response.data[index];
//        if ((item.tag_string_artist+"").startsWith("banned_artist")) delete response.data[index];
      });
      response.data.post = response.data.post.filter(item => (typeof(item.id)!=='undefined'));
      item.blocked = blocked;
      if(response.data.post.length<=0)i++;
      else {
        var thing = response.data.post[(response.data.post.length > 1) ? crypto.randomInt(1, response.data.post.length) : 1];
        if (typeof(thing) === 'undefined') {
          i++;
        } else {
/*
          var artist = "";
          if (thing.tag_string_artist.includes("\n")) {
            thing.tag_string_artist.forEach(function(item) {
              artist =+ `[${item}](https://danbooru.donmai.us/posts?tags=${encodeURIComponent(item)}&z=1)\n`
            });
          } else {*/
            artist = `[***Check Post***\nPress on "Fetch"](https://gelbooru.com/index.php?page=account&s=profile&id=${thing.creator_id})`;
//          }
          item.data = {
            artist: artist,
            source: ((thing.source+"").startsWith("http")) ? (`[url](${thing.source})`) : `[url](https://gelbooru.com/index.php?page=post&s=view&id=${thing.id})`,
            uri: `https://gelbooru.com/index.php?page=post&s=view&id=${thing.id}`,
            img: thing.file_url,
            thumbnail: thing.preview_url
          };
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

async function fetchPixiv(c, nsfw) {
  var i = 0;
  var blocked = [];
  if (typeof(c.pixiv) === 'undefined') {
    console.log("Pixiv tag was undefined on this character - passing on to Danbooru fetcher");
    item = await fetchDanbooru(c, nsfw);
    return item;
  }
  console.log(`Pixiv fetch - ${c.name}`);
  var item = { data: null, blocked: [], count: 0 }
  while(i <= 10) {
    const n = (c.pagemax[1] > 1) ? crypto.randomInt(1, c.pagemax[1]) : 1;
    var url = `https://www.pixiv.net/ajax/search/artworks/${c.pixiv}?word=${c.pixiv}&order=date_d&mode=all&p=${n}&csw=0&s_mode=s_tag_full&type=all&lang=en&version=1c9a02aed9d76a9163650e70702997c6ac3bf7b5`;

    item.count = i;
    const instance = axios.create({
      baseURL: url,
      timeout: 5000,
      headers: {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0', cookie: config.pixiv.cookie }
    });
    var response = await instance.get(url);
    if(response.status == 200) {
      var bannedtags = banned_tags.normal.slice();
      response.data.body.illustManga.data.forEach((item,index,arr) => {
        bannedtags.forEach((tag) => {
          if(item.tags.includes(tag)) {
            delete response.data.body.illustManga.data[index];
            blocked.push(tag);
          }
        });
      });
      item.blocked = blocked;
      response.data.body.illustManga.data = response.data.body.illustManga.data.filter(item => (typeof(item.id)!=='undefined'));
      if (response.data.body.illustManga.data.length<=0)i++;
      else {
        var na = crypto.randomInt(1, response.data.body.illustManga.data.length);
        var post = response.data.body.illustManga.data[na]
        item.data = {
          artist: (typeof(response.data.body.illustManga.data[na].userName) !== 'undefined') ? post.userName : 'Unknown',
          source: `[url](https://www.pixiv.net/en/artworks/${post.id})`,
          uri: `https://www.pixiv.net/en/artworks/${post.id}`,
          img: `${post.url}`.replace("https://i.pximg.net/c/250x250_80_a2/", "https://mint.ranrom.net/discord/bot/pixivgrab/i.pximg.net/")
                            .replace("_p0_custom1200", "_p0_master1200")
                            .replace("_p0_square1200", "_p0_master1200")
                            .replace("custom-thumb", "img-master"),
          thumbnail: null
        }
      }
      return item;
      break;
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
async function getRandom(character, char_cache, nsfw) {
try {
  var key = Object.keys(char_cache).find(item =>(typeof char_cache[item].characters[character]!=='undefined'));
  var c = char_cache[key].characters[character];

  var pending = true;
  var count = 0;
  var temp = null;

  var list = ["danbooru"];
  if (typeof(c.pixiv) !== 'undefined') list.push("pixiv");
  if (typeof(c.gelbooru) === 'undefined') list.push("gelbooru"); //Inverted because of boolean, need to change the format!
  console.log(list);
  var fetch = list[(list.length > 1) ? crypto.randomInt(0, list.length) : 0]

  while (pending) {
    count ++;
    if (count > 4) {
      return temp; //escape loop
    }
    switch (fetch) {
      case "danbooru":
        if((temp = await fetchDanbooru(c,nsfw)).data != null)
          return temp;
        else {
          if (typeof(c.gelbooru) === 'undefined' && !c.gelbooru)
            fetch = "gelbooru";
          else {
            if (typeof(c.pixiv) !== 'undefined')
              fetch = "pixiv";
            else pending = false;
          }
        }
        break;
      case "pixiv":
        if((temp = await fetchPixiv(c,nsfw)).data != null)
          return temp;
        else {
          if (typeof(c.gelbooru) === 'undefined' && !c.gelbooru)
            fetch = "gelbooru";
          else fetch = "danbooru";
        }
        break;
      case "gelbooru":
        if((temp = await fetchGelbooru(c,nsfw)).data != null)
          return temp;
        else {
          if (typeof(c.pixiv) !== 'undefined')
            fetch = "pixiv";
          else fetch = "danbooru";
        }
        break;
    }
  }
} catch (e) {
  console.log(e);
}
}
module.exports = {
        data: new SlashCommandBuilder()
	.setName('fetch')
	.setDescription('Fetches desired object')
	.addStringOption(option =>
		option.setName('character')
			.setDescription('Fetches a image of an character')
			.setRequired(true)
			.addChoices(
				{ name: 'Furina', value: 'furina' },
				{ name: 'Koishi', value: 'koishi' },
			)
                ),
        async execute(interaction, client, list, stats) {
          try {
            //var a = "";//interaction.options.getString('character');
            var a = null;
            if (interaction.options != null)
              a = interaction.options["_hoistedOptions"][0].value;
            const nsfw = interaction.options.getBoolean('nsfw');
            //var b = interaction.options.getString('profile');
            const message = await interaction.deferReply({ ephemeral: false, fetchReply: true });
            if (a !== null) {
//              var char = (getRandomInt(1,100) > 50) ? await fetchDanbooru(a, list, false) :  await fetchPixiv(a, list, false);
              var char = await getRandom(a, list, false);
              if (char !== null) {
                stats.general.lifetime_fetch += char.count + 1;
                stats.general.lifetime_block += char.blocked.length;
                stats.general.monthly_fetch += char.count + 1;
                stats.general.monthly_block += char.blocked.length;
                if (stats.character.filter((x)=>x.name === a).length == 0) {
                  stats.character.push({ name: a, amount: 1, blocked: [] });
                } else {
                  stats.character.find((x) => x.name ===a).amount += 1;
                    //stats.character[a].amount += 1;
                }
                char.blocked.forEach((item) => {
                  if(stats.character.filter((x)=>(x.name===a&&typeof(x.blocked.find((y)=>y.name===item))!=='undefined')).length>0) {
                    stats.character.forEach((item1, index, arr) => {
                      if(item1.name === a) {
                        item1.blocked.forEach((item2, index2, arr2) => {
                          if (item2.name == item) {
                            stats.character[index].blocked[index2] = {name: item2.name, count: item2.count+1 };
                          }
                        });
                      }
                    });
                  } else {
                    stats.character.forEach((item1, index, arr) => {
                      if(item1.name === a)
                        stats.character[index].blocked.push({name: item, count: 1});
                    });
                  }
                });
                if(char.data !== null) {
                  var color = await getAverageColour(char.data.thumbnail);
                  const exampleEmbed = new EmbedBuilder()
                    .setColor([color.r,color.g,color.b])
                    .setTitle('Fetch')
                    .setURL(`${char.data.uri}`)
                    .addFields(
                      { name: 'Blocked Post(s)', value: `${char.blocked.length}`, inline: true },
                      { name: 'Retries', value: `${char.count}`, inline: true },
                    )
                    .setImage(char.data.img)
                    .addFields(
                       { name: '\n', value: '\n' },
                       { name: 'Artist', value: `${char.data.artist}`, inline:true },
                       { name: 'Source', value: `${char.data.source}`, inline:true }
                    )
                  exampleEmbed.setTimestamp()
                  interaction.editReply({content: ``, embeds: [exampleEmbed], ephemeral: false})

                  //Read message back to make sure the image embedded correctly
                  if (message.guild !== null) {
                    var delay = Math.abs(Date.now() - interaction.createdTimestamp);
                    setTimeout(function() {
                      //API call is made because message cache from 'client.channels' always returns 0 for width and height, even if 'forced' is set because of caching
                      axios.get(`https://discord.com/api/v10/channels/${message.channelId}/messages/${message.id}`, {
                        headers: { Authorization: config.token, "User-Agent": "discord bot" }
                      }, { validateStatus: false }).then(res => {
                        if (res.data != null) {
                          if (res.data.embeds[0].image)
                            if(res.data.embeds[0].image.width == 0) {
                              message.reply(`Discord failed to embed the image.\n-# Sometimes Discord will not load the image just from the embed, so linking the [image](${char.data.img}) here will make Discord try again`);
                            }
                        }
                      })
                      .catch((error) => {
                        if (error == typeof(String))
                          console.log('error ' + error);
                      });
                    }, 6000 + delay);
                  }
                } else {
                  interaction.editReply({content: `:frowning: Failed to fetch image after 10 attempts\nthis usually means there was too much unsafe content`})
                }
              } else {
                var emote = "";
                switch(a) {
                  case "fuck you":
                    interaction.editReply({content: `Hey!\n-# Screw you man... rude...`});
                    break;
                  case "n3ptune":
                    interaction.editReply({content: `https://mint.ranrom.net/profile/531139663096840192/card/`});
                    break;
                  case "pigeon":
                    interaction.editReply({content: `https://www.youtube.com/watch?v=7MaCtOs0kCg`});
                    break;
                  case "character":
                    interaction.editReply({content: `https://tenor.com/view/mavuika-dance-genshin-impact-natlan-pyro-gif-4519653848599171566`});
                    break;
                  case "genki":
                    interaction.editReply({content: `No [⠀](https://cdn.discordapp.com/emojis/1216103696342061166.png?quality=lossless&name=OrinCry&size=512)`})
                    break;
                  default:
                    if (a.includes("@") || a.includes("[") || a.includes("http") || a.length >= 10) { //Prevent users pinging other users with the bot
                      interaction.editReply({content: `Check your spelling and try again!\n-# Command was rejected!`});
                      return;
                    }
                    switch (Math.floor(Math.random() * 2)) {
                      case 0:
                        emote = "<:5944toradora1:1277132596286849177>";
                        break;
                      case 1:
                        emote = "<:furinathink:1277138364755218507>";
                        break;
                      case 2:
                        emote = "<:c5iwasAsuna:1277135352145907794>";
                        break;
                    }
                    interaction.editReply({content: `${emote}\nUnknown character "${a}", check your spelling and try again`});
                    break;
                }
              }
            }

          } catch (error) {
            console.log(error);
            if (error instanceof TypeError) {
              await interaction.deferReply({ ephemeral: false, fetchReply: true });
              interaction.editReply({content: `Hi! - you need to specific what you want to fetch - try \`/fetch\` and see your options` });
            }
          }
        }
}
