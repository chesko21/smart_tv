// Importing necessary dependencies
import React, { useEffect, useState, useCallback } from "react";
import { ActivityIndicator } from "react-native";
import { View, Text, StyleSheet, Animated, useWindowDimensions, Button } from "react-native";
import { DateTime } from "luxon";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEPG } from '../contexts/EPGContext';
import { LinearGradient } from "expo-linear-gradient";
import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';

// Define types for programs and props
interface Program {
  channel: string;
  start: string;
  stop: string;
  title: string;
}

interface EPGInfoProps {
  tvgId: string | null;
  channelName: string;
}

// Utility function to normalize TVG ID
const normalizeTvgId = (id: string | null) => id?.trim() || '';

const EPGInfo: React.FC<EPGInfoProps> = ({ tvgId, channelName }) => {
  const [programmes, setProgrammes] = useState<(Program | undefined)[]>([]);
  const [upcomingProgrammes, setUpcomingProgrammes] = useState<Program[]>([]);
  const { width } = useWindowDimensions();
  const scrollAnim = useState(new Animated.Value(0))[0];
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { defaultEpgUrls } = useEPG(); 

  // Fetch and process EPG data
  const fetchAndProcessEPG = useCallback(async () => {
    let channelsData: { [key: string]: { tvgId: string, programme: Program[] } } = {};
    
    for (const url of defaultEpgUrls) {
      console.log(`📡 Fetching EPG from: ${url}`);
      try {
        const response = await axios.get(url, { timeout: 5000 }); 
        const xmlData = response.data;

        const parser = new XMLParser({
          ignoreAttributes: false,
          attributeNamePrefix: "",
          parseTagValue: true,
          trimValues: true,
        });

        const parsed = parser.parse(xmlData);
        let programmes: Program[] = [];

        if (parsed?.tv?.programme) {
          programmes = Array.isArray(parsed.tv.programme) ? parsed.tv.programme : [parsed.tv.programme];
        } else if (parsed?.epg?.channel) {
          const channels = Array.isArray(parsed.epg.channel) ? parsed.epg.channel : [parsed.epg.channel];
          channels.forEach((channel: { programme: any; id: any; }) => {
            if (channel.programme) {
              const channelProgrammes = Array.isArray(channel.programme) ? channel.programme : [channel.programme];
              programmes.push(...channelProgrammes.map(prog => ({
                ...prog,
                channel: channel.id || "",
              })));
            }
          });
        } else {
          console.warn(`⚠️ Invalid XML format from ${url}. Check the structure.`);
          continue;
        }

        programmes.forEach(prog => {
          const { start, stop, title } = prog;
          const channel = prog.channel || "unknown";
          if (!channelsData[channel]) {
            channelsData[channel] = { tvgId: channel, programme: [] };
          }
          channelsData[channel].programme.push({
            start: start || "00000000000000",
            stop: stop || "00000000000000",
            title: typeof title === "string" ? title : title?.["#text"] || "No Title",
            channel: ""
          });
        });

        console.log(`✅ Successfully processed: ${url}`);
      } catch (error) {
        console.error(`❌ Failed to fetch ${url}:`, (error as Error).message);
        setError("Gagal memuat data EPG. Silakan coba lagi nanti."); 
      }
    }

    const result = Object.values(channelsData);
    await AsyncStorage.setItem('epgData', JSON.stringify(result));
    await AsyncStorage.setItem('lastUpdated', Date.now().toString());
    console.log("✅ All EPG data processed and saved to AsyncStorage!");
  }, [defaultEpgUrls]);

  useEffect(() => {
    const loadEPGData = async () => {
      setError(null);
      setLoading(true);

      try {
        const storedData = await AsyncStorage.getItem('epgData');
        const lastUpdated = await AsyncStorage.getItem('lastUpdated');
        const now = Date.now();
  
        if (!storedData || !lastUpdated || (now - parseInt(lastUpdated) > 86400000)) {
          await fetchAndProcessEPG();
        } else {
          const epgData = JSON.parse(storedData);
          const epgChannel = epgData.find((epg: { tvgId: string }) => normalizeTvgId(epg.tvgId) === normalizeTvgId(tvgId)) || null;

          if (epgChannel) {
            const nowLocal = DateTime.local().setZone("UTC");
            const nowString = nowLocal.toFormat("yyyyMMddHHmmss");
  
            const currentProgram = epgChannel.programme.find((prog: Program) => {
              const startsAt = parseInt(prog.start);
              const stopsAt = parseInt(prog.stop);
              const now = parseInt(nowString);
              return startsAt <= now && (!stopsAt || stopsAt > now);
            }) || { title: "Tidak ada informasi program", start: "", stop: "" };
  
            const nextProgram = epgChannel.programme.find((prog: Program) => parseInt(prog.start) > parseInt(nowString)) || { title: "Tidak ada informasi program", start: "", stop: "" };
            const upcoming = epgChannel.programme.filter((prog: Program) => parseInt(prog.start) > parseInt(nowString)).slice(0, 5);

            setProgrammes([currentProgram, nextProgram]);
            setUpcomingProgrammes(upcoming.length > 0 ? upcoming : [{
              title: "Tidak ada informasi program", start: "", stop: ""
            }]);
          } else {
            setProgrammes([{
              title: "Tidak ada informasi program", start: "", stop: "",
              channel: ""
            }, {
              title: "Tidak ada informasi program", start: "", stop: "",
              channel: ""
            }]);
            setUpcomingProgrammes([{
              title: "Tidak ada informasi program", start: "", stop: "",
              channel: ""
            }]);
          }
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load EPG data.");
      } finally {
        setLoading(false);
        setLastUpdated(new Date());
      }
    };

    loadEPGData();

    const interval = setInterval(() => {
      fetchAndProcessEPG();
    }, 86400000);

    return () => clearInterval(interval); 
  }, [fetchAndProcessEPG, tvgId]); 
  
  // Format time function
  const formatTime = (timeString: string | undefined | null) => {
    if (!timeString) {
      return DateTime.local().toFormat("HH:mm");
    }

    const datePart = timeString.substring(0, 14);
    return DateTime.fromFormat(datePart, "yyyyMMddHHmmss", { zone: "UTC" })
      .setZone("Asia/Jakarta").toFormat("HH:mm");
  };

  // Scroll animation for upcoming programs
  useEffect(() => {
    Animated.loop(
      Animated.timing(scrollAnim, {
        toValue: -width,
        duration: 10000,
        useNativeDriver: true,
      }),
      { iterations: -1 }
    ).start();
  }, [scrollAnim, width]);

  // Function to truncate text
  const truncateText = (text: string | undefined, maxLength: number) => {
    if (!text) return "Tidak ada program";
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e3c800" />
        <Text style={styles.loadingText}>Memuat data EPG...</Text>
        {lastUpdated && (
          <Text style={styles.lastUpdatedText}>
            Terakhir diperbarui: {lastUpdated.toLocaleTimeString()}
          </Text>
        )}
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Button title="Coba Lagi" onPress={loadEPGData} color="#e3c800" />
      </View>
    );
  }

  return (
    <View>
      <LinearGradient colors={["#2b2b2b", "#1e1e1e"]} style={styles.programmeContainer}>
        {/* Current Program */}
        <View style={styles.programmeBox}>
          <View style={styles.programmeLeft}>
            <Text style={styles.programmeTitle}>Sedang Tayang</Text>
            <Text style={styles.programmeText}>{truncateText(programmes[0]?.title, 20)}</Text>
            <Text style={styles.programmeTime}>
              {formatTime(programmes[0]?.start)} - {formatTime(programmes[0]?.stop)} WIB
            </Text>
          </View>
          
          {/* Next Program */}
          <View style={styles.programmeRight}>
            <Text style={styles.programmeTitle}>Tayangan Berikut</Text>
            <Text style={styles.programmeText}>{truncateText(programmes[1]?.title, 20)}</Text>
            <Text style={styles.programmeTime}>
              {formatTime(programmes[1]?.start)} - {formatTime(programmes[1]?.stop)} WIB
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Upcoming Programs */}
      {upcomingProgrammes.length > 0 && (
        <View style={styles.upcomingContainer}>
          <Text style={styles.upcomingTitle}>{channelName}</Text>
          <Animated.View style={[styles.scrollContainer, { transform: [{ translateX: scrollAnim }] }]}>
            {upcomingProgrammes.map((item, index) => (
              <Text key={index} style={styles.upcomingText}>
                {truncateText(item.title, 20)} - {formatTime(item.start)} - {formatTime(item.stop)} WIB{"    "}
              </Text>
            ))}
          </Animated.View>
        </View>
      )}
    </View>
  );
};

// Styling for the component
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#e3c800',
    marginTop: 10,
    fontSize: 16,
  },
  lastUpdatedText: {
    color: '#888',
    fontSize: 12,
    marginTop: 5,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 16,
    textAlign: 'center',
  },
  programmeContainer: {
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 15,
  },
  programmeBox: {
    flexDirection: "row",
    alignItems: "center",
  },
  programmeLeft: {
    flex: 1,
    paddingRight: 10,
    borderRightWidth: 1,
    borderRightColor: "#444",
    alignItems: "center",
  },
  programmeRight: {
    flex: 1,
    paddingLeft: 10,
    alignItems: "center",
  },
  programmeTitle: {
    color: "#e3c800",
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 5,
    textAlign: "center",
  },
  programmeText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 5,
  },
  programmeTime: {
    color: "#ddd",
    fontSize: 13,
    marginTop: 2,
    textAlign: "center",
  },
  upcomingContainer: {
    marginTop: 20,
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  upcomingTitle: {
    color: "#e3c800",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  scrollContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  upcomingText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
    marginRight: 20,
  },
});

export default EPGInfo;