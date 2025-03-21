import React, { useState, useEffect, useRef, useMemo } from "react";
import { View, Text, ScrollView, Image, TouchableOpacity, FlatList, Animated, Dimensions, RefreshControl, StyleSheet } from "react-native";
import { useNavigation } from '@react-navigation/native';
import Colors from "../../constants/Colors";
import useM3uParse from "../../hooks/M3uParse";
import tvBanner from "../../assets/images/tv_banner.png";

const { width, height } = Dimensions.get("window");

const getRandomChannels = (channels: any, num = 10) => {
  const shuffled = [...channels].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, num);
};

export default function Home() {
  const { channels, loading, refetch } = useM3uParse();
  const [isLoading, setIsLoading] = useState(true);
  const [errorImages, setErrorImages] = useState<{ [key: string]: boolean }>({});
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const fadeInAnim = useRef(new Animated.Value(0)).current;
  const [slideshowData, setSlideshowData] = useState<any[]>([]);
  const [activeSlide, setActiveSlide] = useState(0);

  const [limitedSports, setLimitedSports] = useState<any[]>([]);
  const [limitedRadio, setLimitedRadio] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (refetch) {
        await refetch();
      }

      if (filteredSports.length > 0) {
        setLimitedSports(getRandomChannels(filteredSports, 20));
        setSlideshowData(filteredSports);
      } else {
        setLimitedSports([]);
        setSlideshowData([]);
      }
      if (filteredRadio.length > 0) {
        setLimitedRadio(getRandomChannels(filteredRadio, 20));
      } else {
        setLimitedRadio([]);
      }
      if (channels && channels.length > 0) {
        setRecommendations(getRandomChannels(channels, 20));
      } else {
        setRecommendations([]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setTimeout(() => setIsLoading(false), 5000);
  }, []);

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

  const filteredSports = useMemo(() => {
    const sportsKeywords = ["sport", "sports", "olahraga", "bola", "liga", "UCL", "league",
      "champions", "cup", "ufc", "timnas", "Volly", "voli", "basket", "pptv", "SPOTV"];
    return channels.filter((channel) =>
      sportsKeywords.some((keyword) => channel.group?.toLowerCase()?.includes(keyword))
    );
  }, [channels]);

  const filteredRadio = useMemo(() => {
    const radioKeywords = ["radio", "radio indonesia", "pinoy radio", "malay radio", "rri radio", "musik", "music"];
    return channels.filter((channel) =>
      radioKeywords.some((keyword) => channel.group?.toLowerCase()?.includes(keyword))
    );
  }, [channels]);

  const filteredVOD = useMemo(() => {
    const vodKeywords = ["movies", "movie", "film", "films", "bioskop", "cinema",
      "sinema", "vod", "video on demand", "box office",
      "action", "adventure", "comedy", "drama", "horror", "thriller",
      "romance", "documentary", "animation", "anime", "fantasy",
      "sci-fi", "mystery", "crime", "family", "musical",
      "series", "tv series", "drama series", "web series",
      "season", "episode", "show", "tv show", "reality show",
      "netflix", "disney", "prime", "hbo", "hulu", "apple tv", "komedi", "lk21", "ftv",
      "hiburan", "hiburan", "entertainment", "entertainment", "tv show", "tv series", "tv series"];
    return channels.filter((channel) =>
      vodKeywords.some((keyword) => channel.group?.toLowerCase()?.includes(keyword))
    );
  }, [channels]);

  useEffect(() => {
    if (filteredSports.length > 0) {
      setLimitedSports(getRandomChannels(filteredSports, 40));
      setSlideshowData(getRandomChannels(filteredSports, 40));
    } else {
      setLimitedSports([]);
      setSlideshowData([]);
    }
    if (filteredRadio.length > 0) {
      setLimitedRadio(getRandomChannels(filteredRadio, 40));
    } else {
      setLimitedRadio([]);
    }
    if (channels && channels.length > 0) {
      setRecommendations(getRandomChannels(channels, 40));
    }
  }, [filteredSports, filteredRadio, channels]);

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

  const renderSlideshowItem = ({ item }: { item: { url: string; logo?: string; name: string } }) => (
    <TouchableOpacity
      style={styles.slide}
      onPress={() => navigation.navigate('PlayerScreen', { url: item.url })}
    >
      <Image
        source={item.logo ? { uri: item.logo } : tvBanner}
        style={styles.slideImage}
        onError={() => handleImageError(item.url)}
        defaultSource={tvBanner}
      />
      <Text style={styles.slideText}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderSkeletonSlideshowItem = () => (
    <Animated.View style={[styles.skeletonSlide, { opacity: shimmerAnim }]} />
  );

  const handleSlideChange = (event: any) => {
    const slideWidth = width - 32;
    const offset = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offset / slideWidth);
    setActiveSlide(newIndex);
  };

  const truncate = (str: string, maxLength: number) => {
    if (str.length > maxLength) {
      return str.slice(0, maxLength) + "...";
    }
    return str;
  };

  const containerStyle = {
    ...styles.container,
    minHeight: height,
  };

  if (loading || isLoading || !channels) {
    return (
      <ScrollView contentContainerStyle={containerStyle}>
        <Text style={styles.header}>Smart TV Streaming</Text>
        <Animated.View style={[styles.skeletonBanner, { opacity: shimmerAnim }]} />
        <View style={styles.navContainer}>
          <Animated.View style={[styles.skeletonNavButton, { opacity: shimmerAnim }]} />
          <Animated.View style={[styles.skeletonNavButton, { opacity: shimmerAnim }]} />
        </View>

        <Text style={styles.sectionTitle}>Sport</Text>
        <FlatList
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, index) => `skeleton-slide-${index}`}
          renderItem={renderSkeletonSlideshowItem}
          data={Array(3).fill(null)}
        />

        <Text style={styles.sectionTitle}>Rekomendasi Untuk Anda</Text>
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

        <Text style={styles.sectionTitle}>Radio Player</Text>
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
    <Animated.ScrollView
      contentContainerStyle={containerStyle}
      style={{ opacity: fadeInAnim }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.header}>Smart TV Streaming</Text>
      <Image source={tvBanner} style={styles.banner} resizeMode="cover" />

      <View style={styles.navContainer}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate("LiveTvScreen")}
        >
          <Text style={styles.navtext}>Watch Live TV</Text>
          <Text style={styles.channelCount}>
            {channels?.length || 0} Channels
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate("VodScreen")}
        >
          <Text style={styles.navtext}>Watch VOD</Text>
          <Text style={styles.channelCount}>
            {filteredVOD?.length || 0} Movies
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Sport</Text>
      <FlatList
        data={slideshowData.slice(0, 5)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item, index) => `${item.url || item.tvgId || item.name}-${index}`}
        renderItem={renderSlideshowItem}
        onMomentumScrollEnd={handleSlideChange}
        style={styles.slideshowContainer}
      />
      <View style={styles.dotContainer}>
        {slideshowData.slice(0, 5).map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index === activeSlide ? styles.activeDot : styles.inactiveDot,
            ]}
          />
        ))}
      </View>

      <Text style={styles.sectionTitle}>Rekomendasi Untuk Anda</Text>
      <FlatList
        data={recommendations}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item, index) => `${item.url || item.tvgId || item.name}-${index}`}
        renderItem={({ item }) => (
          !item || !item.name ? null : (
            <TouchableOpacity
              style={styles.card}
              onPress={() => {
                navigation.navigate('PlayerScreen', { url: item.url });
              }}
            >
              <Image
                source={item.logo ? { uri: item.logo } : tvBanner}
                style={styles.cardImage}
                onError={() => handleImageError(item.url)}
                defaultSource={tvBanner}
              />
              <Text style={styles.cardText}>{truncate(item.name, 10)}</Text>
            </TouchableOpacity>
          )
        )}
      />

      <Text style={styles.sectionTitle}>Radio Player</Text>
      <FlatList
        data={limitedRadio}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.url}
        renderItem={({ item }) => (
          !item || !item.name ? null : (
            <TouchableOpacity
              style={styles.card}
              onPress={() => {
                navigation.navigate('PlayerScreen', { url: item.url });
              }}
            >
              <Image
                source={item.logo ? { uri: item.logo } : tvBanner}
                style={styles.cardImage}
                onError={() => handleImageError(item.url)}
                defaultSource={tvBanner}
              />
              <Text style={styles.cardText}>{truncate(item.name, 10)}</Text>
            </TouchableOpacity>
          )
        )}
      />
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: Colors.background,
  },
  header: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 20,
    color: '#fff',
  },
  banner: {
    width: '100%',
    height: 160,
    borderRadius: 10,
    marginBottom: 20,
  },
  skeletonBanner: {
    width: '100%',
    height: 160,
    borderRadius: 10,
    backgroundColor: '#555',
    marginBottom: 20,
  },
  navContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 20,
  },
  navButton: {
    backgroundColor: Colors.primary,
    padding: 15,
    borderRadius: 10,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center'
  },
  navtext: {
    fontSize: 18,
    fontWeight: '700',
  },
  skeletonNavButton: {
    backgroundColor: '#555',
    padding: 15,
    borderRadius: 10,
    flex: 1,
    marginHorizontal: 5,
    height: 50,
    opacity: .7
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
  },
  skeletonSlide: {
    width: (width - 32),
    height: (180),
    borderRadius: (10),
    backgroundColor: '#555',
    marginRight: (16),
    marginBottom: (20),
  },
  skeletonCardContainer: {
    alignItems: 'center',
    marginRight: (15),
    marginBottom: (15),
  },
  skeletonText: {
    width: (80),
    height: (12),
    backgroundColor: '#555',
    borderRadius: (5),
    marginTop: (8),
  },
  card: {
    backgroundColor: '#222',
    padding: (10),
    borderRadius: (10),
    marginRight: (15),
    width: (120),
    alignItems: 'center',
    marginBottom: (20),
  },
  skeletonCard: {
    backgroundColor: '#555',
    width: (120),
    height: (100),
    borderRadius: (10),
    marginRight: (15),
    marginBottom: (15),
  },
  cardImage: {
    width: (110),
    height: (90),
    borderRadius: (10),
    marginBottom: (5),
  },
  cardText: {
    color: '#fff',
    fontSize: (13),
    textAlign: 'center',
  },
  slideshowContainer: {
    marginVertical: (10),
  },
  slide: {
    width: (width - 32),
    height: (180),
    borderRadius: (10),
    overflow: 'hidden',
    marginRight: (16),
    backgroundColor: '#333',
  },
  slideImage: {
    width: '100%',
    height: (120),
    resizeMode: 'cover',
  },
  slideText: {
    color: '#fff',
    fontSize: (16),
    fontWeight: 'bold',
    marginTop: (8),
    paddingHorizontal: (8),
  },
  dotContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: (10),
    height: (10),
    borderRadius: (10 / 2),
    backgroundColor: '#ccc',
    marginHorizontal: (5),
  },
  inactiveDot: {
    backgroundColor: '#888',
  },
  activeDot: {
    width: (15),
    borderRadius: (15 / 2),
    backgroundColor: '#0220b8',
  }
});