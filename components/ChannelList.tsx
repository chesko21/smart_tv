import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  useWindowDimensions,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from 'expo-blur';

interface Channel {
  name: string;
  url: string;
  logo: string | null;
  group?: string;
}

interface ChannelListProps {
  channels: Channel[];
  currentChannelUrl: string;
}

const ChannelLogo = React.memo(({ logo, channelName }: { logo: string | null, channelName: string }) => {
  const [hasError, setHasError] = useState(false);
  const defaultImage = require("../assets/images/maskable.png");

  return (
    <Image
      source={hasError || !logo ? defaultImage : { uri: logo }}
      style={styles.channelLogo}
      defaultSource={defaultImage}
      onError={() => setHasError(true)}
      accessibilityLabel={`${channelName} logo`}
    />
  );
});

const ChannelItem = React.memo(({ 
  item, 
  cardWidth, 
  currentChannelUrl,
  onPress
}: { 
  item: Channel;
  cardWidth: number;
  currentChannelUrl: string;
  onPress: (url: string) => void;
}) => (
  <TouchableOpacity
    style={[styles.channelCard, { width: cardWidth }]}
    onPress={() => onPress(item.url)}
    activeOpacity={0.7}
  >
    <LinearGradient
      colors={item.url === currentChannelUrl ? 
        ['rgba(82, 109, 255, 0.15)', 'rgba(82, 109, 255, 0.05)'] : 
        ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
      style={styles.cardGradient}
    >
      <BlurView intensity={20} style={styles.blurContainer}>
        <View style={styles.imageContainer}>
          <ChannelLogo logo={item.logo} channelName={item.name} />
          {item.url === currentChannelUrl && (
            <View style={styles.activeOverlay}>
              <View style={styles.playingDot} />
            </View>
          )}
        </View>
        <Text style={styles.channelName} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.groupName} numberOfLines={1}>
          {item.group || 'TV Channel'}
        </Text>
      </BlurView>
    </LinearGradient>
  </TouchableOpacity>
));

const ChannelList: React.FC<ChannelListProps> = ({
  channels,
  currentChannelUrl,
}) => {
  const { width } = useWindowDimensions();
  const navigation = useNavigation();
  const [recommendedChannels, setRecommendedChannels] = useState<Channel[]>([]);

  useEffect(() => {
    const currentChannel = channels.find(
      (channel) => channel.url === currentChannelUrl
    );

    const currentGroup = currentChannel?.group ? currentChannel.group : "Tidak diketahui";

    let filteredChannels = channels.filter(
      (channel) =>
        channel.group &&
        channel.group.trim().toLowerCase() === currentGroup.trim().toLowerCase() &&
        channel.url !== currentChannelUrl
    );

    if (filteredChannels.length === 0) {
      filteredChannels = channels.filter(
        (channel) => channel.url !== currentChannelUrl
      );
    }

    setRecommendedChannels(filteredChannels.slice(0, 10));
  }, [currentChannelUrl, channels]);

  const handleChannelChange = useCallback(
    (channelUrl: string) => {
      navigation.navigate("PlayerScreen", { url: channelUrl });
    },
    [navigation]
  );

  const cardWidth = width <= 360 ? 120 : width <= 480 ? 140 : 160;

  const renderItem = useCallback(({ item }: { item: Channel }) => (
    <ChannelItem
      item={item}
      cardWidth={cardWidth}
      currentChannelUrl={currentChannelUrl}
      onPress={handleChannelChange}
    />
  ), [cardWidth, currentChannelUrl, handleChannelChange]);

  return (
    <View style={styles.recommendationContainer}>
      <Text style={styles.recommendationTitle}>
        {recommendedChannels.length > 0 ? recommendedChannels[0].group : "Tidak diketahui"}
      </Text>

      {recommendedChannels.length > 0 ? (
        <FlatList
          horizontal
          data={recommendedChannels}
          keyExtractor={(item) => item.url}
          renderItem={renderItem}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
        />
      ) : (
        <Text style={styles.noRecommendationText}>Tidak ada rekomendasi.</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  recommendationContainer: {
    marginTop: 10,
    paddingHorizontal: 10,
  },
  recommendationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginVertical: 16,
    marginHorizontal: 12,
  },
  channelCard: {
    margin: 8,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  cardGradient: {
    height: 180,
    padding: 4,
    borderRadius: 16,
  },
  blurContainer: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 4,
  },
  imageContainer: {
    position: 'relative',
    padding: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 50,
    marginBottom: 12,
  },
  channelLogo: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#2a2a2a',
    resizeMode: 'contain',
  },
  activeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 50,
    backgroundColor: 'rgba(82, 109, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#526DFF',
    shadowColor: '#526DFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  channelName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  groupName: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    textAlign: 'center',
  },
  channelText: {
    color: "#fff",
    fontSize: 14,
    textAlign: "center",
    fontWeight: "500",
    paddingHorizontal: 5,
  },
  noRecommendationText: {
    color: "#ccc",
    textAlign: "center",
    paddingVertical: 10,
  },
  contentContainer: {
    paddingRight: 10,
  },
  activeIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },

});

export default ChannelList;
