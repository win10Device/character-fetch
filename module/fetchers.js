const axios = require('axios');
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const crypto = require("crypto");
const fs = require('fs');
var banned_tags = JSON.parse(fs.readFileSync('json/banned_tags.json', 'utf8'));

function getRandomInt(min, max){const minCeiled=Math.ceil(min);const maxFloored=Math.floor(max);return Math.floor(Math.random()*(maxFloored-minCeiled)+minCeiled);}
module.exports = {
  fetchers: {
    danbooru:Danbooru,
    gelbooru:Gelbooru,
    pixiv:Pixiv
  }
};

async function Danbooru(c,config,nsfw) {
  let count = 0;
  let blocked = [];
  const num = Number(nsfw);
  console.log(`Danbooru fetch - ${c.n}`);
  if (nsfw)
    if (c.p[1] > 0)
      c.n += "+rating%3aexplicit";
    else nsfw = false;
  while(count <= 10) {
    const n = (c.p[num] > 1) ? crypto.randomInt(1, c.p[num]) : 1;
    const url = `https://danbooru.donmai.us/posts.json?login=${config.danbooru.usr}&api_key=${config.danbooru.key}&page=${n}&tags=${c.n}`;
    const response = await axios.get(url, { timeout: 20000, headers: {'User-Agent': 'foobar'}, validateStatus:false });
    if(response.status == 200) {
      let bannedtags = (nsfw ? banned_tags.explicit : banned_tags.normal).slice(); //banned_tags.normal.slice();
      if (typeof(c.exclude) !== 'undefined') {
        bannedtags.forEach((item,index,arr) => {
          if (c.exclude.includes(item)) delete bannedtags[index];
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
      if (response.data.length<=0) count++;
      else {
        const post = response.data[(response.data.length > 1) ? crypto.randomInt(1, response.data.length) : 1];
        if (typeof(post) === 'undefined') count++;
        else {
          let artist = "";
          if (post.tag_string_artist.includes("\n"))
            post.tag_string_artist.forEach((item) => artist =+ `[${item}](https://danbooru.donmai.us/posts?tags=${encodeURIComponent(item)}&z=1)\n`);
          else
            artist = (post.tag_string_artist!=="") ? `[${post.tag_string_artist}](https://danbooru.donmai.us/posts?tags=${encodeURIComponent(post.tag_string_artist)}&z=1)` : "Unknown";
          const data = {
            artist,
            source: ((post.source+"").startsWith("http")) ? (`[url](${post.source})`) : `[url](https://danbooru.donmai.us/posts/${post.id})`,
            uri: `https://danbooru.donmai.us/posts/${post.id}`,
            img: post.file_url,
            thumbnail: post.preview_file_url
          };
          return { data, blocked, count, source: post.id, raw: JSON.stringify(post) };
        }
      }
    } else count++;
  }
  if(count >= 10) return {data: null, blocked, count, source: null, raw: null };
}

async function Gelbooru(c,config,nsfw) {
  let count = 0;
  let blocked = [];
  console.log(`Gelbooru fetch - ${c.n}`);
  const num = Number(nsfw);
  if (nsfw) {
    if (c.p[1] > 0) {
      c.n += "+rating%3aexplicit";
    } else nsfw = false;
  }
  if (!nsfw) c.n += "+rating%3ageneral";
  while (count <= 10) {
    const n = (c.p[num] > 1) ? crypto.randomInt(1, c.p[num]) : 1;
    const url = `https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&tags=${c.n}&api_key=${config.gelbooru.key}&user_id=${config.gelbooru.usr}`;
    let response = await axios.get(url, { timeout: 5000, validateStatus:false, headers: {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0', 'Content-Type': 'application/json' }});
    if(response.status == 200) {
      const bannedtags = (nsfw ? banned_tags.explicit : banned_tags.normal).slice();
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
        const ext = item.file_url.substring(item.file_url.lastIndexOf('.')+1)
        if (!(["jpg","jpeg","gif","png","webp"]).includes(ext)) delete response.data.post[index];
        if (item.tags.includes("video")) delete response.data.post[index];
        if (item.tags.includes("comic")) delete response.data.post[index];
      });
      response.data.post = response.data.post.filter(item => (typeof(item.id)!=='undefined'));
      if (response.data.post.length<=0) count++;
      else {
        const post = response.data.post[(response.data.post.length > 1) ? crypto.randomInt(1, response.data.post.length) : 1];
        if (typeof(post) === 'undefined') count++;
        else {
          const data = {
            artist: `[***Check Post***\nPress on "Fetch"](https://gelbooru.com/index.php?page=account&s=profile&id=${post.creator_id})`,
            source: ((post.source+"").startsWith("http")) ? (`[url](${post.source})`) : `[url](https://gelbooru.com/index.php?page=post&s=view&id=${post.id})`,
            uri: `https://gelbooru.com/index.php?page=post&s=view&id=${post.id}`,
            img: post.file_url,
            thumbnail: post.preview_url
          };
          return {data, blocked, count, source: post.id, raw: JSON.stringify(post)};
        }
      }
    } else count++;
    delete response;
  }
  if(count >= 10) return {data: null, blocked, count, source: null, raw: null };
}
async function Pixiv(c,config,nsfw) {
  let count = 0;
  let blocked = [];
  console.log(`Pixiv fetch - ${c.n}`);
  while(count <= 10) {
    const n = (c.p[0] > 1) ? crypto.randomInt(1, c.p[0]) : 1;
    const url = `https://www.pixiv.net/ajax/search/artworks/${c.n}?word=${c.n}&order=date_d&mode=all&p=${n}&csw=0&s_mode=s_tag_full&type=all&lang=en&version=1c9a02aed9d76a9163650e70702997c6ac3bf7b5`;
    let response = await axios.get(url, { timeout: 5000, validateStatus:false, headers: {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0', cookie: config.pixiv.cookie }});
    if (response.status == 200) {
      const bannedtags = (nsfw ? banned_tags.explicit : banned_tags.normal).slice();
      response.data.body.illustManga.data.forEach((item,index,arr) => {
        bannedtags.forEach((tag) => {
          if(item.tags.includes(tag)) {
            delete response.data.body.illustManga.data[index];
            blocked.push(tag);
          }
        });
      });
      response.data.body.illustManga.data = response.data.body.illustManga.data.filter(item => (typeof(item.id)!=='undefined'));
      if (response.data.body.illustManga.data.length<=0) count++;
      else {
        const na = crypto.randomInt(1, response.data.body.illustManga.data.length);
        const post = response.data.body.illustManga.data[na]
        const data = {
          artist: (typeof(response.data.body.illustManga.data[na].userName) !== 'undefined') ? `[${post.userName}](https://www.pixiv.net/en/users/${post.userId})` : 'Unknown',
          source: `[url](https://www.pixiv.net/en/artworks/${post.id})`,
          uri: `https://www.pixiv.net/en/artworks/${post.id}`,
          img: `${post.url}`.replace("https://i.pximg.net/c/250x250_80_a2/", "https://mint.ranrom.net/discord/bot/pixivgrab/i.pximg.net/")
                            .replace("_p0_custom1200", "_p0_master1200")
                            .replace("_p0_square1200", "_p0_master1200")
                            .replace("custom-thumb", "img-master"),
          thumbnail: null
        };
        return {data, blocked, count, source: post.id, raw: JSON.stringify(post)};
      }
    } else count++;
    delete response;
  }
  if(count >= 10) return {data: null, blocked, count, source: null, raw: null };
}
