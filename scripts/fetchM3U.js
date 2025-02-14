const axios = require("axios");
const fs = require("fs");
const parser = require("iptv-playlist-parser");

const M3U_URL = "https://pastebin.com/raw/JyCSD9r1";

axios
  .get(M3U_URL)
  .then((response) => {
    const playlist = parser.parse(response.data);
    const channels = playlist.items.map((item) => ({
      name: item.name || "Unknown",
      tvgId: item.tvg.id || "N/A",
      tvgLogo: item.tvg.logo || "https://via.placeholder.com/50",
      group: item.group.title || "Unknown",
      url: item.url,
      license_type: item.raw?.match(/#KODIPROP:inputstream\.adaptive\.license_type=(\w+)/)?.[1] || "None",
      license_key: item.raw?.match(/#KODIPROP:inputstream\.adaptive\.license_key=([\w:]+)/)?.[1] || "None",
      userAgent: item.raw?.match(/#EXTVLCOPT:http-user-agent=(.+)/)?.[1] || "Default",
      referrer: item.raw?.match(/#EXTVLCOPT:http-referrer=(.+)/)?.[1] || "None",
    }));

    const newData = {
      liveTvChannels: channels,
      vodMovies: [], // Bisa ditambahkan data VOD jika ada
      profile: {
        name: "John Doe",
        email: "johndoe@example.com",
        avatar: "https://via.placeholder.com/100",
      },
    };

    fs.writeFileSync("hooks/data.json", JSON.stringify(newData, null, 2));
    console.log("✅ Data IPTV berhasil diperbarui di data.json");
  })
  .catch((error) => {
    console.error("❌ Gagal mengambil data M3U:", error);
  });
