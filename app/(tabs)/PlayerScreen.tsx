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

export const watchHistoryEvent = new EventEmitter();

const PlayerScreen = ({ route }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { url } = route.params || {};
  const { channels, refetch, upcomingProgrammes } = useM3uParse();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const selectedChannel = channels.find((channel) => channel.url === url);
  const channelName = selectedChannel?.name || "Unknown Channel";
  
  const [isPlaying, setIsPlaying] = useState(!!url);
  const [videoDimensions, setVideoDimensions] = useState({
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

  useFocusEffect(
    useCallback(() => {
      const resumeVideo = () => {
        if (!isInPipMode) {
          setIsPlaying(true);
        }
      };

      const pauseVideo = () => {
        setIsPlaying(false);
      };

      const unsubscribeFocus = navigation.addListener("focus", resumeVideo);
      const unsubscribeBlur = navigation.addListener("blur", pauseVideo);

      return () => {
        unsubscribeFocus();
        unsubscribeBlur();
      };
    }, [navigation, isInPipMode])
  );

  const handleLoadStart = () => {
    setIsPlaying(false);
  };

  const handleLoad = () => {
    setIsPlaying(true);
    saveWatchHistory(url, channelName);
  };

  const handleBuffer = ({ isBuffering }) => {
    setIsPlaying(!isBuffering);
  };

  const handleError = () => {
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
  };

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

  const handlePipModeChange = useCallback((isInPipMode: boolean | ((prevState: boolean) => boolean)) => {
    setIsInPipMode(isInPipMode);
    setPipMode(isInPipMode, url, selectedChannel);
    setIsPlaying(!isInPipMode);
  }, [url, selectedChannel, setPipMode]);

  const saveWatchHistory = async (videoUrl: any, channelName: string) => {
      try {
        const existingHistory = await AsyncStorage.getItem('watchHistory');
        const history = existingHistory ? JSON.parse(existingHistory) : [];
        const newEntry = { 
          url: videoUrl, 
          name: channelName, 
          timestamp: Date.now(),
          logo: selectedChannel?.tvgLogo || selectedChannel?.logo || "https://img.lovepik.com/png/20231108/cute-cartoon-water-drop-coloring-page-can-be-used-for_531960_wh860.png"
        };
      
      const updatedHistory = [newEntry, ...history].filter((item, index, self) =>
        index === self.findIndex(t => t.url === item.url)
      );
      const limitedHistory = updatedHistory.slice(0, 20);
      await AsyncStorage.setItem('watchHistory', JSON.stringify(limitedHistory));
      watchHistoryEvent.emit("historyUpdated");
    } catch (error) {
      console.error("Failed to save watch history:", error);
    }
  };
  const handleFullscreenChange = useCallback(async (fullscreen: boolean | ((prevState: boolean) => boolean)) => {
    setIsFullscreen(fullscreen);
    if (fullscreen) {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT);
    } else {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    }
  }, []);
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);
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
                onFullscreenChange={handleFullscreenChange}
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
    //justifyContent: "flex-start",
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