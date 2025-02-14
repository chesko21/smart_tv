const axios = require("axios");
const fs = require("fs");

const epgUrls = [
  "https://raw.githubusercontent.com/AqFad2811/epg/main/indonesia.xml",
  "https://www.open-epg.com/files/indonesia1.xml",
  "https://www.open-epg.com/files/indonesia3.xml",
  "https://www.open-epg.com/files/indonesia4.xml",
  "https://raw.githubusercontent.com/azimabid00/epg/main/unifi_epg.xml",
  "https://www.open-epg.com/files/malaysiapremium1.xml",
  "https://raw.githubusercontent.com/azimabid00/epg/main/astro_epg.xml"
];

async function fetchAndProcessEPG() {
  let channelsData = {}; // Menyimpan semua data EPG dari semua sumber

  for (const url of epgUrls) {
    console.log(`📡 Fetching EPG from: ${url}`);
    try {
      const response = await axios.get(url, { timeout: 20000 });
      const data = response.data;

      // Perbaikan regex agar menangkap title dengan atau tanpa atribut lang
      const programmeRegex = /<programme\s+start="([^"]+)"\s+stop="([^"]+)"\s+channel="([^"]+)">[\s\S]*?<title(?:\s+lang="[^"]*")?>([^<]+)<\/title>/g;

      let programmeMatch;
      while ((programmeMatch = programmeRegex.exec(data)) !== null) {
        const start = programmeMatch[1];
        const stop = programmeMatch[2];
        const channel = programmeMatch[3];
        const title = programmeMatch[4];

        if (!channelsData[channel]) {
          channelsData[channel] = {
            tvgId: channel,
            programme: []
          };
        }

        channelsData[channel].programme.push({
          start,
          stop,
          title
        });
      }

      console.log(`✅ Successfully processed: ${url}`);
    } catch (err) {
      console.error(`❌ Failed to fetch ${url}:`, err.message);
    }
  }

  // Simpan semua hasil ke file JSON
  const result = Object.values(channelsData);
  fs.writeFileSync("hooks/processedEPG.json", JSON.stringify(result, null, 2));
  console.log("✅ All EPG data processed and saved!");
}

fetchAndProcessEPG();
