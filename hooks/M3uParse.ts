import { useState, useEffect, useRef, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

export interface VideoTrack {
    width: number;
    height: number;
    bitrate: number;
    trackId: string;
    selected: boolean;
}
  
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
    videoTracks?: VideoTrack[];
}

const DEFAULT_M3U_URLS = [
    { url: "https://pastebin.com/raw/JyCSD9r1", enabled: true }
];

const CACHE_KEY = "m3u_channels_cache";
const USER_M3U_URLS_KEY = "user_m3u_urls";
const DEFAULT_M3U_URLS_KEY = "default_m3u_urls";
const CACHE_EXPIRATION = 10 * 60 * 1000;

const useM3uParse = () => {
    const [channels, setChannels] = useState<Channel[]>([]);
    const [groups, setGroups] = useState<string[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isFetching, setIsFetching] = useState<boolean>(false);
    const [userUrls, setUserUrls] = useState<string[]>([]);
    const [defaultUrls, setDefaultUrls] = useState<Array<{ url: string; enabled: boolean }>>([]);

    const fetchM3u = useRef(async () => {
        setIsFetching(true);
        setError(null);

        try {
            const cachedData = await AsyncStorage.getItem(CACHE_KEY);
            if (cachedData) {
                const { channels: cachedChannels, timestamp } = JSON.parse(cachedData);
                if (Date.now() - timestamp < CACHE_EXPIRATION) {
                    setChannels(cachedChannels);
                    setGroups([...new Set(cachedChannels.map((ch: Channel) => ch.group))] as string[]);
                    return; 
                }
            }

            const [storedUserUrls, storedDefaultUrls] = await Promise.all([
                AsyncStorage.getItem(USER_M3U_URLS_KEY),
                AsyncStorage.getItem(DEFAULT_M3U_URLS_KEY),
            ]);

            const parsedUserUrls = storedUserUrls ? JSON.parse(storedUserUrls) : [];
            const parsedDefaultUrls = storedDefaultUrls ? JSON.parse(storedDefaultUrls) : DEFAULT_M3U_URLS;

            setUserUrls(parsedUserUrls);
            setDefaultUrls(parsedDefaultUrls);

            const allUrls = [
                ...parsedDefaultUrls.filter(urlData => urlData.enabled).map(urlData => urlData.url),
                ...parsedUserUrls,
            ];

            console.log("📡 Fetching M3U data from:", allUrls);
            let allChannels: Channel[] = [];

            for (const url of allUrls) {
                try {
                    const response = await axios.get(url);
                    const data = response.data;
                    if (!data) throw new Error("❌ M3U file kosong atau tidak tersedia.");

                    const lines = data.split("\n");
                    let currentChannel: Partial<Channel> = {};

                    for (const line of lines) {
                        const trimmedLine = line.trim();
                        let licenseKey: string | null = null;

                        if (trimmedLine.startsWith("#EXTINF")) {
                            const tvgIdMatch = trimmedLine.match(/tvg-id="([^"]+)"/);
                            const logoMatch = trimmedLine.match(/tvg-logo="([^"]+)"/);
                            const groupMatch = trimmedLine.match(/group-title="([^"]+)"/);
                            const nameMatch = trimmedLine.split(",").pop()?.trim();

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
                        }

                        if (trimmedLine.startsWith("#KODIPROP:inputstream.adaptive.license_type=")) {
                            currentChannel.license_type = trimmedLine.split("=")[1] || "None";
                        } else if (trimmedLine.startsWith("#KODIPROP:inputstream.adaptive.license_key=")) {
                            const keyMatch = trimmedLine.match(/^#KODIPROP:inputstream.adaptive.license_key=(.*)$/);
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

                        if (trimmedLine.startsWith("#EXTVLCOPT:http-user-agent=")) {
                            currentChannel.userAgent = trimmedLine.split("=")[1] || "Default";
                        } else if (trimmedLine.startsWith("#EXTVLCOPT:http-referrer=")) {
                            currentChannel.referrer = trimmedLine.split("=")[1] || null;
                        } else if (trimmedLine && !trimmedLine.startsWith("#")) {
                            currentChannel.url = trimmedLine;
                            if (currentChannel.url) {
                                allChannels.push(currentChannel as Channel);
                            }
                            currentChannel = {};
                        }
                    }
                } catch (urlError) {
                    console.error(`❌ Error fetching M3U from ${url}:`, urlError);
                }
            }

            const uniqueChannels = allChannels.filter((ch, index, self) =>
                index === self.findIndex((c) => c.url === ch.url)
            );

            const uniqueGroups = [...new Set(uniqueChannels.map((ch) => ch.group))];

            await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ channels: uniqueChannels, timestamp: Date.now() }));

            setChannels(uniqueChannels);
            setGroups(uniqueGroups);
        } catch (err: any) {
            console.error("❌ Error fetching M3U:", err);
            setError("Failed to load channels. Please check M3U URLs.");
        } finally {
            setLoading(false);
            setIsFetching(false);
        }
    });

    const refetch = useCallback(() => {
        fetchM3u.current();
    }, []);

    const addDefaultUrl = useCallback(async (newUrl: string) => {
        if (newUrl.trim() === "") return;
        const newDefaultUrl = { url: newUrl.trim(), enabled: true };
        const updatedUrls = [...defaultUrls, newDefaultUrl];
        try {
            await AsyncStorage.setItem(DEFAULT_M3U_URLS_KEY, JSON.stringify(updatedUrls));
            setDefaultUrls(updatedUrls);
            refetch();
        } catch (error) {
            console.error("Gagal menyimpan URL default:", error);
            setError("Gagal menyimpan URL default.");
        }
    }, [defaultUrls, refetch]);

    const deleteDefaultUrl = useCallback(async (urlToDelete: string) => {
        const updatedUrls = defaultUrls.filter(urlData => urlData.url !== urlToDelete);
        try {
            await AsyncStorage.setItem(DEFAULT_M3U_URLS_KEY, JSON.stringify(updatedUrls));
            setDefaultUrls(updatedUrls);
            refetch();
        } catch (error) {
            console.error("Gagal menghapus URL default:", error);
            setError("Gagal menghapus URL default.");
        }
    }, [defaultUrls, refetch]);
    const clearCache = useCallback(async () => {
        try {
            await AsyncStorage.removeItem(CACHE_KEY);
        } catch (error) {
            console.error("Failed to clear cache:", error);
        }
    }, []);

    const toggleDefaultUrl = useCallback(async (urlToToggle: string) => {
        const updatedUrls = defaultUrls.map(urlData => ({
            ...urlData,
            enabled: urlData.url === urlToToggle ? !urlData.enabled : false, 
        }));
    
        try {
            await AsyncStorage.setItem(DEFAULT_M3U_URLS_KEY, JSON.stringify(updatedUrls));
            setDefaultUrls(updatedUrls);
            await clearCache(); 
            await fetchM3u.current(); 
        } catch (error) {
            console.error("Gagal mengubah status URL:", error);
            setError("Gagal mengubah status URL.");
        }
    }, [defaultUrls, clearCache]);
    
    const addUrl = useCallback(async (newUrl: string) => {
        if (newUrl.trim() === "") return;
        const updatedUrls = [...userUrls, newUrl.trim()];
        try {
            await AsyncStorage.setItem(USER_M3U_URLS_KEY, JSON.stringify(updatedUrls));
            setUserUrls(updatedUrls);
            refetch();
        } catch (error) {
            console.error("Gagal menyimpan URL:", error);
            setError("Gagal menyimpan URL.");
        }
    }, [userUrls, refetch]);

    const deleteUrl = useCallback(async (urlToDelete: string) => {
        const updatedUrls = userUrls.filter(url => url !== urlToDelete);
        try {
            await AsyncStorage.setItem(USER_M3U_URLS_KEY, JSON.stringify(updatedUrls));
            setUserUrls(updatedUrls);
            refetch();
        } catch (error) {
            console.error("Gagal menghapus URL:", error);
            setError("Gagal menghapus URL.");
        }
    }, [userUrls, refetch]);

    useEffect(() => {
        const loadUrls = async () => {
            try {
                const [storedUserUrls, storedDefaultUrls] = await Promise.all([
                    AsyncStorage.getItem(USER_M3U_URLS_KEY),
                    AsyncStorage.getItem(DEFAULT_M3U_URLS_KEY),
                ]);
                const parsedUserUrls = storedUserUrls ? JSON.parse(storedUserUrls) : [];
                const parsedDefaultUrls = storedDefaultUrls ? JSON.parse(storedDefaultUrls) : DEFAULT_M3U_URLS;
                setUserUrls(parsedUserUrls);
                setDefaultUrls(parsedDefaultUrls);
            } catch (error) {
                console.error("Gagal memuat URL pengguna atau default:", error);
                setError("Gagal memuat URL pengguna atau default.");
            }
        };
        loadUrls();
    }, []);

    useEffect(() => {
        fetchM3u.current();
        const intervalId = setInterval(fetchM3u.current, CACHE_EXPIRATION);
        return () => clearInterval(intervalId);  
    }, []); 
    return {
        channels,
        groups,
        loading,
        error,
        refetch,
        userUrls,
        addUrl,
        deleteUrl,
        defaultUrls,
        addDefaultUrl,
        deleteDefaultUrl,
        toggleDefaultUrl,
    };
};

export default useM3uParse;