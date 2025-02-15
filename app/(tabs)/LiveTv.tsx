import React, { useState, useMemo, useCallback } from "react";
import { 
  View, FlatList, TouchableOpacity, Text, 
  StyleSheet, ImageBackground, ActivityIndicator 
} from "react-native";
import { useRouter } from "expo-router";
import useM3uParse from "../../hooks/M3uParse";
import LiveTVCard from "../../components/LiveTVCard";
import Colors from "../../constants/Colors";
import DEFAULT_CATEGORY_IMAGE from "../../assets/images/maskable.png";

const LiveTV = () => {
  const router = useRouter();
  const { channels, groups, loading, error } = useM3uParse(); 
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
   const filteredChannels = useMemo(() => {
    return selectedGroup ? channels.filter((ch) => ch.group === selectedGroup) : [];
  }, [channels, selectedGroup]);
  const renderChannelItem = useCallback(({ item }) => (
    <LiveTVCard
      channel={item}
      onPress={() => router.push({ pathname: "/PlayerScreen", params: { url: item.url } })}
    />
  ), []);

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

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Memuat saluran TV...</Text>
        </View>
      ) : selectedGroup ? (
        <>
          <TouchableOpacity style={styles.backButton} onPress={() => setSelectedGroup(null)}>
            <Text style={styles.backText}>← Kembali</Text>
          </TouchableOpacity>

          <FlatList
            key={`channels-${selectedGroup}`} 
            data={filteredChannels}
            numColumns={3} 
            keyExtractor={(item) => item.url}
            contentContainerStyle={styles.channelList}
            renderItem={renderChannelItem}
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
          />
        </>
      )}
    </View>
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
    marginTop: 20,
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
});

export default LiveTV;
