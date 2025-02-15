import React, { useState, useEffect, useRef, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    View, ActivityIndicator, Text,
    StyleSheet, BackHandler,
    FlatList, TouchableOpacity, Image
} from "react-native";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router"; // Import useNavigation
import Video, { DRMType } from "react-native-video";
import useM3uParse from "../../hooks/M3uParse";
import { Buffer } from "buffer";
import epgData from "../../hooks/processedEPG.json";
import { DateTime } from "luxon";
import { useFocusEffect } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import { EventEmitter } from "expo-modules-core";

type DRMType = 'widevine' | 'playready' | 'fairplay' | 'clearkey';

interface DrmConfig {
    type?: DRMType;
    licenseServer?: string;
    headers?: Record<string, string>;
    contentId?: string;
    certificateUrl?: string;
    base64Certificate?: boolean;
    clearKeys: string;
}

interface Program {
    start: string;
    stop: string;
    title: string;
}
export const watchHistoryEvent = new EventEmitter();

const PlayerScreen = () => {
    const { url } = useLocalSearchParams();
    const [paused, setPaused] = useState(false);
    const [loading, setLoading] = useState(true);
    const [buffering, setBuffering] = useState(false);
    const [error, setError] = useState(false);
    const [drmConfig, setDrmConfig] = useState<DrmConfig>({});
    const playerRef = useRef(null);
    const { channels } = useM3uParse();
    const router = useRouter();
    const navigation = useNavigation();
    const [programmes, setProgrammes] = useState<(Program | undefined)[]>([]);
    const [recommendedChannels, setRecommendedChannels] = useState<typeof channels>([]);
    const selectedChannel = channels.find(channel => channel.url === url);
    const channelName = selectedChannel?.name || "Unknown Channel";
    const [hasSavedHistory, setHasSavedHistory] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false); 
    const normalizeTvgId = (id: string | null) => id?.trim() || '';

    const epgChannel = epgData.find(epg => normalizeTvgId(epg.tvgId) === normalizeTvgId(selectedChannel?.tvgId)) || null;

    const upcomingProgrammes = epgChannel ? epgChannel.programme
        ?.filter(prog => prog.start > DateTime.local().toFormat("yyyyMMddHHmmss"))
        ?.slice(0, 5)
        : [];

    useFocusEffect(
        useCallback(() => {
            const pauseVideo = () => {
                if (playerRef.current) {
                    playerRef.current.pause();
                    setIsPlaying(false);
                }
            };

            const resumeVideo = () => {
                if (playerRef.current && !paused) { 
                    playerRef.current.resume();
                    setIsPlaying(true);
                }
            };
            const unsubscribeFocus = navigation.addListener('focus', resumeVideo);
            const unsubscribeBlur = navigation.addListener('blur', pauseVideo);
         return () => {
                pauseVideo(); 
                unsubscribeFocus();
                unsubscribeBlur();
            };
        }, [navigation, paused]) 
    );

    const saveToWatchHistory = async () => {
        try {
            if (!selectedChannel || hasSavedHistory) return;

            const newEntry = {
                name: channelName,
                timestamp: new Date().toLocaleString(),
            };

            const storedHistory = await AsyncStorage.getItem("watchHistory");
            let historyArray = storedHistory ? JSON.parse(storedHistory) : [];

            const exists = historyArray.some((item) => item.name === newEntry.name);
            if (!exists) {
                historyArray.unshift(newEntry);
                if (historyArray.length > 10) historyArray.pop();
                await AsyncStorage.setItem("watchHistory", JSON.stringify(historyArray));

                watchHistoryEvent.emit("historyUpdated");
            }

            setHasSavedHistory(true);
        } catch (error) {
            console.error("Gagal menyimpan riwayat tontonan:", error);
        }
    };
    useEffect(() => {
        if (!url || channels.length === 0) return;

        const selectedChannel = channels.find(channel => channel.url === url);
        if (!selectedChannel) return;

        const normalizeTvgId = (id: string | null) => id?.trim() || '';
        const epgChannel = epgData.find(epg => normalizeTvgId(epg.tvgId) === normalizeTvgId(selectedChannel.tvgId));

        if (epgChannel && epgChannel.programme.length > 0) {
            const nowString = DateTime.utc().toFormat("yyyyMMddHHmmss");

            const currentProgram = epgChannel.programme.find((prog: { stop: number; start: number; }) =>
                (!prog.stop || prog.stop > nowString) && prog.start <= nowString
            ) || { title: "Tidak ada informasi program", start: "", stop: "" };

            const nextProgram = epgChannel.programme.find(prog =>
                prog.start > nowString && (!currentProgram || prog.start > currentProgram.start)
            ) || { title: "Tidak ada informasi program", start: "", stop: "" };

            setProgrammes([currentProgram, nextProgram].filter(Boolean) as Program[]);
        } else {
            setProgrammes([
                { title: "Tidak ada informasi program", start: "", stop: "" },
                { title: "Tidak ada informasi program", start: "", stop: "" }
            ]);
        }
    }, [url, channels]);

   const formatTime = (timeString: string) => {
        if (!timeString || timeString.length < 14) return "Invalid Time";

        const datePart = timeString.substring(0, 14);
        const offsetPart = timeString.substring(15);
   let dateTime;
        if (offsetPart) {
            const formattedOffset = `${offsetPart.substring(0, 3)}:${offsetPart.substring(3)}`;
            dateTime = DateTime.fromFormat(datePart, "yyyyMMddHHmmss", { zone: `UTC${formattedOffset}` });
        } else {
            dateTime = DateTime.fromFormat(datePart, "yyyyMMddHHmmss", { zone: 'UTC' }); // Default to UTC if no offset
        }
     return dateTime.setZone(DateTime.local().zoneName).toFormat("HH:mm");
    };

    useEffect(() => {
        const configureDrm = async () => {
            if (!url || channels.length === 0) return;

            const selectedChannel = channels.find(channel => channel.url === url);
            if (!selectedChannel) return;

            let newDrmConfig: DrmConfig = {
                type: "none", 
            };

            if (selectedChannel.license_type?.includes("clearkey") && selectedChannel.license_key) {
                const [kid, k] = selectedChannel.license_key.split(":");
                const kidBase64 = Buffer.from(kid, "hex").toString("base64").replace(/=*$/, "");
                const keyHex = k.toLowerCase();

                if (kidBase64 && keyHex) {
                    newDrmConfig = {
                        type: "clearkey",
                        clearKeys: JSON.stringify({ [kidBase64]: keyHex }),
                    };
                } else {
                    console.error("Invalid ClearKey DRM keys");
                }
            }
            else if (selectedChannel.license_type?.includes("widevine") && selectedChannel.license_key) {
                newDrmConfig = {
                    type: "widevine",
                    licenseServer: selectedChannel.license_key.trim(),
                };
            }


            setDrmConfig(newDrmConfig);
        };

        configureDrm();
    }, [url, channels]);

    useEffect(() => {
        if (channels.length === 0) return;

        let recommended = channels.slice(0, 10);

        if (url) {
            const currentChannel = channels.find((channel) => channel.url === url);
            if (currentChannel) {
                const currentGroup = currentChannel.group ? currentChannel.group.trim().toLowerCase() : "";
                let filteredChannels = channels.filter(
                    (channel) =>
                        channel.group && channel.group.trim().toLowerCase() === currentGroup && channel.url !== url
                );

                if (filteredChannels.length === 0) {
                    filteredChannels = channels.filter((channel) => channel.url !== url);
                }

                recommended = filteredChannels.sort(() => Math.random() - 0.5).slice(0, 10);
            }
        }

        setRecommendedChannels(recommended);
    }, [channels, url]);


    useEffect(() => {
        if (url) {
            setPaused(false);
            setIsPlaying(true); 
        }
    }, [url]);

    useEffect(() => {
        const backAction = () => {
            router.back();
            return true;
        };

        const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
        return () => backHandler.remove();
    }, [router]);

    const handleError = (error: any) => {
        setLoading(false);
        setError(true);
        setIsPlaying(false); 

        console.error("Video Player Error:", error);
        const errorMessage = error.errorString || "Terjadi kesalahan saat memutar video.";

        Toast.show({
            type: "error",
            text1: "Gagal Memuat Video",
            text2: errorMessage,
            position: "top",
            visibilityTime: 4000,
            autoHide: true,
        });
    };

    const handleLoadStart = () => {
        // console.log("Memulai loading video...");
        setLoading(true);
        setBuffering(true);
    };

    useEffect(() => {
        if (!hasSavedHistory) {
            saveToWatchHistory();
        }
    }, [hasSavedHistory]);

    const handleLoad = () => {
        setLoading(false);
        setBuffering(false);
        setHasSavedHistory(true);
    };


    const handleBuffer = ({ isBuffering }: { isBuffering: boolean }) => {
        // console.log("Buffering Status:", isBuffering);
        setBuffering(isBuffering);
        setLoading(isBuffering);
        setIsPlaying(!isBuffering); 
    };

    const handleChannelChange = useCallback((channelUrl: string) => {
        // console.log("Changing channel to:", channelUrl);
        setLoading(true);
        setError(false);
        setPaused(false);
        setIsPlaying(true);  
        router.push({ pathname: "/PlayerScreen", params: { url: channelUrl } });
    }, [router]);


    return (
        <View style={styles.container}>

            <View style={styles.videoContainer}>
                {!url ? (
                    <Image
                        source={require("../../assets/images/tv_banner.png")}
                        style={styles.tvbanner}
                        resizeMode="contain"
                    />
                ) : (
                    <>
                        {(loading || buffering) && !error && (
                            <View style={styles.loaderContainer}>
                                <ActivityIndicator size="large" color="#fff" />
                                <Text style={styles.loadingText}>
                                    {loading ? "Loading..." : "Buffering..."}
                                </Text>

                            </View>
                        )}
                        {/* Video Player */}
                        <Video
                            controlsStyles={{
                                hidePosition: false,
                                hidePlayPause: false,
                                hideForward: false,
                                hideRewind: false,
                                hideNext: true,
                                hidePrevious: true,
                                hideFullscreen: false,
                                hideSeekBar: false,
                                hideDuration: false,
                                hideNavigationBarOnFullScreenMode: true,
                                hideNotificationBarOnFullScreenMode: true,
                                hideSettingButton: false,
                                liveLabel: "LIVE"
                            }}
                            ref={playerRef}
                            source={{
                                uri: url,
                                headers: drmConfig.headers || {},
                            }}
                            drm={drmConfig.type ? {
                                type: drmConfig.type === 'clearkey' ? DRMType.CLEARKKEY : DRMType.WIDEVINE,
                                licenseServer: drmConfig.licenseServer,
                                clearKeys: drmConfig.clearKeys ? JSON.parse(drmConfig.clearKeys) : undefined, // Parse clearKeys if it exists
                            } : undefined}
                            style={styles.video}
                            controls={true}
                            resizeMode="contain"
                            onLoadStart={handleLoadStart}
                            onLoad={handleLoad}
                            onError={handleError}
                            onBuffer={handleBuffer}
                            paused={paused || !isPlaying} 
                            bufferConfig={{
                                minBufferMs: 15000,
                                maxBufferMs: 50000,
                                bufferForPlaybackMs: 2500,
                                bufferForPlaybackAfterRebufferMs: 5000,
                                backBufferDurationMs: 120000,
                                cacheSizeMB: 0,
                                live: {
                                    targetOffsetMs: 500,
                                },
                            }}
                        />

                    </>
                )}
            </View>
            <Toast />
            {/* Program Sedang Tayang & Selanjutnya */}
            <View style={styles.programmeContainer}>
                <View style={styles.programmeBox}>
                    <View style={styles.programmeLeft}>
                        <Text style={styles.programmeTitle}>Sedang Tayang</Text>
                        {programmes[0]?.title ? (
                            <View style={styles.programmeCard}>
                                <Text style={styles.programmeText}>{programmes[0].title}</Text>
                                {programmes[0].start && programmes[0].stop ? (
                                    <Text style={styles.programmeTimes}>
                                        {formatTime(programmes[0].start)} - {formatTime(programmes[0].stop)} WIB
                                    </Text>
                                ) : (
                                    <Text style={styles.noProgramsText}>Jadwal tidak tersedia</Text>
                                )}
                            </View>
                        ) : (
                            <Text style={styles.noProgramsText}>Tidak ada informasi program.</Text>
                        )}
                    </View>
                    <View style={styles.programmeRight}>
                        <Text style={styles.programmeTitle}>Tayangan Selanjutnya</Text>
                        {programmes[1]?.title ? (
                            <View style={styles.programmeCard}>
                                <Text style={styles.programmeText}>{programmes[1].title}</Text>
                                {programmes[1].start && programmes[1].stop ? (
                                    <Text style={styles.programmeTimes}>
                                        {formatTime(programmes[1].start)} - {formatTime(programmes[1].stop)} WIB
                                    </Text>
                                ) : (
                                    <Text style={styles.noProgramsText}>Jadwal tidak tersedia</Text>
                                )}
                            </View>
                        ) : (
                            <Text style={styles.noProgramsText}>Tidak ada informasi program.</Text>
                        )}
                    </View>
                </View>
            </View>
            {/* Tayangan Mendatang */}
            {upcomingProgrammes.length > 0 ? (
                <View style={styles.upcomingContainer}>
                    <Text style={styles.upcomingTitle}>
                        Tayangan Mendatang {channelName}
                    </Text>
                    <FlatList
                        horizontal
                        data={upcomingProgrammes}
                        keyExtractor={(item, index) => `${item.start}-${index}`}
                        renderItem={({ item }) => (
                            <View style={styles.upcomingCard}>
                                <Text style={styles.upcomingText}>{item.title || "Program tidak tersedia"}</Text>
                                <Text style={styles.upcomingTime}>
                                    {formatTime(item.start)} - {formatTime(item.stop)} WIB
                                </Text>
                            </View>
                        )}
                    />
                </View>
            ) : null}

            {/* Channel TV Lainnya */}
            <View style={styles.recommendationContainer}>
                <Text style={styles.recommendationTitle}>Channel TV Lainnya</Text>
                {recommendedChannels.length > 0 ? (
                    <FlatList
                        horizontal
                        data={recommendedChannels}
                        keyExtractor={(item) => item.url}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.channelCard}
                                onPress={() => handleChannelChange(item.url)}
                            >
                                {item.logo ? (
                                    <Image source={{ uri: item.logo }} style={styles.channelLogo} />
                                ) : (
                                    <View style={styles.placeholderLogo} />
                                )}
                                <Text style={styles.channelText}>{item.name}</Text>
                            </TouchableOpacity>
                        )}
                    />
                ) : (
                    <Text style={{ color: "#ccc", textAlign: "center", paddingVertical: 10 }}>
                        Tidak ada rekomendasi.
                    </Text>
                )}
            </View>


        </View>
    );

};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#121212",
    },
    /** VIDEO PLAYER **/
    videoContainer: {
        width: "100%",
        height: "40%",
        backgroundColor: "rgba(1, 1, 3, 0.53)",
        justifyContent: "center",
        alignItems: "center",

    },
    video: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
    },

    loaderContainer: {
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: [{ translateX: -25 }, { translateY: -25 }],
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.27)",
        borderRadius: 10,
        zIndex: 10,
    },
    loadingText: {
        marginTop: 10,
        color: "#fff",
        fontSize: 14,
        fontWeight: "bold",
        textAlign: "center",
    },
    errorContainer: {
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: [{ translateX: -75 }, { translateY: -20 }],
        backgroundColor: "rgba(255, 0, 0, 0.8)",
        padding: 10,
        borderRadius: 8,
    },
    errorText: {
        color: "white",
        fontSize: 14,
        fontWeight: "bold",
        textAlign: "center",
    },
    /** PROGRAMME INFO **/
    programmeContainer: {
        marginTop: 10,
        paddingHorizontal: 10,
    },
    programmeBox: {
        flexDirection: "row",
        backgroundColor: "#2525",
        borderRadius: 10,
        padding: 10,
    },
    programmeLeft: {
        flex: 1,
        paddingRight: 10,
        borderRightWidth: 1,
        borderRightColor: "#444",
    },
    programmeRight: {
        flex: 1,
        paddingLeft: 10,
    },
    programmeTitle: {
        color: "#e3c800",
        fontSize: 14,
        fontWeight: "bold",
        marginBottom: 5,
        textAlign: "center",
    },
    programmeCard: {
        backgroundColor: "rgba(20, 17, 192, 0.47)",
        padding: 8,
        borderRadius: 8,
        alignItems: "center",
    },
    programmeText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "bold",
        textAlign: "center",
    },
    programmeTimes: {
        color: "#aaa",
        fontSize: 12,
        marginTop: 5,
    },
    noProgramsText: {
        color: "#777",
        fontSize: 12,
        textAlign: "center",
    },
    /** CHANNEL RECOMMENDATION **/
    recommendationContainer: {
        marginTop: 20,
        paddingHorizontal: 10,
    },
    recommendationTitle: {
        color: "#e3c800",
        fontSize: 16,
        fontWeight: "bold",
        marginBottom: 10,
    },
    channelCard: {
        marginRight: 15,
        backgroundColor: "#222",
        padding: 10,
        borderRadius: 10,
        width: 110,
        alignItems: "center",
        shadowColor: "#225",
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    channelLogo: {
        width: 60,
        height: 60,
        borderRadius: 10,
        marginBottom: 5,
    },
    placeholderLogo: {
        width: 60,
        height: 60,
        backgroundColor: "#444",
        borderRadius: 10,
        marginBottom: 5,
    },
    channelText: {
        color: "#fff",
        fontSize: 13,
        textAlign: "center",
    },
    /** UPCOMING PROGRAMMES **/
    upcomingContainer: {
        marginTop: 20,
        paddingHorizontal: 10,
        paddingBottom: 10,
    },
    upcomingTitle: {
        color: "#e3c800",
        fontSize: 16,
        fontWeight: "bold",
        marginBottom: 10,
    },
    upcomingCard: {
        backgroundColor: "#252525",
        padding: 12,
        borderRadius: 10,
        marginRight: 12,
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 5,
    },
    upcomingText: {
        color: "#fff",
        fontSize: 13,
        fontWeight: "bold",
        textAlign: "center",
    },
    upcomingTime: {
        color: "#ddd",
        fontSize: 12,
        marginTop: 5,
    },
});


export default PlayerScreen;