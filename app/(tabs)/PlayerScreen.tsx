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
import { usePip } from '../../contexts/PipContext';

export const watchHistoryEvent = new EventEmitter();

const PlayerScreen = ({ route }) => {
  const { url } = route.params || {};
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
  const { setPipMode } = usePip();
  const [isInPipMode, setIsInPipMode] = useState(false);

  const updateDimensions = useCallback(() => {
    setVideoWidth(width);
    setVideoHeight(Dimensions.get("window").height * 0.4);
  }, [width]);

  useEffect(() => {
    const handleBackPress = () => {
      if (isInPipMode) {
        handlePipModeChange(false);
        return true; // Prevent the default back action
      }
      return false; // Allow default back action
    };

    BackHandler.addEventListener("hardwareBackPress", handleBackPress);

    return () => {
      BackHandler.removeEventListener("hardwareBackPress", handleBackPress);
    };
  }, [isInPipMode]);

  useEffect(() => {
    updateDimensions();
  }, [updateDimensions]);

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

  const saveToWatchHistory = useCallback(async () => {
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
      refetch();
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

  const handlePipModeChange = useCallback((isInPipMode) => {
    setIsInPipMode(isInPipMode);
    setPipMode(isInPipMode, url, selectedChannel);
    setIsPlaying(!isInPipMode); // Pause or play depending on entering PIP mode
  }, [url, selectedChannel, setPipMode]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar hidden={true} />
      <ScrollView
        contentContainerStyle={styles.scrollViewContent}
        bounces={true}
        scrollEnabled={true}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.contentContainer}>
          {!url && (
            <View style={[styles.videoPlaceholder, { width: videoWidth, height: videoHeight }]}>
              <Text style={styles.placeholderText}>Select a Channel to Watch</Text>
            </View>
          )}
          {url && (
            <View style={[
              styles.videoContainer, 
              { width: videoWidth, height: videoHeight },
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
    right: 16,
    bottom: 16,
    width: 180, 
    height: 100, 
    zIndex: 999,
    backgroundColor: '#000',
    borderRadius: 8,
  },
  pipVideoContainer: {
    width: '100%',
    height: '100%',
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
  },
  epgInfoInPip: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1000,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 5,
    padding: 5,
  },
  channelListInPip: {
    position: 'absolute',
    bottom: 120,
    right: 16,
    width: 'auto',
    zIndex: 1000,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 5,
    padding: 5,
  },
});

export default PlayerScreen;