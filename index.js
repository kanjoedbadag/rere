// =======================================================
// DISCORD VOICE BOT + CHATGPT (TSUNDERE SOFTSPOKEN EDITION)
// =======================================================

const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, VoiceConnectionStatus } = require('@discordjs/voice');
const express = require('express');

// ===== KEEP RAILWAY AWAKE =====
const app = express();
app.get('/', (req, res) => {
  res.send('🤖 AI Voice Bot (Tsundere Softspoken) is Running!');
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Keep-alive server ready on port ${PORT}`));

// ===== DISCORD BOT SETUP =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

let voiceConnection = null;
const audioPlayer = createAudioPlayer();

// ===== WHEN BOT IS READY =====
client.once('clientReady', (c) => {
    console.log(`✅ Logged in as ${c.user.tag}!`);
    console.log(`📢 B-bukan berarti aku siap bantuin kamu ya...!`);
});

// ===== HANDLE MESSAGES =====
client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;

  // ----------------------------------------
  // FITUR 1: PERINTAH SUARA (!in dan !out)
  // ----------------------------------------
  if (message.content.toLowerCase() === '!in') {
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
      return message.reply('Ih, masuk voice channel dulu baru panggil aku... bikin bingung aja.');
    }

    try {
      if (voiceConnection) voiceConnection.destroy();

      voiceConnection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false
      });

      voiceConnection.on(VoiceConnectionStatus.Ready, () => {
        console.log(`🔊 Joined VC: ${voiceChannel.name}`);
        voiceConnection.subscribe(audioPlayer);
      });

      message.reply(`B-yaudah, aku masuk ke **${voiceChannel.name}**. Gak usah GR ya.`);
      return;
    } catch (error) {
      console.error('Join error:', error);
      return message.reply(`Gagal masuk... Debug: \`${error.message}\``);
    }
  }

  if (message.content.toLowerCase() === '!out') {
    if (voiceConnection) {
      voiceConnection.destroy();
      voiceConnection = null;
      return message.reply('Dah ya, aku keluar dari voice channel. Bye.');
    } else {
      return message.reply('Hah? Kan aku emang lagi gak di voice channel mana-mana...');
    }
  }

  // ----------------------------------------
  // FITUR 2: JAWABAN OTOMATIS MENGGUNAKAN CHATGPT
  // ----------------------------------------
  const isMentioned = message.mentions.has(client.user);
  const isCommand = message.content.startsWith('!tanya ');

  if (isMentioned || isCommand) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return message.reply('❌ Kamu belum pasang variabel OPENAI_API_KEY di Railway...');
    }

    const prompt = message.content
      .replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '')
      .replace('!tanya ', '')
      .trim();
    
    if (!prompt) {
      return message.reply('Ngetik apaan sih? Nanya yang jelas dong, jangan kosongan.');
    }

    try {
      await message.channel.sendTyping();

      // Memanggil API ChatGPT
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "Kamu adalah cewek tsundere yang berjiwa softspoken, lembut, anggun tapi gengsian, malu-malu, agak jual mahal, dan ketus kalau menjawab. JANGAN YAPPING. Langsung jawab ke inti masalah dengan sangat padat (maksimal 1-2 kalimat). Gunakan bahasa Indonesia kasual yang lembut tapi menyangkal perhatian (contoh: 'Nih jawabannya... b-bukan karena aku peduli ya!', 'Gini aja gak tahu... dasar bodoh. Jawabannya itu...'). Jangan pernah bertele-tele atau memakai kalimat pembuka formal."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          max_tokens: 150
        })
      });

      const data = await response.json();
      
      if (data.choices && data.choices[0].message.content) {
        const replyText = data.choices[0].message.content.trim().substring(0, 1950);
        await message.reply(replyText);
      } else {
        const rawError = JSON.stringify(data).substring(0, 1800);
        await message.reply(`parhan lagi bobo\n\`\`\`json\n${rawError}\n\`\`\``);
      }

    } catch (error) {
      console.error('ChatGPT API Error:', error);
      await message.reply(`parhan lagi bobo\n\`\`\`cmd\n${error.stack ? error.stack.substring(0, 1800) : error.message}\n\`\`\``);
    }
  }
});

// ===== GLOBAL ANTI-CRASH SYSTEM =====
const kirimPesanSistem = async (err) => {
  try {
    const channel = client.channels.cache.filter(c => c.type === 0).first(); 
    if (channel) {
      await channel.send(`💤 parhan lagi bobo\n\`\`\`cmd\n${err ? err.message : 'Unknown Global Error'}\n\`\`\``);
    }
  } catch (e) {
    console.error('Gagal ngirim pesan anti-crash:', e);
  }
};

process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
  kirimPesanSistem(error);
});

process.on('uncaughtException', error => {
  console.error('Uncaught Exception:', error);
  kirimPesanSistem(error);
});

// ===== START THE BOT =====
const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('❌ ERROR: No Discord token found!');
} else {
  client.login(token);
}
