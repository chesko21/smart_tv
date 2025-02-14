import React, { useState } from "react";
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

  const filteredChannels = selectedGroup ? channels.filter((ch: { group: string; }) => ch.group === selectedGroup) : [];

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
            renderItem={({ item }) => (
              <LiveTVCard
                channel={item}
                onPress={() => router.push({ pathname: "/PlayerScreen", params: { url: item.url } })}
              />
            )}
          />
        </>
      ) : (
        <>
         <Text style={{ color: "#fff", fontSize: 22, fontWeight: "bold", marginBottom: 10 , marginTop: 30, padding: 5 }}>🎥 LIVE TV GROUP</Text>
          <FlatList
            key="groupList"
            data={groups} 
            numColumns={3}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.groupList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.groupCard}
                onPress={() => setSelectedGroup(item)}
                activeOpacity={0.8}
              >
                <ImageBackground
                source={ DEFAULT_CATEGORY_IMAGE }
                  style={styles.groupImage}
                  imageStyle={{ borderRadius: 15 }}
                >
                  <View style={styles.overlay} />
                  <Text style={styles.groupText}>{item}</Text>
                </ImageBackground>
              </TouchableOpacity>
            )}
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
    width: '30%',
    margin: 5,
    borderRadius: 15,
    overflow: 'hidden',
    height: 120,
    backgroundColor: '#1E293B',
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
    fontSize: 10,
    textDecorationLine: "underline",
    fontWeight: "bold",
    textAlign: "center",
    position: "absolute",
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
