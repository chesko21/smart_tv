import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  useWindowDimensions,
} from "react-native";
import { DateTime } from "luxon";
import epgData from "../hooks/processedEPG.json";
import { LinearGradient } from "expo-linear-gradient";

interface Program {
  start: string;
  stop: string;
  title: string;
}

interface EPGInfoProps {
  tvgId: string | null;
  channelName: string;
}

// Normalize TVG ID function
const normalizeTvgId = (id: string | null) => id?.trim() || '';

const EPGInfo: React.FC<EPGInfoProps> = ({ tvgId, channelName }) => {
  const [programmes, setProgrammes] = useState<(Program | undefined)[]>([]);
  const [upcomingProgrammes, setUpcomingProgrammes] = useState<Program[]>([]);
  const { width } = useWindowDimensions();
  const scrollAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    if (!tvgId) {
      setProgrammes([]);
      setUpcomingProgrammes([{
        title: "Tidak ada informasi program",
        start: "",
        stop: ""
      }]);
      return;
    }
  
    const epgChannel = epgData.find(epg => normalizeTvgId(epg.tvgId) === normalizeTvgId(tvgId)) || null;
  
    if (epgChannel) {
      const nowLocal = DateTime.local();
      const nowUtc = nowLocal.setZone("UTC"); 
      const nowString = nowUtc.toFormat("yyyyMMddHHmmss");
  
      const currentProgram = epgChannel.programme.find((prog: Program) => {
        const startsAt = prog.start;
        const stopsAt = prog.stop;
        return startsAt <= nowString && (!stopsAt || stopsAt > nowString);
      }) || { title: "Tidak ada informasi program", start: "", stop: "" };
  
      const nextProgram = epgChannel.programme.find(prog =>
        prog.start > nowString
      ) || { title: "Tidak ada informasi program", start: "", stop: "" };
  
      const upcoming = epgChannel.programme
        .filter(prog => prog.start > nowString)
        .slice(0, 5);
  
      setProgrammes([currentProgram, nextProgram]);
      setUpcomingProgrammes(upcoming.length > 0 ? upcoming : [{
        title: "Tidak ada informasi program",
        start: "",
        stop: ""
      }]);
    } else {
      setProgrammes([
        { title: "Tidak ada informasi program", start: "", stop: "" },
        { title: "Tidak ada informasi program", start: "", stop: "" }
      ]);
      setUpcomingProgrammes([{
        title: "Tidak ada informasi program",
        start: "",
        stop: ""
      }]);
    }
  }, [tvgId]);
  
  
  const formatTime = (timeString: string | undefined | null) => {
    if (!timeString) {
      return DateTime.local().toFormat("HH:mm");
    }
    
    const datePart = timeString.substring(0, 14);
    return DateTime.fromFormat(datePart, "yyyyMMddHHmmss", { zone: "UTC" })
      .setZone("Asia/Jakarta").toFormat("HH:mm");
  };

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

  const truncateText = (text: string | undefined, maxLength: number) => {
    if (!text) return "Tidak ada program";
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  return (
    <View>
      <LinearGradient
        colors={["#2b2b2b", "#1e1e1e"]}
        style={styles.programmeContainer}
      >
        <View style={styles.programmeBox}>
          <View style={styles.programmeLeft}>
            <Text style={styles.programmeTitle}>Sedang Tayang</Text>
            <Text style={styles.programmeText}>{truncateText(programmes[0]?.title, 20)}</Text>
            <Text style={styles.programmeTime}>
              {formatTime(programmes[0]?.start)} - {formatTime(programmes[0]?.stop)} WIB
            </Text>
          </View>
          <View style={styles.programmeRight}>
            <Text style={styles.programmeTitle}>Tayangan Berikut</Text>
            <Text style={styles.programmeText}>{truncateText(programmes[1]?.title, 20)}</Text>
            <Text style={styles.programmeTime}>
              {formatTime(programmes[1]?.start)} - {formatTime(programmes[1]?.stop)} WIB
            </Text>
          </View>
        </View>
      </LinearGradient>

      {upcomingProgrammes.length > 0 && (
        <View style={styles.upcomingContainer}>
          <Text style={styles.upcomingTitle}>{channelName}</Text>
          <Animated.View
            style={[styles.scrollContainer, { transform: [{ translateX: scrollAnim }] }]}
          >
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

const styles = StyleSheet.create({
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