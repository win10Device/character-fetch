const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
//function GetCounts(con) {
//  return new Promise((resolve, reject) => {

//  });
//}
const back = new ButtonBuilder().setCustomId('0')
.setLabel('⮌')
.setStyle(ButtonStyle.Secondary);
module.exports = {
	data: new SlashCommandBuilder()
		.setName('characters')
		.setDescription('Shows stats'),
	async execute(interaction, client, con, stats) {
/*
          const right = new ButtonBuilder()
            .setCustomId('right')
            .setLabel('🡺')
            .setStyle(ButtonStyle.Primary);
          const left = new ButtonBuilder()
            .setCustomId('left')
            .setLabel('🡸')
            .setStyle(ButtonStyle.Primary);
          const row = new ActionRowBuilder()
            .addComponents(left, right);
          console.log(Object.keys(list));
*/
          let total_chars = 0, options = [];
          con.query('SELECT c.*, COUNT(ch.id) FROM categories c INNER JOIN characters ch ON c.id = ch.cat GROUP BY c.id;', async function(err,results) {
            if (err) {
              throw err;
              return;
            }
            results.forEach((c) => {
              const count = c['COUNT(ch.id)'];
              total_chars+=count;
              options.push(new StringSelectMenuOptionBuilder()
                                 .setLabel(c.name)
                                 .setDescription(`${count} Character`+((count!=1)?'s':''))
                                 .setValue(`${c.id}`));
            });
            const row = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder()
                                 .setCustomId('characters')
                                 .setPlaceholder('Make a selection!')
                                 .addOptions(options));

            await interaction.reply({content: `## Lists\nChoose the list in the section below\n-# *Total Characters: ${total_chars}*`, components: [row]});
          });
/*          const rxx = await interaction.reply({
            content: `## Lists\nChoose the list in the section below\n-# *Total Characters: ${total_chars}*\n-# *Last scan: ${timeDiff(stats.last_reset, Date.now())}*`,
            components: [row],
          });*/
	},
        async otherInteraction(interaction, client, con, stats) {
          switch(interaction.customId) {
            case 'characters':
              con.execute('SELECT s.id,s.name,COUNT(ch.id) AS count FROM categories s INNER JOIN characters ch ON ch.cat = s.id WHERE s.id=?;', [interaction.values[0]], async (err, results) => {
                if (err) {
                  throw err;
                  return;
                }
                const result = results[0];
                let text = `## ${result.name}\n`;
                const list = await new Promise((resolve,reject) => {
                  con.execute('SELECT * FROM characters WHERE cat=? LIMIT ? OFFSET ?', [result.id,'10','0'],(err,results)=> {
                    if (err) reject(err);
                    resolve(results);
                  });
                });
                list.forEach((c) => {
                  text += `- ${c.name}\n-# ${c.fullname}\n`;
                })
                const page = Math.ceil(result.count/10);
                text += `\n*Page 1 of ${page}*`;
                const right = new ButtonBuilder()
                    .setCustomId(`A${result.name}{${result.id}a${2}b${result.count}`) //name { cat id a  page b  total
                    .setLabel('>')
                    //.setEmoji({name: '➡️'})
                    .setStyle(ButtonStyle.Primary);
                if (page == 1) right.setDisabled(true);
                const left = new ButtonBuilder()
                    .setCustomId('left')
                    .setLabel('<')
                    //.setEmoji({name: '⬅️'})
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true);

                const row = new ActionRowBuilder().addComponents(back, left, right);

                await interaction.update({content:text, components:[row]});
              });
              break;
            default:
              break;
          }
          //await interaction.reply({content: 'whatever'});
        },
        async buttonInteraction(interaction, client, con, stats) {
          const str = interaction.customId;
          switch (str.substring(0,1)) {
            case '0':
              let total_chars = 0, options = [];
              con.query('SELECT c.*, COUNT(ch.id) FROM categories c INNER JOIN characters ch ON c.id = ch.cat GROUP BY c.id;', async function(err,results) {
                if (err) {
                  throw err;
                  return;
                }
                results.forEach((c) => {
                  const count = c['COUNT(ch.id)'];
                  total_chars+=count;
                  options.push(new StringSelectMenuOptionBuilder()
                                     .setLabel(c.name)
                                     .setDescription(`${count} Character`+((count!=1)?'s':''))
                                     .setValue(`${c.id}`));
                });
                const row = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder()
                                     .setCustomId('characters')
                                     .setPlaceholder('Make a selection!')
                                     .addOptions(options));

                await interaction.update({content: `## Lists\nChoose the list in the section below\n-# *Total Characters: ${total_chars}*`, components: [row]});
              });
              break;
            case 'A':
              const ida = str.substring(str.lastIndexOf('{')+1);
              console.log(ida);
              const info = {
                             name: str.substring(1,str.lastIndexOf('{')),
                             cat:  parseInt(ida.substring(0,ida.indexOf('a'))),
                             page: parseInt(ida.substring(ida.indexOf('a')+1,ida.indexOf('b'))),
                             max:  parseInt(ida.substring(ida.indexOf('b')+1))
                           };
              let text = `## ${info.name}\n`;
              const list = await new Promise((resolve,reject) => {
                con.execute('SELECT * FROM characters WHERE cat=? LIMIT ? OFFSET ?', [info.cat,'10',(info.page-1)*10],(err,results)=> {
                  if (err) reject(err);
                  resolve(results);
                });
              });
              list.forEach((c) => {
                text += `- ${c.name}\n-# ${c.fullname}\n`;
              });
              const right = new ButtonBuilder()
                                  .setCustomId('Zph1')
                                  .setLabel('>')
                                  //.setEmoji({name: '➡️'})
                                  .setStyle(ButtonStyle.Primary);
              if (Math.ceil(info.max/10) <= info.page)
                right.setDisabled(true);
              else right.setCustomId(`A${info.name}{${info.cat}a${info.page+1}b${info.max}`).setDisabled(false);
              const left = new ButtonBuilder()
                                  .setCustomId('Zph2')
                                  .setLabel('<')
                                  //.setEmoji({name: '⬅️'})
                                  .setStyle(ButtonStyle.Primary)
              if (info.page-1 < 1)
                left.setDisabled(true);
              else left.setCustomId(`A${info.name}{${info.cat}a${info.page-1}b${info.max}`).setDisabled(false);
              text += `\n*Page ${info.page} of ${Math.ceil(info.max/10)}*`;
              const row = new ActionRowBuilder().addComponents(back, left, right);
              await interaction.update({content:text, components:[row]});
              break;
          }
        }
};
