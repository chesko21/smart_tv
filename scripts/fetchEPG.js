const axios = require("axios");
const fs = require("fs");
const { XMLParser } = require('fast-xml-parser');

const epgUrls = [
  "https://raw.githubusercontent.com/AqFad2811/epg/main/indonesia.xml",
  "https://www.open-epg.com/files/indonesia1.xml",
  "https://www.open-epg.com/files/indonesia3.xml",
  "https://www.open-epg.com/files/indonesia4.xml",
  "https://www.open-epg.com/files/sportspremium1.xml"
];

async function fetchAndProcessEPG() {
  let channelsData = {};

  for (const url of epgUrls) {
    console.log(`📡 Fetching EPG from: ${url}`);

    try {
      const response = await axios.get(url, { timeout: 20000 });
      const xmlData = response.data;

      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "",
        parseTagValue: true,
        trimValues: true,
      });

      const parsed = parser.parse(xmlData);

      let programmes = [];

      if (parsed?.tv?.programme) {
        programmes = Array.isArray(parsed.tv.programme) ? parsed.tv.programme : [parsed.tv.programme];
      } else if (parsed?.epg?.channel) {
        const channels = Array.isArray(parsed.epg.channel) ? parsed.epg.channel : [parsed.epg.channel];
        channels.forEach(channel => {
          if (channel.programme) {
            const channelProgrammes = Array.isArray(channel.programme) ? channel.programme : [channel.programme];
            programmes = programmes.concat(channelProgrammes.map(prog => ({
              ...prog,
              channel: channel.id || "",
            })));
          }
        });
      } else {
        console.warn(`⚠️ Invalid XML format from ${url}. Check the structure.`);
        continue;
      }

      programmes.forEach(prog => {
        const channel = prog.channel || "unknown";
        const start = prog.start || "00000000000000";
        const stop = prog.stop || "00000000000000";
        const title = typeof prog.title === "string" ? prog.title : prog.title?.["#text"] || "No Title";

        if (!channelsData[channel]) {
          channelsData[channel] = { tvgId: channel, programme: [] };
        }

        channelsData[channel].programme.push({ start, stop, title });
      });

      console.log(`✅ Successfully processed: ${url}`);

    } catch (err) {
      console.error(`❌ Failed to fetch ${url}:`, err.message);
    }
  }

  // **Sorting berdasarkan waktu mulai**
  Object.values(channelsData).forEach(channel => {
    channel.programme.sort((a, b) => a.start.localeCompare(b.start));
  });

  const result = Object.values(channelsData);
  fs.writeFileSync("hooks/processedEPG.json", JSON.stringify(result, null, 2));
  console.log("✅ All EPG data processed and saved!");
}

fetchAndProcessEPG();