import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { useRouter } from "expo-router";
import epgData from "../hooks/processedEPG.json";

interface Programme {
  start: string;
  stop: string;
  title: string;
}

interface Channel {
  tvgId: string;
  programme: Programme[];
}

const Schedule = () => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const router = useRouter();

  useEffect(() => {
    setChannels(epgData);
  }, []);

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.container}>
        <View style={styles.leftPanel}>
          <Text style={styles.title}>Channel</Text>
          <FlatList
            data={channels}
            keyExtractor={(item) => item.tvgId}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={[
                  styles.channelItem, 
                  selectedChannel?.tvgId === item.tvgId && styles.selectedChannel
                ]}
                onPress={() => setSelectedChannel(item)}
              >
                <Text style={styles.channelText}>{item.tvgId}</Text>
              </TouchableOpacity>
            )}
          />
        </View>

        <View style={styles.rightPanel}>
          <Text style={styles.title}>
            {selectedChannel ? `Jadwal ${selectedChannel.tvgId}` : "Pilih Channel"}
          </Text>
          {selectedChannel ? (
            <FlatList
              data={selectedChannel.programme}
              keyExtractor={(program, index) => String(index)}
              renderItem={({ item: program }) => (
                <View style={styles.programmeItem}>
                  <Text style={styles.programmeTitle}>{program.title}</Text>
                </View>
              )}
            />
          ) : (
            <Text style={styles.noSelectionText}>Silakan pilih channel dari daftar kiri.</Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: "#222" },
  container: { flex: 1, flexDirection: "row" },
  leftPanel: { width: "40%", backgroundColor: "#333", padding: 5 },
  rightPanel: { width: "60%", backgroundColor: "#222", padding: 5 },
  title: { fontSize: 18, fontWeight: "bold", color: "#ffcc00", marginBottom: 10 },
  channelItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: "#444" },
  selectedChannel: { backgroundColor: "#555" },
  channelText: { fontSize: 16, color: "#fff" },
  programmeItem: { backgroundColor: "#444", padding: 10, borderRadius: 5, marginVertical: 4 },
  programmeTitle: { fontSize: 16, color: "#fff", fontWeight: "bold" },
  noSelectionText: { fontSize: 16, color: "#888", textAlign: "center", marginTop: 20 },
});

export default Schedule;
