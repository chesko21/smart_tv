import React, { useRef, useState, useEffect } from "react";
import {
    View,
    ActivityIndicator,
    Text,
    StyleSheet,
    useWindowDimensions,
    RefreshControl,
    ScrollView,
    TouchableOpacity,
    Modal,
    Platform,
    AppState,
    StatusBar
} from "react-native";
import Video from "react-native-video";
import Toast from "react-native-toast-message";
import { Buffer } from "buffer";
import Icon from "react-native-vector-icons/MaterialIcons";

type DRMType = "widevine" | "playready" | "fairplay" | "clearkey";

interface DrmConfig {
    type?: DRMType;
    licenseServer?: string;
    headers?: Record<string, string>;
    contentId?: string;
    certificateUrl?: string;
    base64Certificate?: boolean;
    clearKeys?: string;
}

interface StreamConfig {
    isHLS: boolean;
    isRadio: boolean;
    mimeType: string | null;
}

const configureDrm = (channel: any): DrmConfig => {
    if (!channel) return {};

    const drmConfig: DrmConfig = {};

    if (channel.license_type?.includes("clearkey") && channel.license_key) {
        const [kidHex, keyHex] = channel.license_key.split(":");
        if (!kidHex || !keyHex) {
            console.error("Invalid KID or Key for ClearKey DRM.");
            return {};
        }
        drmConfig.type = "clearkey";
        drmConfig.clearKeys = JSON.stringify({
            keys: [
                {
                    kty: "oct",
                    alg: "A128KW",
                    kid: Buffer.from(kidHex, "hex").toString("base64"),
                    k: Buffer.from(keyHex, "hex").toString("base64"),
                },
            ],
        });
    } else if (channel.license_type?.includes("widevine") && channel.license_key) {
        return {
            type: "widevine",
            licenseServer: channel.license_key.trim(),
        };
    } else if (channel.license_type?.includes("playready") && channel.license_key) {
        return {
            type: "playready",
            licenseServer: channel.license_key.trim(),
        };
    }
    return drmConfig;
};


const detectStreamType = (url: string): StreamConfig => {
    const isHLS = /\.(m3u8|m3u|ts)($|\?)|\/manifest\/|\/playlist\/|\/master\./i.test(url);
    const isRadio = /\.(pls|mp3|aac|ogg)($|\?)|audio\//i.test(url);

    const mimeType = isHLS ? 'application/x-mpegURL' :
        isRadio ? 'audio/mp3' : 'video/mp4';

    return { isHLS, isRadio, mimeType };
};


interface VideoPlayerProps {

    url: string;

    channel: Channel;

    onLoadStart: () => void;

    onLoad: () => void;

    onError: () => void;

    paused: boolean;

    style?: ViewStyle;

    onPipModeChange?: (isInPipMode: boolean) => void;

    isPipEnabled?: boolean;

}


