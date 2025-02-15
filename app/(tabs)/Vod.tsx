import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { 
  View, Text, FlatList, Image, TouchableOpacity, 
  StyleSheet, ActivityIndicator, Dimensions, Animated, RefreshControl
} from "react-native";
import { useRouter } from "expo-router";
import Colors from "../../constants/Colors";
import useM3uParse from "../../hooks/M3uParse"; 
import tvBanner from "../../assets/images/tv_banner.png"; 

const { width } = Dimensions.get("window");

const Vod = () => {
  const router = useRouter();
  const { channels, loading } = useM3uParse();
  const [refreshing, setRefreshing] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const currentIndexRef = useRef(0);

  const groupKeywords = [
    "movies", "series", "national movies", "general movies",
    "asian movies", "chinese movies", "pinoy movies", 
    "spanish movies", "korean series", "portuguese series",
  ];

  // Gunakan useMemo agar filtering hanya terjadi saat channels berubah
  const vodData = useMemo(() => 
    channels.filter((channel) =>
      groupKeywords.some((keyword) =>
        (channel.group || "").toLowerCase().includes(keyword)
      )
    ), 
    [channels]
  );

  const slideshowData = useMemo(() => 
    [...vodData].sort(() => 0.5 - Math.random()).slice(0, 5), 
    [vodData]
  );

  // Auto-scroll slideshow
  useEffect(() => {
    const interval = setInterval(() => {
      currentIndexRef.current = (currentIndexRef.current + 1) % slideshowData.length;
      Animated.timing(scrollX, {
        toValue: currentIndexRef.current * width,
        duration: 500,
        useNativeDriver: false,
      }).start();
      flatListRef.current?.scrollToOffset({ offset: scrollX._value, animated: true });
    }, 10000);

    return () => clearInterval(interval);
  }, [slideshowData]);

  // Fungsi refresh
  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 2000);
  };

  // Menghindari re-render berlebihan dengan useCallback
  const renderVodItem = useCallback(({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({ pathname: "/PlayerScreen", params: { url: item.url } })}
    >
      <Image 
        source={{ uri: item.logo }}
        defaultSource={tvBanner} 
        style={styles.cardImage} 
      />
      <Text style={styles.cardText}>{truncateName(item.name, 15)}</Text>
    </TouchableOpacity>
  ), []);

  const renderSlideItem = useCallback(({ item }) => (
    <TouchableOpacity 
      style={styles.slideItem} 
      onPress={() => router.push({ pathname: "/PlayerScreen", params: { url: item.url } })}
    >
      <Image 
        source={{ uri: item.logo }}
        defaultSource={tvBanner} 
        style={styles.slideImage}
      />
      <Text style={styles.slideText}>{truncateName(item.name, 20)}</Text>
    </TouchableOpacity>
  ), []);

  const truncateName = (name: string, limit: number) => 
    name.length > limit ? name.slice(0, limit) + "..." : name;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Memuat VOD...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <Text style={styles.title}>🎥 Video On Demand</Text>
      
      {/* 🎥 Slideshow */}
      <View style={styles.carouselContainer}>
        <FlatList
          ref={flatListRef}
          data={slideshowData}
          keyExtractor={(item) => item.tvgId || item.name} 
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          renderItem={renderSlideItem}
        />
      </View>

      {/* 🎬 Grid Card VOD */}
      <FlatList
        data={vodData}
        keyExtractor={(item) => item.tvgId || item.name} 
        numColumns={3} 
        columnWrapperStyle={{ justifyContent: "space-between" }}
        contentContainerStyle={{ padding: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={renderVodItem}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1, justifyContent: "center", alignItems: "center",
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 20, fontSize: 16, fontWeight: "bold", color: Colors.textPrimary,
  },

  /* 🎥 Slideshow */
  carouselContainer: {
    height: 180, alignItems: "center", marginVertical: 10,
  },
  slideItem: {
    width, alignItems: "center", justifyContent: "center",
  },
  slideImage: {
    width: width * 0.9, height: 160, borderRadius: 15,
  },
  slideText: {
    position: "absolute", bottom: 10, left: 10, 
    color: "#fff", fontWeight: "bold", fontSize: 16, 
    backgroundColor: "rgba(79, 12, 235, 0.6)", padding: 5, borderRadius: 5,
  },

  /* 🎬 Card Grid */
  card: {
    backgroundColor: "#333", borderRadius: 12, marginBottom: 10,
    justifyContent: "center", alignItems: "center", 
    width: "32%", padding: 8,
    shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 5,
    elevation: 5,
  },
  cardImage: {
    width: "100%", height: 120, borderRadius: 12,
  },
  cardText: {
    marginTop: 5, color: "#fff", fontSize: 12, fontWeight: "bold", textAlign: "center",
  },

  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
    marginTop: 30,
    padding: 5,
    textAlign: "center",
  },
});

export default Vod;
