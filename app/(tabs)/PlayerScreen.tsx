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
import { useNavigation } from "@react-navigation/native";
import useM3uParse from "../../hooks/M3uParse";
import { useFocusEffect } from "@react-navigation/native";
import { EventEmitter } from "expo-modules-core";
import Toast from "react-native-toast-message";
import VideoPlayer from "../../components/VideoPlayer";
import EPGInfo from "../../components/EPGInfo";
import ChannelList from "../../components/ChannelList";
import * as ScreenOrientation from 'expo-screen-orientation';

export const watchHistoryEvent = new EventEmitter();

const PlayerScreen = ({ route }) => {
  const { url} = route.params || {};
  const { channels, refetch, upcomingProgrammes } = useM3uParse();
  const navigation = useNavigation();
  const { width, height } = useWindowDimensions();
  const selectedChannel = channels.find((channel) => channel.url === url);
  const channelName = selectedChannel?.name || "Unknown Channel";
  const [hasSavedHistory, setHasSavedHistory] = useState(false);
  const [isPlaying, setIsPlaying] = useState(!!url);
  const [videoWidth, setVideoWidth] = useState(width);
  const [videoHeight, setVideoHeight] = useState(Dimensions.get("window").height * 0.4);
  const [refreshing, setRefreshing] = useState(false);
  const [isInPipMode, setIsInPipMode] = useState(false);

  const updateDimensions = useCallback(() => {
    setVideoWidth(width);
    setVideoHeight(Dimensions.get("window").height * 0.4);
  }, [height, width]);

  useEffect(() => {
    updateDimensions();
  }, [updateDimensions]);

  useFocusEffect(
    useCallback(() => {
      const pauseVideo = () => setIsPlaying(false);
      const resumeVideo = () => setIsPlaying(true);

      const unsubscribeFocus = navigation.addListener("focus", resumeVideo);
      const unsubscribeBlur = navigation.addListener("blur", pauseVideo);

      return () => {
        unsubscribeFocus();
        unsubscribeBlur();
      };
    }, [navigation])
  );

  useEffect(() => {
    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        if (url && isPlaying) {
          // Enter PiP mode instead of going back
          handlePipModeChange(true);
          return true;
        }
        return false;
      });

      return () => backHandler.remove();
    }
  }, [url, isPlaying]);

  const saveToWatchHistory = useCallback(async () => {
    try {
      if (!selectedChannel || !selectedChannel.logo || !selectedChannel.url) return;

      const newEntry = {
        name: channelName,
        timestamp: new Date().toLocaleString(),
        logo: selectedChannel.logo,
        url: selectedChannel.url,
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
      console.error("Error saving to watch history:", error);
    }
  }, [channelName, selectedChannel]);

  useEffect(() => {
    if (route.params && route.params.url) {
      saveToWatchHistory();
    }
  }, [route.params, saveToWatchHistory]);

  const handleLoadStart = () => {
    setIsPlaying(false);
  };

  const handleLoad = () => {
    setHasSavedHistory(true);
    setIsPlaying(true);
  };

  const handleBuffer = ({ isBuffering }) => {
    setIsPlaying(!isBuffering);
  };

  const handleError = () => {
    setIsPlaying(false);
    Toast.show({
      type: "error",
      text1: "Gagal Memuat Video",
      text2: "Terjadi kesalahan saat memuat video.",
      position: "top",
      visibilityTime: 4000,
      autoHide: true,
    });
    handleRefresh();
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);

    try {
      refetch();
    } catch (error) {
      console.error("Refresh error:", error);
      Toast.show({
        type: "error",
        text1: "Refresh Gagal",
        text2: "Terjadi kesalahan saat memuat video.",
      });
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const handlePipModeChange = useCallback(async (isInPipMode: boolean) => {
    setIsInPipMode(isInPipMode);
    
    if (isInPipMode) {
      // Lock orientation to portrait when entering PiP
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP
      );
    } else {
      // Unlock orientation when exiting PiP
      await ScreenOrientation.unlockAsync();
    }
  }, []);

  // Update video dimensions for PiP
  useEffect(() => {
    if (isInPipMode) {
      setVideoWidth(width * 0.4); // Smaller size for PiP
      setVideoHeight(height * 0.3);
    } else {
      setVideoWidth(width);
      setVideoHeight(Dimensions.get("window").height * 0.4);
    }
  }, [isInPipMode, width, height]);

  return (
    <SafeAreaView style={[
      styles.container,
      isInPipMode && styles.pipContainer
    ]}>
      <StatusBar hidden={true} />
      <ScrollView
        contentContainerStyle={styles.scrollViewContent}
        bounces={!isInPipMode}
        scrollEnabled={!isInPipMode}
        refreshControl={
          !isInPipMode ? 
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} /> : 
            undefined
        }
      >
        <View style={styles.contentContainer}>
          {!url && (
            <View style={[styles.videoPlaceholder, { width: videoWidth, height: videoHeight }]}>
              <Text style={styles.placeholderText}>Pilih Channel yang Ingin Ditonton</Text>
            </View>
          )}
          {url && (
            <View style={[
              styles.videoContainer, 
              { width: videoWidth, height: videoHeight },
              isInPipMode && styles.pipVideoContainer
            ]}>
              <VideoPlayer
                url={url}
                channel={selectedChannel}
                onError={handleError}
                paused={!isPlaying}
                maxHeight={videoHeight}
                style={{ height: "100%", width: "100%" }}
                onRefresh={handleRefresh}
                onPipModeChange={handlePipModeChange}
                isPipEnabled={true}
              />
            </View>
          )}
          {!isInPipMode && (
            <>
              <View style={styles.infoContainer}>
                <EPGInfo 
                  tvgId={selectedChannel?.tvgId || null} 
                  channelName={channelName} 
                />
              </View>
              <View style={
                upcomingProgrammes && upcomingProgrammes.length > 0
                  ? styles.channelListWithUpcoming
                  : styles.channelListWithoutUpcoming
              }>
                <ChannelList channels={channels} currentChannelUrl={url} />
              </View>
            </>
          )}
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
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  contentContainer: {
    flexDirection: "column",
  },
  infoContainer: {
    marginTop: 10,
    paddingHorizontal: 10,
  },
  videoPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  placeholderText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  videoContainer: {
    marginTop: 10,
  },
  channelListWithUpcoming: {
    marginTop: 20,
    paddingHorizontal: 10,
  },
  channelListWithoutUpcoming: {
    marginTop: 0,
    paddingHorizontal: 10,
  },
  pipContainer: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: '40%',
    height: '30%',
    zIndex: 999,
  },
  pipVideoContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  }
});

export default PlayerScreen;