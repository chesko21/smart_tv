import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  SafeAreaView,
  Dimensions,
  Animated,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import Colors from "../../constants/Colors";
import useM3uParse from "../../hooks/M3uParse";
import tvBanner from "../../assets/images/tv_banner.png";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import LottieView from "lottie-react-native";
import { usePip } from '../../contexts/PipContext';

const { width } = Dimensions.get("window");

interface LoadingState {
  [key: string]: boolean;
}

interface ErrorState {
  [key: string]: boolean;
}

const Vod = () => {
  const { setPipMode } = usePip();
  const router = useRouter();
  const { channels, loading, refetch, error } = useM3uParse();
  const [refreshing, setRefreshing] = useState(false);
  interface Channel {
    tvgId?: string;
    name: string;
    group?: string;
    url: string;
    logo?: string;
  }

  const [vodData, setVodData] = useState<Channel[]>([]);
  const flatListRef = useRef<FlatList>(null);
  type RootStackParamList = {
    PlayerScreen: { url: string };
  };
  
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const scrollX = useRef(new Animated.Value(0)).current;
  const currentIndexRef = useRef(0);
  const [loadingStates, setLoadingStates] = useState<LoadingState>({});
  const [errorStates, setErrorStates] = useState<ErrorState>({});

  const groupKeywords = [
   "movies", "movie", "film", "films", "bioskop", "cinema",
      "sinema", "vod", "video on demand", "box office",
      "action", "adventure", "comedy", "drama", "horror", "thriller",
      "romance", "documentary", "animation", "anime", "fantasy",
      "sci-fi", "mystery", "crime", "family", "musical",
      "series", "tv series", "drama series", "web series",
      "season", "episode", "show", "tv show", "reality show",
      "netflix", "disney", "prime", "hbo", "hulu", "apple tv", "komedi", "lk21", "ftv", 
      "hiburan", "hiburan", "entertainment", "entertainment", "tv show", "tv series", "tv series",
  ].map(keyword => keyword.toLowerCase());

  useEffect(() => {
    if (channels.length > 0) {
        const filteredData = channels.filter(
            (channel) => groupKeywords.some(
                (keyword) => 
                    (channel.group || "").toLowerCase().includes(keyword) || 
                    (channel.name || "").toLowerCase().includes(keyword)
            ) && channel.url
        );
        setVodData(filteredData);
    }
}, [channels]);


  const refresh = async () => {
    setRefreshing(true);
    try {
      await refetch(); 
    } catch (error) {
      console.error("Error refreshing VOD data:", error);
    } finally {
      setRefreshing(false);
    }
  };
  
  useEffect(() => {
    if (error) {
      console.error(error);
    }
  }, [error]);

  const slideshowData = useMemo(
    () => [...vodData].sort(() => 0.5 - Math.random()).slice(0, 10),
    [vodData]
  );

  const handleSwipe = useCallback(({ nativeEvent }: { nativeEvent: any }) => {
    const { contentOffset } = nativeEvent;
    const index = Math.round(contentOffset.x / width);
    currentIndexRef.current = index;
  }, []);
  
  const renderSlideItem = useCallback(
    ({ item }) => {
      const itemKey = `slide-${item.tvgId || item.name}`;
      const isItemLoading = loadingStates[itemKey];
      const hasItemError = errorStates[itemKey];

      return (
        <TouchableOpacity
      style={styles.card}
      onPress={() => {
        setPipMode(false);
        navigation.navigate('PlayerScreen', { url: item.url });
      }}
    >
          <View style={styles.slideImageContainer}>
            {isItemLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#edec25" />
              </View>
            )}
            <Image
              source={item.logo && !hasItemError ? { uri: item.logo } : tvBanner}
              defaultSource={tvBanner}
              style={[styles.slideImage, isItemLoading && styles.hiddenImage]}
              onLoadStart={() => {
                setLoadingStates(prev => ({ ...prev, [itemKey]: true }));
              }}
              onLoad={() => {
                setLoadingStates(prev => ({ ...prev, [itemKey]: false }));
              }}
              onError={() => {
                setErrorStates(prev => ({ ...prev, [itemKey]: true }));
                setLoadingStates(prev => ({ ...prev, [itemKey]: false }));
              }}
            />
          </View>
          <Text style={styles.slideText}>{truncateName(item.name, 20)}</Text>
        </TouchableOpacity>
      );
    },
    [navigation, loadingStates, errorStates]
  );

  const truncateName = (name, limit) => (name.length > limit ? name.slice(0, limit) + "..." : name);

  const onRefresh = useCallback(() => {
    refresh();
  }, []);

  const renderVodItem = useCallback(
    ({ item }) => {
      const itemKey = `${item.tvgId || item.name}`;
      const isItemLoading = loadingStates[itemKey];
      const hasItemError = errorStates[itemKey];

      return (
        <TouchableOpacity
          style={styles.card}
          onPress={() => {
            setPipMode(false); 
            navigation.navigate('PlayerScreen', { url: item.url });
          }}
        >
          <View style={styles.imageContainer}>
            {isItemLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#edec25" />
              </View>
            )}
            <Image
              source={item.logo && !hasItemError ? { uri: item.logo } : tvBanner}
              defaultSource={tvBanner}
              style={[styles.cardImage, isItemLoading && styles.hiddenImage]}
              onLoadStart={() => {
                setLoadingStates(prev => ({ ...prev, [itemKey]: true }));
              }}
              onLoad={() => {
                setLoadingStates(prev => ({ ...prev, [itemKey]: false }));
              }}
              onError={() => {
                setErrorStates(prev => ({ ...prev, [itemKey]: true }));
                setLoadingStates(prev => ({ ...prev, [itemKey]: false }));
              }}
            />
          </View>
          <Text style={styles.cardText}>{truncateName(item.name, 20)}</Text>
        </TouchableOpacity>
      );
    },
    [navigation, loadingStates, errorStates]
  );

  useEffect(() => {
    return () => {
      setLoadingStates({});
      setErrorStates({});
    };
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <LottieView
          source={require("../../assets/animations/loading.json")}
          autoPlay
          loop
          style={styles.loadingAnimation}
        />
        <Text style={styles.loadingText}>Memuat VOD...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error.message}</Text>
        <TouchableOpacity 
          style={styles.reloadButton}
          onPress={refetch}
        >
          <Text style={styles.reloadButtonText}>Reload</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <Text style={styles.title}>Video On Demand</Text>
      
      {slideshowData.length > 0 && (
        <View style={styles.carouselContainer}>
          <FlatList
            ref={flatListRef}
            data={slideshowData}
            keyExtractor={(item, index) => `${item.tvgId || item.name}-${index}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            renderItem={renderSlideItem}
            onMomentumScrollEnd={handleSwipe}
            scrollEventThrottle={16}
            decelerationRate="normal"
            style={styles.slideshowContainer}
          />
        </View>
      )}

      <FlatList
        data={vodData}
        keyExtractor={(item, index) => `${item.tvgId || item.name}-${index}`}
        numColumns={3}
        columnWrapperStyle={{ justifyContent: "space-between" }}
        contentContainerStyle={{ padding: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={renderVodItem}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },
  loadingAnimation: {
    width: 200,
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.text,
  },
  carouselContainer: {
    height: 180,
    alignItems: "center",
    marginVertical: 10,
  },
  slideItem: {
    width,
    alignItems: "center",
    justifyContent: "center",
  },
  slideImage: {
    width: width * 0.9,
    height: 160,
    borderRadius: 15,
  },
  slideText: {
    position: "absolute",
    bottom: 10,
    left: 10,
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    backgroundColor: "rgba(79, 12, 235, 0.6)",
    padding: 5,
    borderRadius: 5,
  },
  card: {
    backgroundColor: "#333",
    borderRadius: 12,
    marginBottom: 10,
    width: "32%",
    padding: 8,
  },
  cardImage: {
    width: "100%",
    height: 120,
    borderRadius: 12,
  },
  cardText: {
    marginTop: 5,
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
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
  imageContainer: {
    width: "100%",
    height: 120,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    backgroundColor: '#333',
  },
  slideImageContainer: {
    width: width * 0.9,
    height: 160,
    borderRadius: 15,
    overflow: "hidden",
    position: "relative",
    backgroundColor: '#333',
  },
  hiddenImage: {
    opacity: 0,
  },
  slideshowContainer: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  reloadButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  reloadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

});

export default Vod;
