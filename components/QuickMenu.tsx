import React from "react";
import { View, FlatList, TouchableOpacity, Image, Text, StyleSheet, Animated } from "react-native";
import { useRouter } from "expo-router";

const quickMenuItems = [
    { name: "Lihat Jadwal", icon: "https://thumbor.prod.vidiocdn.com/EchjgZzDLbXT_by4Xtl3GosFxdE=/168x168/...", link: "schedule" },
    { name: "Daftar Channel", icon: "https://thumbor.prod.vidiocdn.com/nM7ycXrJE1IJrhU3dtEP8R2tzII=/168x168/...", link: "/LiveTv" },
];

const QuickMenu = () => {
    const router = useRouter();
    const scaleValue = new Animated.Value(1);

    const handleMenuPress = (item: { link: string }) => {
        Animated.sequence([
            Animated.timing(scaleValue, { toValue: 0.9, duration: 100, useNativeDriver: true }),
            Animated.timing(scaleValue, { toValue: 1, duration: 100, useNativeDriver: true }),
        ]).start(() => {
            if (item.link === "schedule") {
                router.push("../screens/Schedule"); // Panggil langsung halaman Schedule
            } else {
                router.push(item.link);
            }
        });
    };

    return (
        <View style={styles.quickMenuContainer}>
            <FlatList
                data={quickMenuItems}
                numColumns={4}
                keyExtractor={(item, index) => String(index)}
                renderItem={({ item }) => (
                    <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
                        <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuPress(item)}>
                            <Image source={{ uri: item.icon }} style={styles.menuIcon} />
                            <Text style={styles.menuText}>{item.name}</Text>
                        </TouchableOpacity>
                    </Animated.View>
                )}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    quickMenuContainer: {
        padding: 10,
        backgroundColor: "#222",
    },
    menuItem: {
        alignItems: "center",
        margin: 10,
        width: 80,
    },
    menuIcon: {
        width: 60,
        height: 60,
        borderRadius: 10,
    },
    menuText: {
        color: "#fff",
        fontSize: 12,
        textAlign: "center",
        marginTop: 5,
    },
});

export default QuickMenu;
