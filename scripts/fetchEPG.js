const axios = require("axios");
const fs = require("fs");
const { XMLParser } = require('fast-xml-parser');

const epgUrls = [
  "https://raw.githubusercontent.com/AqFad2811/epg/main/indonesia.xml",
  "https://www.open-epg.com/files/indonesia1.xml",
  "https://www.open-epg.com/files/indonesia3.xml",
  "https://www.open-epg.com/files/indonesia4.xml",
  "https://raw.githubusercontent.com/azimabid00/epg/main/unifi_epg.xml",
  "https://www.open-epg.com/files/malaysiapremium1.xml",
  "https://raw.githubusercontent.com/AqFad2811/epg/main/singapore.xml",
  "https://raw.githubusercontent.com/azimabid00/epg/main/astro_epg.xml",
  "https://raw.githubusercontent.com/luizoliveira1970/epg/main/epg.xml",
  "https://www.open-epg.com/files/india1.xml",
  "https://www.open-epg.com/files/portugal.xml",
  "https://www.open-epg.com/files/unitedkingdom4.xml",
  "https://www.open-epg.com/files/unitedstates3.xml",
  "https://www.open-epg.com/files/mexico2.xml",
  "https://www.open-epg.com/files/unitedstates4.xml",
  "https://www.open-epg.com/files/australia1.xml",
  "https://raw.githubusercontent.com/matthuisman/i.mjh.nz/master/SkyGo/epg.xml",
  "https://www.open-epg.com/files/canada3.xml",
  "https://www.open-epg.com/files/france.xml",
  "https://www.open-epg.com/files/germany2.xml",
  "https://www.open-epg.com/files/germany3.xml",
  "https://www.open-epg.com/files/germany4.xml",
  "https://www.open-epg.com/files/switzerland3.xml",
  "https://www.open-epg.com/files/ireland2.xml",
  "https://raw.githubusercontent.com/Nomenteros/Nomentero_Epg/master/Nomenteroguide.xml",
  "https://raw.githubusercontent.com/matthuisman/i.mjh.nz/master/DStv/za.xml",
  "https://raw.githubusercontent.com/matthuisman/i.mjh.nz/master/PlutoTV/us.xml",
  "https://raw.githubusercontent.com/skutyborsuk/IPTV/master/epg_v5.xml",
  "https://www.open-epg.com/files/netherlands.xml",
  "https://www.open-epg.com/files/turkey3",
  "https://www.open-epg.com/files/italy1.xml",
  "https://www.open-epg.com/files/argentina4.xml",
  "https://www.open-epg.com/files/hongkong4.xml",
  "https://www.open-epg.com/files/hongkong3.xml",
  "https://www.open-epg.com/files/mexico.xml",
  "https://www.open-epg.com/files/thailand.xml",
  "https://www.open-epg.com/files/chile2.xml",
  "https://www.open-epg.com/files/belgium.xml",
  "https://www.open-epg.com/files/belgiumpremium.xml",
  "https://www.open-epg.com/files/irelandpremium.xml",
  "https://www.open-epg.com/files/uaepremium2.xml",
  "https://www.open-epg.com/files/philippines1.xml",
  "https://www.open-epg.com/files/philippines2.xml",
  "https://www.open-epg.com/files/sportspremium1.xml",
  "https://www.open-epg.com/files/koreapremium.xml"
];

async function fetchAndProcessEPG() {
  let channelsData = {};

  for (const url of epgUrls) {
    console.log(`📡 Fetching EPG from: ${url}`);

    try {
      const response = await axios.get(url, { timeout: 20000 });
      const xmlData = response.data;

  const parser = new XMLParser({
          ignoreAttributes : false, 
          attributeNamePrefix : "",  
          parseTagValue: true,     
          trimValues: true,        
      });
      const parsed = parser.parse(xmlData);
 if (parsed && parsed.tv && parsed.tv.programme) {
 const programmes = Array.isArray(parsed.tv.programme) ? parsed.tv.programme : [parsed.tv.programme]; // Handle jika hanya ada satu programme
        programmes.forEach(prog => {
 const start = prog.start || "";
            const stop = prog.stop || "";
            const channel = prog.channel || "";
            const title = (typeof prog.title === 'string') ? prog.title : (prog.title && prog.title['#text']) || 'No Title';

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
        });
        console.log(`✅ Successfully processed: ${url}`);
      } else if (parsed && parsed.epg && parsed.epg.channel) {
          const channels = Array.isArray(parsed.epg.channel) ? parsed.epg.channel : [parsed.epg.channel];
          channels.forEach(channel => {
            const channelId = channel.id || '';
            if (!channelsData[channelId]) {
              channelsData[channelId] = {
                tvgId: channelId,
                programme: []
              };
            }
            if (channel.programme) {
              const programmes = Array.isArray(channel.programme) ? channel.programme : [channel.programme];
              programmes.forEach(prog => {
                const start = prog.start || '';
                const stop = prog.stop || '';
                const title = prog.title || '';
                channelsData[channelId].programme.push({ start, stop, title });
              });
            }
          });
          console.log(`✅ Successfully processed (alternative structure): ${url}`);
      } else {
        console.warn(`⚠️ Invalid XML format from ${url}.  Check the structure.`); // Peringatan untuk format XML yang tidak valid
        console.log(parsed); 
      }

    } catch (err) {
      console.error(`❌ Failed to fetch ${url}:`, err.message);
    }
  }

  const result = Object.values(channelsData);
  fs.writeFileSync("hooks/processedEPG.json", JSON.stringify(result, null, 2));
  console.log("✅ All EPG data processed and saved!");
}

fetchAndProcessEPG();