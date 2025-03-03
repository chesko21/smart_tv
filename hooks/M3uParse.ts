import { useState, useEffect, useCallback } from "react";
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
    logo: string | null;
    userAgent: string;
    referrer: string | null;
    videoTracks?: VideoTrack[];
}

const DEFAULT_M3U_URLS = [
    { url: "https://pastebin.com/raw/JyCSD9r1", enabled: true },
    { url: "https://raw.githubusercontent.com/chesko21/tv-online-m3u/refs/heads/my-repo/testing.m3u", enabled: false },
    { url: "https://raw.githubusercontent.com/chesko21/tv-online-m3u/refs/heads/my-repo/Tvku.m3u", enabled: false },
];

const CACHE_KEY = "m3u_channels_cache";
const USER_M3U_URLS_KEY = "user_m3u_urls";
const DEFAULT_M3U_URLS_KEY = "default_m3u_urls";
const ACTIVE_URL_KEY = "active_m3u_url";

const useM3uParse = () => {
    const [channels, setChannels] = useState<Channel[]>([]);
    const [groups, setGroups] = useState<string[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isFetching, setIsFetching] = useState<boolean>(false);
    const [userUrls, setUserUrls] = useState<string[]>([]);
    const [defaultUrls, setDefaultUrls] = useState<Array<{ url: string; enabled: boolean }>>(DEFAULT_M3U_URLS);

    const isValidUrl = useCallback((url: string) => {
        const urlPattern = /^(https?:\/\/)[\w\-]+(\.[\w\-]+)+([\/\w\-\.]*)*\/?$/;
        return urlPattern.test(url);
    }, []);

    const fetchM3u = useCallback(async () => {
        setIsFetching(true);
        setError(null);

        try {
            const [storedUserUrls, storedDefaultUrls, activeUrl] = await Promise.all([
                AsyncStorage.getItem(USER_M3U_URLS_KEY),
                AsyncStorage.getItem(DEFAULT_M3U_URLS_KEY),
                AsyncStorage.getItem(ACTIVE_URL_KEY),
            ]);

            const parsedUserUrls = storedUserUrls ? JSON.parse(storedUserUrls) : [];
            const parsedDefaultUrls = storedDefaultUrls ? JSON.parse(storedDefaultUrls) : DEFAULT_M3U_URLS;

            setUserUrls(parsedUserUrls);
            setDefaultUrls(parsedDefaultUrls);

            if (!activeUrl || !isValidUrl(activeUrl)) {
                setError("Active URL is invalid or not set.");
                setChannels([]);
                setGroups([]);
                return;
            }

            try {
                const response = await axios.get(activeUrl, { timeout: 10000 });
                const data = response.data;

                if (!data) throw new Error("❌ M3U file is empty or unavailable.");

                const lines = data.split("\n");
                let currentChannel: Partial<Channel> = {};
                const allChannels: Channel[] = [];

                for (const line of lines) {
                    const trimmedLine = line.trim();

                    if (trimmedLine.startsWith("#EXTINF")) {
                        const tvgIdMatch = trimmedLine.match(/tvg-id="([^"]+)"/);
                        const logoMatch = trimmedLine.match(/tvg-logo="([^"]+)"/);
                        const groupMatch = trimmedLine.match(/group-title="([^"]+)"/);
                        const nameMatch = trimmedLine.split(",").pop()?.trim();

                        currentChannel = {
                            tvgId: tvgIdMatch ? tvgIdMatch[1] : null,
                            logo: logoMatch ? logoMatch[1] : null,
                            group: groupMatch ? groupMatch[1] : "Unknown",
                            name: nameMatch || "Unknown Channel",
                            url: "",
                            userAgent: "Default",
                            referrer: null,
                        };
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

                const uniqueChannels = Array.from(new Map(allChannels.map(ch => [ch.url, ch])).values());
                const uniqueGroups = Array.from(new Set(uniqueChannels.map(ch => ch.group)));

                await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ channels: uniqueChannels }));

                setChannels(Array.from(uniqueChannels));
                setGroups(Array.from(uniqueGroups));
            } catch (error) {
                console.error(`❌ Error fetching M3U from active URL:`, error);
                if (axios.isAxiosError(error)) {
                    setError(
                        error.response
                            ? `Server responded with status ${error.response.status}`
                            : error.request
                            ? "No response received. Check your network connection."
                            : "Error: " + error.message
                    );
                } else {
                    setError("An unexpected error occurred.");
                }
            }
        } catch (err) {
            console.error("❌ Error fetching M3U:", err);
            setError("Failed to load channels. Please check M3U URLs.");
        } finally {
            setLoading(false);
            setIsFetching(false);
        }
    }, [isValidUrl]);

    const addUrl = useCallback(
        async (newUrl: string) => {
            if (newUrl.trim() === "" || userUrls.includes(newUrl.trim())) return;
            const updatedUrls = [...userUrls, newUrl.trim()];

            try {
                await AsyncStorage.setItem(USER_M3U_URLS_KEY, JSON.stringify(updatedUrls));
                setUserUrls(updatedUrls);
                await saveActiveUrl(newUrl.trim());
            } catch (error) {
                console.error("Failed to save URL:", error);
                setError("Failed to save URL.");
            }
        },
        [userUrls]
    );

    const deleteUrl = useCallback(
        async (urlToDelete: string) => {
            const updatedUrls = userUrls.filter(url => url !== urlToDelete);
            try {
                await AsyncStorage.setItem(USER_M3U_URLS_KEY, JSON.stringify(updatedUrls));
                setUserUrls(updatedUrls);
                const currentActiveUrl = await loadActiveUrl();
                if (currentActiveUrl === urlToDelete) {
                    await AsyncStorage.removeItem(ACTIVE_URL_KEY);
                    refetch();
                }
            } catch (error) {
                console.error("❌ Failed to delete URL:", error);
                setError("Failed to delete URL.");
            }
        },
        [userUrls, refetch]
    );

    const saveActiveUrl = useCallback(async (url: string) => {
        try {
            await AsyncStorage.setItem(ACTIVE_URL_KEY, url);
            refetch();
        } catch (error) {
            console.error("Failed to save active URL:", error);
        }
    }, [refetch]);

    const loadActiveUrl = useCallback(async () => {
        try {
            const activeUrl = await AsyncStorage.getItem(ACTIVE_URL_KEY);
            return activeUrl ?? null;
        } catch (error) {
            console.error("Failed to load active URL:", error);
            return null;
        }
    }, []);

    const searchChannels = useCallback(
        (query: string) => {
            if (!query) return channels;
            return channels.filter(channel => channel.name.toLowerCase().includes(query.toLowerCase()));
        },
        [channels]
    );

    const refetch = useCallback(() => {
        fetchM3u();
    }, [fetchM3u]);

    useEffect(() => {
        fetchM3u();
    }, [fetchM3u]);

    return {
        channels,
        groups,
        loading,
        error,
        refetch,
        searchChannels,
        userUrls,
        addUrl,
        deleteUrl,
        defaultUrls,
        saveActiveUrl,
        loadActiveUrl,
    };
};

export default useM3uParse;