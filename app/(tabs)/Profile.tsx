import React, { useState } from "react";
import { 
    View, 
    Text, 
    Image, 
    TouchableOpacity, 
    StyleSheet, 
    Animated
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";


import { Ionicons } from "@expo/vector-icons"; 

const Profile = () => {
    const [scaleValue] = useState(new Animated.Value(1));

    const user = {
        name: "John Doe",
        email: "johndoe@email.com",
        avatar: "https://source.unsplash.com/100x100/?person",
    };

    const handleLogoutPress = () => {
        Animated.sequence([
            Animated.timing(scaleValue, { toValue: 0.9, duration: 100, useNativeDriver: true }),
            Animated.timing(scaleValue, { toValue: 1, duration: 100, useNativeDriver: true }),
        ]).start(() => {
            console.log("Logout sukses!"); // Ganti dengan fungsi logout
        });
    };

    return (
        <LinearGradient colors={["#141E30", "#243B55"]} style={styles.container}>
            {/* Avatar & Info Card */}
            <View style={styles.profileCard}>
                <Image source={{ uri: user.avatar }} style={styles.avatar} />
                <Text style={styles.name}>{user.name}</Text>
                <Text style={styles.email}>{user.email}</Text>

                {/* Tombol Logout */}
                <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogoutPress}>
                        <Ionicons name="log-out-outline" size={24} color="#fff" style={styles.icon} />
                        <Text style={styles.logoutText}>Logout</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    profileCard: {
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        padding: 20,
        borderRadius: 15,
        alignItems: "center",
        width: "90%",
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 5 },
        elevation: 5, // Efek shadow di Android
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        marginBottom: 15,
        borderWidth: 3,
        borderColor: "#fff",
    },
    name: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#fff",
        marginBottom: 5,
    },
    email: {
        fontSize: 16,
        color: "#ddd",
        marginBottom: 20,
    },
    logoutButton: {
        flexDirection: "row",
        backgroundColor: "#ff4d4d",
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
        alignItems: "center",
    },
    logoutText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
        marginLeft: 10,
    },
    icon: {
        color: "#fff",
    },
});

export default Profile;
