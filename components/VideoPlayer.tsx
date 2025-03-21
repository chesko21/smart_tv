import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import * as ScreenOrientation from 'expo-screen-orientation';
import {
  VideoProperties,
  DRMType as VideoDRMType,
  OnLoadData,
  OnBufferData,
  OnError as OnErrorData,
} from "react-native-video";
import { urlChangeEmitter } from "../utils/events";
import {
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  Modal,
  StatusBar,
  ViewStyle,
} from "react-native";
import Video from "react-native-video";
import Toast from "react-native-toast-message";
import Icon from "@expo/vector-icons/MaterialIcons";
import { Channel } from "'hooks/M3uParse'";
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type DRMType = VideoDRMType;

type VideoRef = React.RefObject<VideoProperties>;

interface DrmConfig {
  type?: DRMType;
  licenseServer?: string;
  headers?: Record<string, string>;
  contentId?: string;
  certificateUrl?: string;
  base64Certificate?: boolean;
}

interface StreamConfig {
  isDASH: boolean;
  isHLS: boolean;
  isRadio: boolean;
  mimeType: string | null;
}

interface VideoPlayerProps {
  url: string;
  channel: Channel;
  onLoadStart: () => void;
  onLoad: () => void;
  onError: () => void;
  onBuffer?: (data: OnBufferData) => void;
  paused: boolean;
  style?: ViewStyle;
  maxHeight?: number;
  onRefresh?: () => void;
  isFullscreen: boolean;               
  onFullscreenChange: (isFullscreen: boolean) => void;
}

const configureDrm = (channel: Channel | null, streamConfig: StreamConfig): DrmConfig => {
  if (!channel) {
    console.warn("Channel is not provided. DRM configuration will be skipped.");
    return {};
  }

  if (streamConfig.isDASH || streamConfig.isHLS) {
    return {
      type: VideoDRMType.WIDEVINE,
      licenseServer: 'https://mrpw.ptmnc01.verspective.net/?deviceId=MDA5MmI1NjctOWMyMS0zNDYyLTk0NDAtODM5NGQ1ZjdlZWRi',
      headers: {
        'User-Agent': channel.userAgent,
        'Referer': channel.referrer || '',
      },
    };
  }

  return {};
};

