import React, { useState } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";

import defaultLogo from "../assets/images/tv_banner.png";

export interface ChannelProps {
  channel: {
    name: string;
    url: string;
    logo?: string;
  };
  onPress: () => void;
}

const truncateName = (name: string, limit: number) => {
  return name.length > limit ? `${name.substring(0, limit)}...` : name;
};

const LiveTVCard: React.FC<ChannelProps> = ({ channel, onPress }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <TouchableOpacity
      style={styles.cardContainer}
      onPress={onPress}
      activeOpacity={0.8}
      accessible={true}
      accessibilityLabel={`Go to ${channel.name} channel`}
    >
      <View style={styles.imageContainer}>
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#edec25" />
          </View>
        )}
        <Image
          source={channel.logo && !hasError ? { uri: channel.logo } : defaultLogo}
          defaultSource={defaultLogo}
          style={[styles.image, isLoading && styles.hiddenImage]}
          resizeMode="cover"
          onLoadStart={() => setIsLoading(true)}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setHasError(true);
            setIsLoading(false);
          }}
        />
      </View>
      <Text style={styles.text} numberOfLines={1}>
        {truncateName(channel.name, 20)}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    width: "30%", 
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#333",
    borderRadius: 10,
    padding: 10,
    margin: 6, 
    borderWidth: 1,
    borderColor: "#edec25",
    alignSelf: "flex-start", 
  },
  imageContainer: {
    width: "80%", 
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    marginBottom: 6,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#edec25",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  text: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    paddingHorizontal: 5,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333',
    zIndex: 1,
  },
  hiddenImage: {
    opacity: 0,
  },
});

export default LiveTVCard;
