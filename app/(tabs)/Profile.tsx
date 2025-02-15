import React, { useState, useEffect, useCallback } from "react";
import { 
    View, Text, Image, TouchableOpacity, 
    StyleSheet, FlatList, ScrollView
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons"; 
import { useFocusEffect } from "@react-navigation/native";
import { watchHistoryEvent } from "./PlayerScreen";
import { Ionicons } from "@expo/vector-icons"; // Ikon TV

const Profile = () => {
    const [avatarError, setAvatarError] = useState(false);
    const [watchHistory, setWatchHistory] = useState<{ name: string; timestamp: string }[]>([]);

    const user = {
        name: "Chesko",
        username: "chesko",
        bio: "💻 Programmer | 📡 Teknisi WiFi | 🎮 Gamer",
        posts: 152,
        followers: 12.4,
        following: 567,
        avatar: "https://source.unsplash.com/200x200/?person",
    };

    const loadWatchHistory = async () => {
        try {
            const storedHistory = await AsyncStorage.getItem("watchHistory");
            if (storedHistory) {
                const historyArray = JSON.parse(storedHistory);
                setWatchHistory(historyArray.slice(0, 20)); // Batasi hanya 20 item terbaru
            }
        } catch (error) {
            console.error("Gagal mengambil riwayat tontonan:", error);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadWatchHistory();
            const subscription = watchHistoryEvent.addListener("historyUpdated", loadWatchHistory);
            return () => {
                subscription.remove();
            };
        }, [])
    );

    return (
        <ScrollView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity>
                    <Feather name="menu" size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity>
                    <Feather name="settings" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Profile Info */}
            <View style={styles.profileSection}>
                <View style={styles.avatarContainer}>
                    <Image 
                        source={avatarError ? require("../../assets/images/ic_launcher.png") : { uri: user.avatar }}
                        style={styles.avatar}
                        onError={() => setAvatarError(true)}
                    />
                </View>
                <Text style={styles.username}>{user.username}</Text>
            </View>

            {/* Stats */}
            <View style={styles.statsContainer}>
                <View style={styles.statBox}>
                    <Text style={styles.statNumber}>{user.posts}</Text>
                    <Text style={styles.statLabel}>Posts</Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={styles.statNumber}>{user.followers}k</Text>
                    <Text style={styles.statLabel}>Followers</Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={styles.statNumber}>{user.following}</Text>
                    <Text style={styles.statLabel}>Following</Text>
                </View>
            </View>

            {/* Bio */}
            <View style={styles.bioContainer}>
                <Text style={styles.bio}>{user.bio}</Text>
            </View>

            {/* Edit Profile Button */}
            <TouchableOpacity style={styles.editProfileButton}>
                <Text style={styles.editProfileText}>Edit Profile</Text>
            </TouchableOpacity>

            {/* 🔹 Riwayat Tontonan */}
            <View style={styles.historyContainer}>
                <Text style={styles.historyTitle}>📺 Riwayat Tontonan</Text>
                {watchHistory.length > 0 ? (
                    <FlatList
                        data={watchHistory}
                        keyExtractor={(item, index) => index.toString()}
                        renderItem={({ item }) => (
                            <View style={styles.historyItem}>
                                <Ionicons name="tv-outline" size={24} color="#FFD700" style={styles.tvIcon} />
                                <View style={styles.historyTextContainer}>
                                    <Text style={styles.historyText}>{item.name}</Text>
                                    <Text style={styles.historyTimestamp}>{item.timestamp}</Text>
                                </View>
                            </View>
                        )}
                        ItemSeparatorComponent={() => <View style={styles.separator} />}
                        scrollEnabled={false} // Agar FlatList mengikuti ScrollView
                    />
                ) : (
                    <Text style={styles.noHistoryText}>Belum ada riwayat tontonan.</Text>
                )}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#000",
        padding: 15,
    },

    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 15,
    },

    profileSection: {
        alignItems: "center",
        marginBottom: 10, 
    },

    avatarContainer: {
        alignItems: "center",
        justifyContent: "center",
    },

    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: "#222",
    },

    username: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#fff",
        marginTop: 8, 
    },

    statsContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 10,
        paddingHorizontal: 40,
    },

    statBox: {
        alignItems: "center",
    },

    statNumber: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#fff",
    },

    statLabel: {
        fontSize: 14,
        color: "#aaa",
    },

    bioContainer: {
        marginTop: 15,
        alignItems: "center", 
    },

    bio: {
        fontSize: 14,
        color: "#aaa",
        marginTop: 5,
        textAlign: "center",
    },

    editProfileButton: {
        backgroundColor: "#333",
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 15,
    },

    editProfileText: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#fff",
    },

    /** Riwayat Tontonan **/
    historyContainer: {
        marginTop: 20,
        paddingHorizontal: 10,
    },

    historyTitle: {
        color: "#e3c800",
        fontSize: 16,
        fontWeight: "bold",
        marginBottom: 10,
    },

    historyItem: {
        flexDirection: "row",
        backgroundColor: "#222",
        padding: 12,
        borderRadius: 10,
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 5,
    },

    tvIcon: {
        marginRight: 10,
    },

    historyTextContainer: {
        flex: 1,
    },

    historyText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "bold",
    },

    historyTimestamp: {
        color: "#aaa",
        fontSize: 12,
        marginTop: 3,
    },

    separator: {
        height: 10,
    },

    noHistoryText: {
        color: "#777",
        fontSize: 14,
        textAlign: "center",
        marginTop: 5,
    },
});

export default Profile;