const VideoPlayer: React.FC<VideoPlayerProps> = ({
    url,
    channel,
    paused,
    onLoadStart,
    onLoad,
    onError,
    onBuffer,
    style,
    maxHeight,
    onRefresh,
    onPipModeChange
}) => {
    const playerRef = useRef(null);
    const { width, height } = useWindowDimensions();
    const [videoWidth] = useState(width);
    const [videoHeight] = useState(maxHeight ? Math.min(maxHeight, height * 0.4) : height * 0.4);
    const [loading, setLoading] = useState(true);
    const [buffering, setBuffering] = useState(false);
    const [error, setError] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [videoTracks, setVideoTracks] = useState < any[] > ([]);
    const [selectedTrack, setSelectedTrack] = useState < number | null > (null);
    const [refreshing, setRefreshing] = useState(false);
    const [drmConfig, setDrmConfig] = useState < DrmConfig > ({});
    const [showResolutionModal, setShowResolutionModal] = useState(false);
    const [isPlaying, setIsPlaying] = useState(true);
    const [showQualityButton, setShowQualityButton] = useState(true);
    const [availableResolutions, setAvailableResolutions] = useState < number[] > ([]);
    const [selectedResolution, setSelectedResolution] = useState < number | null > (null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isInPipMode, setIsInPipMode] = useState(false);
    const [streamConfig, setStreamConfig] = useState < StreamConfig > ({
        isHLS: false,
        isRadio: false,
        mimeType: null
    });

    const controlsTimeoutRef = useRef < NodeJS.Timeout | null > (null);
    const qualityButtonTimeoutRef = useRef < NodeJS.Timeout | null > (null);

    useEffect(() => {
        if (channel) {
            setDrmConfig(configureDrm(channel));
        }
    }, [channel]);

    useEffect(() => {
        const config = detectStreamType(url);
        setStreamConfig(config);
        setDrmConfig(configureDrm(channel));
    }, [url, channel]);

    const handleLoadStart = () => {
        setLoading(true);
        setBuffering(true);
        setError(false);
        onLoadStart?.();
    };

    const handleLoad = (onLoadData: any) => {
        setLoading(false);
        setBuffering(false);
        setIsPlaying(true);

        const tracks = onLoadData.videoTracks || [];
        setVideoTracks(tracks);

        if (tracks.length > 0) {
            const lowestResolutionTrack = tracks.reduce((prev, current) => (current.height < prev.height ? current : prev));
            const lowestResolutionIndex = tracks.findIndex(track => track === lowestResolutionTrack);
            setSelectedTrack(lowestResolutionIndex);
        }

        const resolutions = onLoadData.videoTracks
            ?.map((track: { height: any; }) => track.height)
            .filter((height) => !!height)
            .sort((a, b) => b - a) || [];
        setAvailableResolutions(resolutions);

        onLoad?.();
    };

    const handleError = (e: any) => {
        const errorMessage = e.error?.errorString || e.error?.error || "An error occurred.";
        setLoading(false);
        setBuffering(false);
        setError(true);
        Toast.show({
            type: "error",
            text2: errorMessage,
        });
        onError?.(error);
    };

    const handleBuffer = ({ isBuffering }: { isBuffering: boolean }) => {
        setBuffering(isBuffering);
        onBuffer?.({ isBuffering });
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        setError(false);
        setLoading(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            setDrmConfig(configureDrm(channel));
            if (playerRef.current) {
                playerRef.current.reload();
            }
        } finally {
            setRefreshing(false);
            setLoading(false);
            onRefresh?.();
        }
    };

    const toggleControls = () => {
        setShowControls(prev => {
            const newValue = !prev;
            if (newValue) resetControlsAutoHideTimer();
            return newValue;
        });
    };

    const resetControlsAutoHideTimer = () => {
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        if (showControls) {
            controlsTimeoutRef.current = setTimeout(() => {
                setShowControls(false);
            }, 2000);
        }
    };

    const resetQualityButtonTimer = () => {
        if (qualityButtonTimeoutRef.current) {
            clearTimeout(qualityButtonTimeoutRef.current);
        }
        if (showQualityButton) {
            qualityButtonTimeoutRef.current = setTimeout(() => {
                setShowQualityButton(false);
            }, 2000);
        }
    };

    const handleUserInteraction = () => {
        setShowControls(true);
        setShowQualityButton(true);
        resetControlsAutoHideTimer();
        resetQualityButtonTimer();
    };

    const handleResolutionSelect = (resolution: number) => {
        setSelectedResolution(resolution);
        setShowResolutionModal(false);
        setShowQualityButton(true);
        resetQualityButtonTimer();
    };

    const togglePlay = () => {
        setIsPlaying(prev => !prev);
    };

    const toggleFullscreen = () => {
        if (playerRef.current) {
            playerRef.current.presentFullscreenPlayer();
        }
    };

    const enterPipMode = () => {
        if (Platform.OS === 'android') {
            setIsInPipMode(true);
            setIsPlaying(false);
            onPipModeChange?.(true);
        }
    };

    const exitPipMode = () => {
        setIsInPipMode(false);
        setIsPlaying(true);
        onPipModeChange?.(false);
    }

    useEffect(() => {
        return () => {
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
            if (qualityButtonTimeoutRef.current) clearTimeout(qualityButtonTimeoutRef.current);
        };
    }, []);

    const handlePipModeChange = (event: { isInPictureInPictureMode: boolean }) => {
        setIsInPipMode(event.isInPictureInPictureMode);
        setIsPlaying(!event.isInPictureInPictureMode);
        onPipModeChange?.(event.isInPictureInPictureMode);
    };

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'background' && !isInPipMode && playerRef.current) {
                enterPipMode();
            }
        });

        return () => {
            subscription.remove();
        };
    }, [isInPipMode]);

    const getQualityBadge = (resolution: number) => {
        if (resolution >= 720) return 'HD';
        if (resolution >= 480) return 'SD';
        return 'LD';
    };

    return (
        <>
            <StatusBar backgroundColor="#000" barStyle="light-content" />
            <ScrollView
                contentContainerStyle={styles.scrollViewContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            >
                <View style={[styles.videoContainer, { width: videoWidth, height: videoHeight }, style]}>
                    <TouchableOpacity style={styles.touchableArea} activeOpacity={1} onPress={handleUserInteraction}>
                        <Video
                            ref={playerRef}
                            source={{
                                uri: url,
                                type: streamConfig.isHLS ? 'm3u8' : undefined,
                                drm: drmConfig.type ? drmConfig : undefined,
                            }}
                            style={streamConfig.isRadio ? styles.audioPlayer : styles.video}
                            audioOnly={streamConfig.isRadio}
                            playInBackground={streamConfig.isRadio}
                            ignoreSilentSwitch={streamConfig.isRadio ? "ignore" : "obey"}
                            progressUpdateInterval={1000}
                            onError={(error) => {
                                console.error('Playback Error:', error);
                                handleError(error);
                            }}
                            resizeMode="contain"
                            onLoadStart={handleLoadStart}
                            onLoad={handleLoad}
                            onBuffer={handleBuffer}
                            paused={!isPlaying}
                            controls={false}
                            onFullscreenPlayerWillPresent={() => setIsFullscreen(true)}
                            onFullscreenPlayerWillDismiss={() => setIsFullscreen(false)}
                            selectedVideoTrack={{ type: selectedResolution ? "resolution" : "auto", value: selectedResolution || undefined }}
                            pictureInPicture={true}
                            onPictureInPictureStatusChanged={handlePipModeChange}
                        />
                    </TouchableOpacity>

                    {showControls && (
                        <View style={styles.customControls}>
                            <TouchableOpacity onPress={togglePlay} style={styles.controlButton}>
                                <Icon name={isPlaying ? "pause" : "play-arrow"} size={24} color="#FFF" />
                            </TouchableOpacity>

                            <View style={styles.rightControls}>
                                {Platform.OS === 'android' && (
                                    <TouchableOpacity
                                        onPress={isInPipMode ? exitPipMode : enterPipMode}
                                        style={styles.controlButton}
                                    >
                                        <Icon
                                            name={isInPipMode ? "picture-in-picture-alt" : "picture-in-picture-alt"}
                                            size={24}
                                            color="#FFF"
                                        />
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity onPress={() => {
                                    setShowResolutionModal(true);
                                    setShowQualityButton(true);
                                    resetQualityButtonTimer();
                                }}>
                                    <Icon name="settings" size={24} color="#FFF" />
                                </TouchableOpacity>

                                <TouchableOpacity onPress={toggleFullscreen} style={styles.controlButton}>
                                    <Icon name={isFullscreen ? "fullscreen-exit" : "fullscreen"} size={24} color="#FFF" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {showResolutionModal && (
                        <Modal
                            visible={showResolutionModal}
                            transparent={true}
                            animationType="fade"
                            onRequestClose={() => {
                                setShowResolutionModal(false);
                                setShowQualityButton(true);
                                resetQualityButtonTimer();
                            }}
                        >
                            <TouchableOpacity
                                style={styles.modalOverlay}
                                activeOpacity={1}
                                onPress={() => {
                                    setShowResolutionModal(false);
                                    setShowQualityButton(true);
                                    resetQualityButtonTimer();
                                }}
                            >
                                <View style={styles.resolutionMenu}>
                                    <Text style={styles.menuTitle}>Quality</Text>

                                    <TouchableOpacity
                                        style={[
                                            styles.resolutionMenuItem,
                                            !selectedResolution && styles.selectedMenuItem
                                        ]}
                                        onPress={() => handleResolutionSelect(0)}
                                    >
                                        <View style={styles.menuItemLeft}>
                                            {!selectedResolution && <Icon name="check" size={20} color="#FFF" />}
                                            <Text style={styles.resolutionText}>Auto</Text>
                                        </View>
                                    </TouchableOpacity>

                                    {availableResolutions.map((resolution) => (
                                        <TouchableOpacity
                                            key={resolution}
                                            style={[
                                                styles.resolutionMenuItem,
                                                selectedResolution === resolution && styles.selectedMenuItem
                                            ]}
                                            onPress={() => handleResolutionSelect(resolution)}
                                        >
                                            <View style={styles.menuItemLeft}>
                                                {selectedResolution === resolution && <Icon name="check" size={20} color="#FFF" />}
                                                <Text style={styles.resolutionText}>{resolution}p</Text>
                                            </View>
                                            <View style={styles.qualityBadge}>
                                                <Text style={styles.qualityBadgeText}>
                                                    {getQualityBadge(resolution)}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </TouchableOpacity>
                        </Modal>
                    )}

                    {(loading || buffering) && (
                        <View style={styles.overlay}>
                            <ActivityIndicator size="large" color="#FFF" />
                            <Text style={styles.overlayText}>{loading ? "Memuat Video..." : "Buffering..."}</Text>
                        </View>
                    )}

                    {error && (
                        <View style={styles.overlay}>
                            <Text style={styles.errorText}>Gagal Memuat Video</Text>
                            <TouchableOpacity
                                style={styles.reloadButton}
                                onPress={handleRefresh}
                            >
                                <Icon name="refresh" size={24} color="#FFF" />
                                <Text style={styles.reloadText}>Muat Ulang</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </ScrollView>
        </>
    );
};

const styles = StyleSheet.create({
    scrollViewContent: {
        flexGrow: 1,
    },
    videoContainer: {
        position: "relative",
        backgroundColor: "#000",
    },
    touchableArea: {
        flex: 1,
    },
    video: {
        width: "100%",
        height: "100%",
    },
    overlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        borderRadius: 10,
        padding: 10,
    },
    overlayText: {
        color: "#FFF",
        marginTop: 8,
        fontSize: 14,
    },
    errorText: {
        color: "red",
        fontSize: 16,
    },
    modalOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-start',
        alignItems: 'center',
    },
    resolutionMenu: {
        backgroundColor: 'rgba(28, 28, 28, 0.48)',
        borderRadius: 8,
        padding: 4,
        minWidth: 200,
        marginTop: 20,
        elevation: 5,
    },
    menuTitle: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold',
        paddingHorizontal: 8,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
        justifyContent: "center",
        alignItems: "center",
    },

    resolutionMenuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        paddingHorizontal: 10,
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    selectedMenuItem: {
        backgroundColor: 'rgba(255,255,255,0.1)'
    },
    resolutionText: {
        color: '#FFF',
        fontSize: 12,
        marginLeft: 12
    },
    qualityBadge: {
        marginLeft: 8,
        paddingHorizontal: 2,
        paddingVertical: 2,
        borderRadius: 2,
        backgroundColor: '#737373'
    },
    qualityBadgeText: {
        color: '#FFF',
        fontSize: 10
    },
    customControls: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 8,
        backgroundColor: 'rgba(0, 0, 0, 0.39)',
    },
    rightControls: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    controlButton: {
        marginHorizontal: 4,
        padding: 4,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20,
    },
    reloadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ec25',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginTop: 16,
    },
    reloadText: {
        color: '#fff',
        marginLeft: 8,
        fontSize: 14,
        fontWeight: 'bold',
    },
    audioPlayer: {
        width: 0,
        height: 0
    }
});

export default VideoPlayer;