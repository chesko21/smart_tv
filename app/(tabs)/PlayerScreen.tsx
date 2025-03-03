import React, { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  View,
  StyleSheet,
  Text,
  StatusBar,
  useWindowDimensions,
  SafeAreaView,
  Dimensions,
  ScrollView,
  RefreshControl,
  BackHandler,
  Platform,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import useM3uParse from "../../hooks/M3uParse";
import { EventEmitter } from "expo-modules-core";
import Toast from "react-native-toast-message";
import VideoPlayer from "../../components/VideoPlayer";
import EPGInfo from "../../components/EPGInfo";
import ChannelList from "../../components/ChannelList";
import { usePip } from '../../contexts/PipContext';
import * as ScreenOrientation from 'expo-screen-orientation';
import default_logo from "../../assets/images/tv_banner.png";


export const watchHistoryEvent = new EventEmitter();

interface PlayerScreenProps {
  route: {
    params?: {
      url?: string;
    };
  };
}

interface VideoDimensions {
  width: number;
  height: number;
}

const PlayerScreen: React.FC<PlayerScreenProps> = ({ route }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { url } = route.params || {};
  const { channels, refetch, upcomingProgrammes } = useM3uParse();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const selectedChannel = channels.find((channel) => channel.url === url);
  const channelName = selectedChannel?.name || "Unknown Channel";

  const [isPlaying, setIsPlaying] = useState(!!url);
  const [videoDimensions, setVideoDimensions] = useState<VideoDimensions>({
    width: width,
    height: Dimensions.get("window").height * 0.4,
  });
  const [refreshing, setRefreshing] = useState(false);
  const { setPipMode } = usePip();
  const [isInPipMode, setIsInPipMode] = useState(false);

  const updateVideoDimensions = useCallback(() => {
    setVideoDimensions({
      width,
      height: Dimensions.get("window").height * 0.4,
    });
  }, [width]);

  useEffect(() => {
    updateVideoDimensions();
  }, [updateVideoDimensions]);

  useEffect(() => {
    const handleBackPress = () => {
      if (isInPipMode) {
        handlePipModeChange(false);
        return true;
      }
      return false;
    };

    BackHandler.addEventListener("hardwareBackPress", handleBackPress);
    return () => {
      BackHandler.removeEventListener("hardwareBackPress", handleBackPress);
    };
  }, [isInPipMode]);

  useEffect(() => {
    const lockOrientation = async () => {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };

    lockOrientation();

    return () => {
      lockOrientation();
    };
  }, []);


  useEffect(() => {
    const unsubscribeFocus = navigation.addListener('focus', () => {
      if (!isInPipMode) {
        setIsPlaying(true);
      }
    });

    return unsubscribeFocus;
  }, [navigation, isInPipMode]);

  useEffect(() => {
    const unsubscribeBlur = navigation.addListener('blur', () => {
      setIsPlaying(false);
    });

    return unsubscribeBlur;
  }, [navigation]);

  const handleLoadStart = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleLoad = useCallback(() => {
    setIsPlaying(true);
    saveWatchHistory(url, channelName);
  }, [url, channelName]);

  const handleBuffer = useCallback(({ isBuffering }: { isBuffering: boolean }) => {
    setIsPlaying(!isBuffering);
  }, []);

  const handleError = useCallback(() => {
    setIsPlaying(false);
    Toast.show({
      type: "error",
      text1: "Failed to Load Video",
      text2: "There was an error loading the video.",
      position: "top",
      visibilityTime: 4000,
      autoHide: true,
    });
    handleRefresh();
  }, [handleRefresh]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (error) {
      console.error("Refresh error:", error);
      Toast.show({
        type: "error",
        text1: "Refresh Failed",
        text2: "There was an error while refreshing the video.",
      });
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const handlePipModeChange = useCallback((isInPipMode: boolean) => {
    console.log("PiP mode changed:", isInPipMode);
    setIsInPipMode(isInPipMode);
    setPipMode(isInPipMode, url, selectedChannel);
    setIsPlaying(!isInPipMode);

    if (Platform.OS === 'android') {
      // Additional Android-specific PiP logic
    } else if (Platform.OS === 'ios') {
      // Additional iOS-specific PiP logic
    }
  }, [url, selectedChannel, setPipMode]);

  const saveWatchHistory = useCallback(async (videoUrl: string, channelName: string) => {
    try {
      const existingHistory = await AsyncStorage.getItem('watchHistory');
      const history = existingHistory ? JSON.parse(existingHistory) : [];
      const newEntry = {
        url: videoUrl,
        name: channelName,
        timestamp: Date.now(),
        logo: selectedChannel?.logo || "default_logo"
      };

      const updatedHistory = [newEntry, ...history].filter((item, index, self) =>
        index === self.findIndex(t => t.url === item.url)
      );
      const limitedHistory = updatedHistory.slice(0, 20);
      await AsyncStorage.setItem('watchHistory', JSON.stringify(limitedHistory));
      watchHistoryEvent.emit("historyUpdated");
    } catch (error) {
      console.error("Failed to save watch history:", error);
      Toast.show({
        type: "error",
        text1: "Failed to Save History",
        text2: "There was an error saving your watch history.",
      });
    }
  }, [selectedChannel]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar hidden={true} />

      <ScrollView
        contentContainerStyle={styles.scrollViewContent}
        bounces={true}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.contentContainer}>
          {url ? (
            <View style={[styles.videoContainer, videoDimensions]}>
              <VideoPlayer
                key={url} 
                url={url}
                channel={selectedChannel}
                onError={handleError}
                paused={!isPlaying}
                style={{ height: "100%", width: "100%" }}
                onRefresh={handleRefresh}
                onPipModeChange={handlePipModeChange}
                isPipEnabled={true}
                onLoadStart={handleLoadStart}
                onLoad={handleLoad}
                onBuffer={handleBuffer}
              />
            </View>
          ) : (
            <View style={[styles.videoPlaceholder, videoDimensions]}>
              <Text style={styles.placeholderText}>Select a Channel to Watch</Text>
            </View>
          )}
          <View style={styles.infoContainer}>
            <EPGInfo
              tvgId={selectedChannel?.tvgId || null}
              channelName={channelName}
            />
          </View>
          <View style={upcomingProgrammes && upcomingProgrammes.length > 0 ? styles.channelListWithUpcoming : styles.channelListWithoutUpcoming}>
            <ChannelList channels={channels} currentChannelUrl={url} />
          </View>
        </View>
      </ScrollView>
      <Toast />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    justifyContent: "flex-start",
    alignItems: "stretch",
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 10,
  },
  contentContainer: {
    flexDirection: "column",
    flex: 1,
  },
  infoContainer: {
    marginTop: 10,
    paddingHorizontal: 10,
  },
  videoPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
    height: Dimensions.get("window").height * 0.4,
    width: "100%",
  },
  placeholderText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  videoContainer: {
    alignContent: "center",
    width: "100%",
    height: Dimensions.get("window").height * 0.4,
  },
  channelListWithUpcoming: {
    marginTop: 20,
    paddingHorizontal: 10,
  },
  channelListWithoutUpcoming: {
    marginTop: 20,
    paddingHorizontal: 10,
  },
});

export default PlayerScreen;