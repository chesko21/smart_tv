import React, { useEffect, useState, useRef } from "react";
import { 
  View, Text, FlatList, Image, TouchableOpacity, 
  StyleSheet, ActivityIndicator, Dimensions
} from "react-native";
import { useRouter } from "expo-router";
import Colors from "../../constants/Colors";
import useM3uParse from "../../hooks/M3uParse"; 
import tvBanner from "../../assets/images/tv_banner.png"; 

const { width } = Dimensions.get("window");

const Vod = () => {
  const router = useRouter();
  const { channels, loading } = useM3uParse();
  const [vodData, setVodData] = useState<any[]>([]);
  const [slideshowData, setSlideshowData] = useState<any[]>([]);
  const [errorLogos, setErrorLogos] = useState<{ [key: string]: boolean }>({});
  const flatListRef = useRef<FlatList>(null);
  let currentIndex = 0;

  const groupKeywords = [
    "movies", "series", "national movies", "general movies",
    "asian movies", "chinese movies", "pinoy movies", 
    "spanish movies", "korean series", "portuguese series",
  ];

  useEffect(() => {
    if (channels) {
      const filteredVOD = channels.filter((channel) =>
        groupKeywords.some((keyword) =>
          (channel.group || "").toLowerCase().includes(keyword)
        )
      );

      setVodData(filteredVOD);

      const shuffled = [...filteredVOD].sort(() => 0.5 - Math.random()).slice(0, 5);
      setSlideshowData(shuffled);
    }
  }, [channels]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (slideshowData.length > 0) {
        currentIndex = (currentIndex + 1) % slideshowData.length;
        flatListRef.current?.scrollToIndex({ index: currentIndex, animated: true });
      }
    }, 10000); 

    return () => clearInterval(interval);
  }, [slideshowData]);

  const handleImageError = (url: string) => {
    setErrorLogos((prev) => ({ ...prev, [url]: true }));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Memuat VOD...</Text>
      </View>
    );
  }

  const truncateName = (name: string) => name.length > 15 ? name.slice(0, 15) + "..." : name;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <Text style={{ color: "#fff", fontSize: 22, fontWeight: "bold", marginBottom: 10 , marginTop: 30, padding: 5 }}>🎥 Video On Demand</Text>
      
      {/* 🎥 Slideshow */}
      <View style={styles.carouselContainer}>
        <FlatList
          ref={flatListRef}
          data={slideshowData}
          keyExtractor={(item) => item.tvgId || item.name} 
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
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
              <Text style={styles.slideText}>{truncateName(item.name)}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* 🎬 Grid Card VOD */}
      <FlatList
        data={vodData}
        keyExtractor={(item) => item.tvgId || item.name} 
        numColumns={3} 
        columnWrapperStyle={{ justifyContent: "space-between" }}
        contentContainerStyle={{ padding: 10 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push({ pathname: "/PlayerScreen", params: { url: item.url } })}
          >
            <Image 
              source={errorLogos[item.url] ? tvBanner : { uri: item.logo }} 
              style={styles.cardImage} 
              onError={() => handleImageError(item.url)}
            />
            <Text style={styles.cardText}>{truncateName(item.name)}</Text>
          </TouchableOpacity>
        )}
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
});

export default Vod;
