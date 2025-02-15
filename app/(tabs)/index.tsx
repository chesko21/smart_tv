import { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  FlatList,
  Animated,
  Dimensions,
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
  const { channels, loading } = useM3uParse();
  const [isLoading, setIsLoading] = useState(true);
  const [errorImages, setErrorImages] = useState<{ [key: string]: boolean }>({});

  // Skeleton animation setup
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const fadeInAnim = useRef(new Animated.Value(0)).current;

  // Slideshow data and radio data
  const [slideshowData, setSlideshowData] = useState<any[]>([]);
  const [radioData, setRadioData] = useState<any[]>([]);

  useEffect(() => {
    setTimeout(() => setIsLoading(false), 5000);
  }, []);

  // Set up shimmer animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([ 
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Filter channels for sports and radio
  const filteredSports = useMemo(() => {
    const sportsKeywords = ["sport", "sports", "olahraga", "bola"];
    return channels.filter((channel) =>
      sportsKeywords.some((keyword) => channel.group?.toLowerCase()?.includes(keyword))
    );
  }, [channels]);

  const filteredRadio = useMemo(() => {
    const radioKeywords = ["radio", "radio indonesia", "pinoy radio", "malay radio", "rri radio"];
    return channels.filter((channel) =>
      radioKeywords.some((keyword) => channel.group?.toLowerCase()?.includes(keyword))
    );
  }, [channels]);

  useEffect(() => {
    if (filteredSports.length > 0) {
      setSlideshowData(filteredSports);
    }
    if (filteredRadio.length > 0) {
      setRadioData(filteredRadio);
    }
  }, [filteredSports, filteredRadio]);

  // Fade-in animation after loading
  useEffect(() => {
    if (!isLoading) {
      Animated.timing(fadeInAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }
  }, [isLoading]);

  const handleImageError = (url: string) => {
    setErrorImages((prev) => ({ ...prev, [url]: true }));
  };

  if (loading || isLoading) {
    // Return skeleton loading view
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.header}>Smart TV Streaming</Text>

        <Animated.View style={[styles.skeletonBanner, { opacity: shimmerAnim }]} />
        
        {/* Navigation Buttons Skeleton */}
        <View style={styles.navContainer}>
          <Animated.View style={[styles.skeletonNavButton, { opacity: shimmerAnim }]} />
          <Animated.View style={[styles.skeletonNavButton, { opacity: shimmerAnim }]} />
        </View>

        {/* Slideshow Skeleton */}
        <FlatList
          data={Array(5).fill(null)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, index) => `skeleton-slide-${index}`}
          renderItem={() => <Animated.View style={[styles.skeletonSlide, { opacity: shimmerAnim }]} />}
        />

        {/* Recommended Channels Skeleton */}
        <FlatList
          data={Array(10).fill(null)}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, index) => `skeleton-card-${index}`}
          renderItem={() => (
            <View style={styles.skeletonCardContainer}>
              <Animated.View style={[styles.skeletonCard, { opacity: shimmerAnim }]} />
              <Animated.View style={[styles.skeletonText, { opacity: shimmerAnim }]} />
            </View>
          )}
        />

        {/* Radio Channels Skeleton */}
        <FlatList
          data={Array(5).fill(null)}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, index) => `skeleton-radio-${index}`}
          renderItem={() => (
            <View style={styles.skeletonCardContainer}>
              <Animated.View style={[styles.skeletonCard, { opacity: shimmerAnim }]} />
              <Animated.View style={[styles.skeletonText, { opacity: shimmerAnim }]} />
            </View>
          )}
        />
      </ScrollView>
    );
  }

  return (
    <Animated.ScrollView contentContainerStyle={styles.container} style={{ opacity: fadeInAnim }}>
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

      {/* Slideshow Sports Channels */}
      <Text style={styles.sectionTitle}>⚽ SPORT</Text>

      <FlatList
        data={slideshowData}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item, index) => `${item.tvgId || item.name}-${index}`}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push({ pathname: "/PlayerScreen", params: { url: item.url } })}
          >
            <Image
              source={errorImages[item.url] ? tvBanner : { uri: item.logo }}
              style={styles.cardImage}
              onError={() => handleImageError(item.url)}
            />
            <Text style={styles.cardText}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />

      {/* Recommended Channel */}
      <Text style={styles.sectionTitle}>🔥 REKOMENDASI UNTUK ANDA</Text>
      <FlatList
        data={getRandomChannels(channels)}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item, index) => `${item.url || item.tvgId || item.name}-${index}`}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push({ pathname: "/PlayerScreen", params: { url: item.url } })}
          >
            <Image
              source={errorImages[item.url] ? tvBanner : { uri: item.logo }}
              style={styles.cardImage}
              resizeMode="cover"
              onError={() => handleImageError(item.url)}
            />
            <Text style={styles.cardText}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />

      {/* Radio Channels */}
      <Text style={styles.sectionTitle}>🎶 RADIO PLAYER</Text>
      <FlatList
        data={radioData}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.url}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => router.push({ pathname: "/PlayerScreen", params: { url: item.url } })}>
            <Image
              source={errorImages[item.url] ? tvBanner : { uri: item.logo }}
              style={styles.cardImage}
              resizeMode="cover"
              onError={() => handleImageError(item.url)}
            />
            <Text style={styles.cardText}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />
    </Animated.ScrollView>
  );
}


const styles = {
  container: {
    padding: 16,
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
    marginBottom: 20, 
  },
  skeletonBanner: {
    width: "100%",
    height: 160,
    borderRadius: 10,
    backgroundColor: "#555", 
    marginBottom: 20, 
  },
  navContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 20,
  },
  skeletonNavContainer: {
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
  skeletonNavButton: {
    backgroundColor: "#555",
    padding: 15,
    borderRadius: 10,
    flex: 1,
    marginHorizontal: 5,
    height: 50,
    opacity: 0.7, 
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
  },
  skeletonSlide: {
    width: width - 40,
    height: 150,
    borderRadius: 10,
    backgroundColor: "#555",
    marginRight: 15,
    marginBottom: 20,
  },
  skeletonCardContainer: {
    alignItems: "center",
    marginRight: 15,
    marginBottom: 15,
  },
  skeletonText: {
    width: 80,  
    height: 12,
    backgroundColor: "#555",
    borderRadius: 5,
    marginTop: 8, 
  },
  card: {
    backgroundColor: "#222",
    padding: 10,
    borderRadius: 10,
    marginRight: 15,
    width: 120,
    alignItems: "center",
    marginBottom: 20, 
  },
  skeletonCard: {
    backgroundColor: "#555",
    width: 120,
    height: 100,
    borderRadius: 10,
    marginRight: 15,
    marginBottom: 15, 
  },
  cardImage: {
    width: 110,
    height: 90,
    borderRadius: 10,
    marginBottom: 5,
  },
  cardText: {
    color: "#fff",
    fontSize: 13,
    textAlign: "center",
  },
};
