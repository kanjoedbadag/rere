// =======================================================
// DISCORD VOICE BOT + GEMINI AI (TSUNDERE SOFTSPOKEN)
// =======================================================

const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, VoiceConnectionStatus } = require('@discordjs/voice');
const express = require('express');

// ===== KEEP RAILWAY AWAKE =====
const app = Pattern = express();
app.get('/', (req, res) => {
  res.send('🤖 AI Voice Bot (Tsundere Edition) is Running!');
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
client.once('ready', (c) => { // Menggunakan 'ready' sesuai standar discord.js v14
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
  // FITUR 2: JAWABAN OTOMATIS MENGGUNAKAN GEMINI AI
  // ----------------------------------------
  const isMentioned = message.mentions.has(client.user);
  const isCommand = message.content.startsWith('!tanya ');

  if (isMentioned || isCommand) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return message.reply('❌ Kamu belum pasang variabel GEMINI_API_KEY di Railway...');
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

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          systemInstruction: {
            parts: [{ text: "Kamu adalah cewek tsundere yang berjiwa softspoken, lembut, anggun tapi gengsian, malu-malu, agak jual mahal, dan ketus kalau menjawab. JANGAN YAPPING atau bertele-tele. Langsung jawab ke inti masalah dengan sangat padat (maksimal 1-2 kalimat). Gunakan bahasa Indonesia kasual yang lembut tapi menyangkal perhatian (contoh: 'Nih jawabannya... b-bukan karena aku peduli ya!', 'Gini aja gak tahu... dasar bodoh. Jawabannya itu...'). Jangan pernah pakai kalimat pembuka formal." }]
          },
          safetySettings: [
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
          ]
        })
      });

      const data = await response.json();
      
      if (data.candidates && data.candidates[0].content.parts[0].text) {
        const replyText = data.candidates[0].content.parts[0].text.substring(0, 1950);
        await message.reply(replyText);
      } else {
        const rawError = JSON.stringify(data).substring(0, 1800);
        await message.reply(`Ada yang salah sama API-nya... B-bukan salahku ya!\n\`\`\`json\n${rawError}\n\`\`\``);
      }

    } catch (error) {
      console.error('Gemini AI Error:', error);
      await message.reply(`Akses ke AI-nya gagal total... Ih, repot amat.\n\`\`\`cmd\n${error.message}\n\`\`\``);
    }
  }
});

// ===== START THE BOT =====
const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('❌ ERROR: No Discord token found!');
} else {
  client.login(token);
}
