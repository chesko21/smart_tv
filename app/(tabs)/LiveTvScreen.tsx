import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  Text,
  StyleSheet,
  ImageBackground,
  RefreshControl,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import useM3uParse from "../../hooks/M3uParse";
import LiveTVCard from "../../components/LiveTVCard";
import Colors from "../../constants/Colors";
import DEFAULT_CATEGORY_IMAGE from "../../assets/images/maskable.png";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LottieView from 'lottie-react-native';  
import { usePip } from '../../contexts/PipContext';

const LiveTV = () => {
  const router = useRouter();
  const navigation = useNavigation();
  const { channels, groups, loading, error, refetch } = useM3uParse();
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { setPipMode } = usePip();

  const filteredChannels = useMemo(() => {
    return selectedGroup ? channels.filter((ch) => ch.group === selectedGroup) : [];
  }, [channels, selectedGroup]);

  const hideTabBar = useCallback(() => {
    navigation.getParent()?.setOptions({
      tabBarStyle: { display: "none" },
    });
  }, [navigation]);

  const showTabBar = useCallback(() => {
    navigation.getParent()?.setOptions({
      tabBarStyle: undefined,
    });
  }, [navigation]);

  const renderChannelItem = useCallback(({ item }) => (
    <LiveTVCard
      channel={item}
      onPress={() => {
        hideTabBar();
        setPipMode(false); 
        navigation.navigate('PlayerScreen', { url: item.url });
      }}
    />
  ), [hideTabBar, navigation, setPipMode]);

  

  const renderGroupItem = useCallback(({ item }) => (
    <TouchableOpacity
      style={styles.groupCard}
      onPress={() => setSelectedGroup(item)}
      activeOpacity={0.8}
    >
      <ImageBackground
        source={DEFAULT_CATEGORY_IMAGE}
        style={styles.groupImage}
        imageStyle={{ borderRadius: 15 }}
      >
        <View style={styles.overlay} />
        <Text style={styles.groupText}>{item}</Text>
      </ImageBackground>
    </TouchableOpacity>
  ), []);

  const { top } = useSafeAreaInsets(); 

  useEffect(() => {
    return () => {
      showTabBar();
    };
  }, [showTabBar]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
        await refetch(); 
    } catch (error) {
        console.error("Error refreshing:", error);
    } finally {
        setRefreshing(false);
    }
}, [refetch]);

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <LottieView
            source={require("../../assets/animations/loading.json")} 
            autoPlay
            loop
            style={styles.lottie}
          />
          <Text style={styles.loadingText}>Memuat saluran TV...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error.message}</Text>
          <TouchableOpacity 
            style={styles.reloadButton}
            onPress={refetch}
          >
            <Text style={styles.reloadButtonText}>Reload</Text>
          </TouchableOpacity>
        </View>
      ) : selectedGroup ? (
        <>
          <TouchableOpacity
            style={[styles.backButton, { marginTop: top + 10 }]} 
            onPress={() => {
              setSelectedGroup(null);
              showTabBar();
            }}
          >
            <Text style={styles.backText}>← Kembali</Text>
          </TouchableOpacity>

          <FlatList
    key={`channels-${selectedGroup}`}
    data={filteredChannels}
    numColumns={3}
    keyExtractor={(item) => item.url}
    contentContainerStyle={styles.channelList}
    renderItem={renderChannelItem}
    refreshControl={
        <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh} 
            colors={[Colors.primary]}
            tintColor={Colors.primary}
        />
    }
/>
        </>
      ) : (
        <>
          <Text style={styles.title}>🎥 LIVE TV GROUP</Text>
          <FlatList
            key="groupList"
            data={groups}
            numColumns={3}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.groupList}
            renderItem={renderGroupItem}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[Colors.primary]}
                tintColor={Colors.primary}
              />
            }
          />
        </>
      )}
    </SafeAreaView>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: Colors.primary,
    fontSize: 16,
    fontWeight: "bold",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  reloadButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  reloadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
    marginTop: 20,
    padding: 5,
    textAlign: "center",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    alignSelf: "flex-start",
    marginBottom: 15,
  },
  backText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  groupList: {
    paddingBottom: 10,
  },
  groupCard: {
    width: "30%",
    margin: 5,
    borderRadius: 15,
    overflow: "hidden",
    height: 120,
    backgroundColor: "#1E293B",
    elevation: 2,
  },
  groupImage: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 12,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(54, 11, 122, 0.32)",
    borderRadius: 10,
  },
  groupText: {
    color: "#edec25",
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
    textTransform: "uppercase",
    position: 'absolute',
    top: 2,
    left: 10,
    right: 10,
  },
  channelList: {
    justifyContent: "center",
    paddingBottom: 10,
  },
  lottie: {
    width: 200,
    height: 200,
  },
});

export default LiveTV;