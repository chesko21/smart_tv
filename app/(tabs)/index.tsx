import { useState, useEffect, useRef } from "react";
import {
  View, Text, ScrollView, Image, TouchableOpacity,
  FlatList, ActivityIndicator, Animated, Dimensions
} from "react-native";
import { useRouter } from "expo-router";
import Colors from "../../constants/Colors";
import useM3uParse from "../../hooks/M3uParse";
import tvBanner from "../../assets/images/tv_banner.png";

const { width } = Dimensions.get("window");

const getRandomChannels = (channels: any, num = 10) => {
  const shuffled = [...channels].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, num);
};

export default function Home() {
  const router = useRouter();
  const { channels, loading, error } = useM3uParse();
  const [radioData, setRadioData] = useState<any[]>([]);
  const [slideshowData, setSlideshowData] = useState<any[]>([]);
  const [errorLogos, setErrorLogos] = useState<{ [key: string]: boolean }>({});
  const flatListRef = useRef<FlatList>(null);
  const currentIndexRef = useRef(0);

  const radioKeywords = ["radio", "radio indonesia", "pinoy radio", "malay radio", "rri radio"];
  const sportsKeywords = ["sport", "sports", "olahraga"];

  useEffect(() => {
    if (channels.length > 0) {
      const filteredSports = channels.filter((channel) =>
        sportsKeywords.some((keyword) => channel.group?.toLowerCase().includes(keyword))
      );
      setSlideshowData(getRandomChannels(filteredSports, 5));

      const filteredRadio = channels.filter((channel) =>
        radioKeywords.some((keyword) => channel.group?.toLowerCase().includes(keyword))
      );
      setRadioData(filteredRadio);
    }
  }, [channels]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (slideshowData.length > 0) {
        currentIndexRef.current = (currentIndexRef.current + 1) % slideshowData.length;
        flatListRef.current?.scrollToIndex({ index: currentIndexRef.current, animated: true });
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [slideshowData]);

  const handleImageError = (url: string) => {
    setErrorLogos((prev) => ({ ...prev, [url]: true }));
  };

  if (loading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={{ color: "#fff" }}>Error loading channels. Please try again later.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, backgroundColor: Colors.background }}>
      <Text style={styles.header}>Smart TV Streaming</Text>
      <Image source={tvBanner} style={styles.banner} resizeMode="cover" />

      <View style={styles.navContainer}>
        <TouchableOpacity style={styles.navButton} onPress={() => router.push("/LiveTv")}>
          <Text style={styles.navText}>📺 Live TV</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={() => router.push("/Vod")}>
          <Text style={styles.navText}>🎥 VOD</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={slideshowData}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.tvgId || item.name}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.slideItem}
            onPress={() => router.push({ pathname: "/PlayerScreen", params: { url: item.url } })}
          >
            <Image
              source={errorLogos[item.url] ? tvBanner : { uri: item.logo }}
              style={styles.slideImage}
              onError={() => handleImageError(item.url)}
            />
            <Text style={styles.slideText}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />

      <Text style={styles.sectionTitle}>🔥 REKOMENDASI UNTUK ANDA</Text>
      <FlatList
        data={getRandomChannels(channels)}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.url}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => router.push({ pathname: "/PlayerScreen", params: { url: item.url } })}>
            <Image
              source={errorLogos[item.url] ? tvBanner : { uri: item.logo }}
              style={styles.cardImage}
              resizeMode="cover"
              onError={() => handleImageError(item.url)}
            />
            <Text style={styles.cardText}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />

      <Text style={styles.sectionTitle}>🎶 RADIO PLAYER</Text>
      <FlatList
        data={radioData}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.url}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => router.push({ pathname: "/PlayerScreen", params: { url: item.url } })}>
            <Image
              source={errorLogos[item.url] ? tvBanner : { uri: item.logo }}
              style={styles.cardImage}
              resizeMode="cover"
              onError={() => handleImageError(item.url)}
            />
            <Text style={styles.cardText}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />
    </ScrollView>
  );
}

const styles = {
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },
  header: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 10,
    marginTop: 20,
    color: "#fff",
  },
  banner: {
    width: "100%",
    height: 160,
    borderRadius: 10,
  },
  navContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 20,
  },
  navButton: {
    backgroundColor: Colors.primary,
    padding: 15,
    borderRadius: 10,
    flex: 1,
    marginHorizontal: 5,
    alignItems: "center",
  },
  navText: {
    color: "#fff",
    fontWeight: "700",
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
  },
  card: {
    marginRight: 10,
    width: 150,
    marginBottom: 20,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#333",
    alignItems: "center",
  },
  cardImage: {
    width: 100,
    height: 100,
    borderRadius: 20,
    margin: 5,
    borderWidth: 2,
    borderColor: "#000",
  },
  cardText: {
    padding: 5,
    textAlign: "center",
    fontWeight: "700",
    color: "#fff",
  },
  slideItem: {
    width,
    alignItems: "center",
    justifyContent: "center",
    padding: 5,
    margin: 5,
  },
  slideImage: {
    width: width * 0.9,
    height: 130,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: "rgba(79, 12, 235, 0.6)",
  },
  slideText: {
    position: "absolute",
    bottom: 10,
    left: 10,
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    backgroundColor: "rgba(79, 12, 235, 0.6)",
    padding: 5,
    borderRadius: 5,
  },
};