const detectStreamType = (url: string): StreamConfig => {
  const isHLS = /\.(m3u8|ts|mp4)($|\?)|\/manifest\/|\/playlist\/|\/master\./i.test(url);
  const isRadio = /\.(pls|mp3|aac|ogg)($|\?)|audio\//i.test(url);
  const isDASH = /\.(mpd|mp4|ts)($|\?)|\/manifest\/|\/playlist\/|\/master\./i.test(url);

  return {
    isHLS,
    isRadio,
    isDASH,
    mimeType: isHLS ? 'application/x-mpegURL' : isDASH ? 'application/dash+xml' : 'video/mp4',
  };
};

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  paused,
  url,
  channel,
  onLoadStart,
  onLoad,
  onError,
  onBuffer,
  style,
  maxHeight,
  onRefresh,
  isFullscreen, 
  onFullscreenChange, 
}) => {
  const playerRef = useRef<VideoProperties>(null);
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [buffering, setBuffering] = useState(false);
  const [error, setError] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [videoTracks, setVideoTracks] = useState<any[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showQualityButton, setShowQualityButton] = useState(true);
  const [availableResolutions, setAvailableResolutions] = useState<number[]>([]);
  const [selectedResolution, setSelectedResolution] = useState<number | null>(null);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const qualityButtonTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const streamConfig = useMemo(() => detectStreamType(url), [url]);
  const drmConfig = useMemo(() => configureDrm(channel, streamConfig), [channel, streamConfig]);
  const videoHeight = useMemo(() => maxHeight ? Math.min(maxHeight, 100) : 100, [maxHeight]);

  const handleLoadStart = useCallback(() => {
    setLoading(true);
    setBuffering(true);
    setError(false);
    onLoadStart?.();
  }, [onLoadStart]);

  const handleLoad = useCallback((onLoadData: OnLoadData) => {
    setLoading(false);
    setBuffering(false);
    setIsPlaying(true);

    const tracks = onLoadData.videoTracks || [];
    setVideoTracks(tracks);

    if (tracks.length > 0) {
      const lowestResolutionIndex = tracks.reduce((prevIndex, currentTrack, currentIndex) => {
        if (!currentTrack.height) return prevIndex;
        return currentIndex === 0 || currentTrack.height < tracks[prevIndex].height ? currentIndex : prevIndex;
      }, 0);
      setSelectedTrack(lowestResolutionIndex);

      const resolutions = tracks.map((track) => track.height).filter(Boolean).sort((a, b) => b - a);
      setAvailableResolutions(resolutions);
    }

    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback((e: OnErrorData) => {
    const errorMessage = e.error?.errorString || e.error?.error || "An error occurred.";
    setLoading(false);
    setBuffering(false);
    setError(true);
    Toast.show({
      type: "error",
      text2: errorMessage,
    });
    onError?.(e);
  }, [onError]);

  const handleBuffer = useCallback(({ isBuffering }: OnBufferData) => {
    setBuffering(isBuffering);
    onBuffer?.({ isBuffering });
  }, [onBuffer]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(false);
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (playerRef.current) {
        playerRef.current.reload();
      }
    } finally {
      setRefreshing(false);
      setLoading(false);
      onRefresh?.();
    }
  }, [channel, streamConfig, onRefresh]);

  const resetControlsAutoHideTimer = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (showControls) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 2000);
    }
  }, [showControls]);

  const resetQualityButtonTimer = useCallback(() => {
    if (qualityButtonTimeoutRef.current) {
      clearTimeout(qualityButtonTimeoutRef.current);
    }
    if (showQualityButton) {
      qualityButtonTimeoutRef.current = setTimeout(() => {
        setShowQualityButton(false);
      }, 2000);
    }
  }, [showQualityButton]);

  const handleUserInteraction = useCallback(() => {
    setShowControls(true);
    setShowQualityButton(true);
    resetControlsAutoHideTimer();
    resetQualityButtonTimer();
  }, [resetControlsAutoHideTimer, resetQualityButtonTimer]);

  const handleResolutionSelect = useCallback((resolution: number) => {
    setSelectedResolution(resolution);
    setShowResolutionModal(false);
    setShowQualityButton(true);
    resetQualityButtonTimer();
  }, [resetQualityButtonTimer]);

  const togglePlay = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (playerRef.current) {
      if (!isFullscreen) {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        onFullscreenChange(true); 
      } else {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
        onFullscreenChange(false); 
      }
      playerRef.current.presentFullscreenPlayer();
    }
  }, [isFullscreen, onFullscreenChange]);

  useEffect(() => {
    const handleUrlChange = () => {
      handleRefresh();
    };

    urlChangeEmitter.on('urlChanged', handleUrlChange);

    return () => {
      controlsTimeoutRef.current && clearTimeout(controlsTimeoutRef.current);
      qualityButtonTimeoutRef.current && clearTimeout(qualityButtonTimeoutRef.current);
      urlChangeEmitter.off('urlChanged', handleUrlChange);
    };
  }, [handleRefresh]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
      {!isFullscreen && <StatusBar backgroundColor="#000" barStyle="light-content" />}
      <ScrollView
        contentContainerStyle={styles.scrollViewContent}
        scrollEnabled={!isFullscreen}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <View style={[styles.videoContainer, { width: '100%', height: isFullscreen ? '100%' : videoHeight , alignSelf: "center" , alignContent: "center"}, style]}>
          <TouchableOpacity style={styles.touchableArea} activeOpacity={1} onPress={handleUserInteraction}>
            <Video
              ref={playerRef}
              source={{
                uri: url,
                type: streamConfig.isHLS ? 'm3u8' : streamConfig.isDASH ? 'mpd' : undefined,
                drm: drmConfig.type ? drmConfig : undefined,
              }}
              style={[
                streamConfig.isRadio ? styles.audioPlayer : styles.video,
                { height: '100%', width: '100%' , alignSelf: "center", alignContent: "center"} 
              ]}
              controls={false}
              progressUpdateInterval={1000}
              onError={handleError}
              resizeMode={isFullscreen ? "contain" : "contain"} 
              onLoadStart={handleLoadStart}
              onLoad={handleLoad}
              onBuffer={handleBuffer}
              paused={!isPlaying}
              onFullscreenPlayerWillPresent={() => {
                onFullscreenChange(true);
                setShowControls(true);
              }}
              onFullscreenPlayerWillDismiss={() => {
                onFullscreenChange(false);
                setShowControls(false);
                ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
              }}
              selectedVideoTrack={{ type: selectedResolution ? "resolution" : "auto", value: selectedResolution || undefined }}
            />

          </TouchableOpacity>

          {showControls && (
            <View style={styles.customControls}>
              <TouchableOpacity onPress={togglePlay} style={styles.controlButton}>
                <Icon name={isPlaying ? "pause" : "play-arrow"} size={16} color="#FFF" />
              </TouchableOpacity>

              <View style={styles.rightControls}>
                <TouchableOpacity onPress={() => {
                  setShowResolutionModal(true);
                  setShowQualityButton(true);
                  resetQualityButtonTimer();
                }}>
                  <Icon name="settings" size={16} color="#FFF" style={styles.controlButton} />
                </TouchableOpacity>

                <TouchableOpacity onPress={toggleFullscreen} style={styles.controlButton}>
                  <Icon name={isFullscreen ? "fullscreen-exit" : "fullscreen"} size={16} color="#FFF" />
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
                      {!selectedResolution && <Icon name="check" size={16} color="#FFF" />}
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
                        {selectedResolution === resolution && <Icon name="check" size={16} color="#FFF" />}
                        <Text style={styles.resolutionText}>{resolution}p</Text>
                      </View>
                      <View style={styles.qualityBadge}>
                        <Text style={styles.qualityBadgeText}>
                          {resolution >= 720 ? 'HD' : resolution >= 480 ? 'SD' : 'SD'}
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
                <Icon name="refresh" size={20} color="#FFF" />
                <Text style={styles.reloadText}>Muat Ulang</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  scrollViewContent: {
    flex: 1,
    backgroundColor: "#121212",
  
  },
  touchableArea: {
    width: "100%",
    height: "100%",
  },
  videoContainer: {
    flex: 1,
    justifyContent: "center", 
    alignItems: "center",
    backgroundColor: "#000",
  },
  video: {
    width: "100%",
    height: "100%", 
    backgroundColor: '#000', 
    alignSelf: "center",

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
    backgroundColor: 'rgba(28, 28, 28, 0.53)',
    minWidth: 200,
    marginTop: 20,
    elevation: 5,
  },
  menuTitle: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 4,
    paddingVertical: 4,
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
    gap: 5,
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