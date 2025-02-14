import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

export interface Channel {
  tvgId: string | null;
  name: string;
  url: string;
  group: string;
  logo?: string;
  license_type: string;
  license_key: string | null;
  userAgent: string;
  referrer: string | null;
}

const M3U_URL = "https://pastebin.com/raw/JyCSD9r1"; 
const CACHE_KEY = "m3u_channels_cache"; 
const CACHE_EXPIRATION = 60 * 60 * 1000; 

const useM3uParse = () => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchM3u = async () => {
      try {
        setLoading(true);
        setError(null);

        const cachedData = await AsyncStorage.getItem(CACHE_KEY);
        if (cachedData) {
          const { channels: cachedChannels, timestamp } = JSON.parse(cachedData);

         
          if (Date.now() - timestamp < CACHE_EXPIRATION) {
            console.log("⚡ Menggunakan cache untuk mempercepat render...");
            setChannels(cachedChannels);
            setGroups([...new Set(cachedChannels.map((ch: Channel) => ch.group))]);
            setLoading(false);
            return;
          }
        }
        console.log("📡 Fetching M3U data from:", M3U_URL);
        const response = await axios.get(M3U_URL);
        const data = response.data;

        if (!data) {
          throw new Error("❌ M3U file kosong atau tidak tersedia.");
        }

        const lines = data.split("\n");
        const parsedChannels: Channel[] = [];
        let currentChannel: Partial<Channel> = {};

        for (let i = 0; i < lines.length; i++) {
          let line = lines[i].trim();
          let licenseKey: string | null = null;

          if (line.startsWith("#EXTINF")) {
            const tvgIdMatch = line.match(/tvg-id="([^"]+)"/);
            const logoMatch = line.match(/tvg-logo="([^"]+)"/);
            const groupMatch = line.match(/group-title="([^"]+)"/);
            const nameMatch = line.split(",").pop()?.trim();

            currentChannel = {
              tvgId: tvgIdMatch ? tvgIdMatch[1] : null,
              logo: logoMatch ? logoMatch[1] : undefined,
              group: groupMatch ? groupMatch[1] : "Unknown",
              name: nameMatch || "Unknown Channel",
              url: "",
              license_type: "None",
              license_key: null,
              userAgent: "Default",
              referrer: null,
            };
          } else if (line.startsWith("#KODIPROP:inputstream.adaptive.license_type=")) {
            currentChannel.license_type = line.split("=")[1] || "None";
          } else if (line.startsWith("#KODIPROP:inputstream.adaptive.license_key=")) {
            const keyMatch = line.match(/^#KODIPROP:inputstream.adaptive.license_key=(.*)$/);
            if (keyMatch && keyMatch[1]) {
              licenseKey = keyMatch[1].trim();
              currentChannel.license_key = licenseKey || null;
            } else {
              currentChannel.license_key = null;
            }
          }

          if (licenseKey && (licenseKey.includes(":") || licenseKey.startsWith("http"))) {
            currentChannel.license_key = licenseKey;
          }

          if (line.startsWith("#EXTVLCOPT:http-user-agent=")) {
            currentChannel.userAgent = line.split("=")[1] || "Default";
          } else if (line.startsWith("#EXTVLCOPT:http-referrer=")) {
            currentChannel.referrer = line.split("=")[1] || null;
          } else if (line && !line.startsWith("#")) {
            currentChannel.url = line;
            if (currentChannel.url) {
              parsedChannels.push(currentChannel as Channel);
            }
            currentChannel = {};
          }
        }

        const uniqueGroups = [...new Set(parsedChannels.map((ch) => ch.group))];

        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ channels: parsedChannels, timestamp: Date.now() }));

        setChannels(parsedChannels);
        setGroups(uniqueGroups);
      } catch (err: any) {
        console.error("❌ Error fetching M3U:", err);
        setError(`Failed to load channels: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchM3u();
  }, []);

  return { channels, groups, loading, error };
};

export default useM3uParse;
