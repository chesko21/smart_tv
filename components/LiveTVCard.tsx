import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";


const defaultLogo = require("../assets/images/tv_banner.png");

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
  return (
    <TouchableOpacity
      style={styles.cardContainer}
      onPress={onPress}
      activeOpacity={0.8}
      accessible={true}
      accessibilityLabel={`Go to ${channel.name} channel`}
    >
      <View style={styles.imageContainer}>
        <Image
          source={channel.logo ? { uri: channel.logo } : defaultLogo}
          style={styles.image}
          resizeMode="cover"
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
});

export default LiveTVCard;
