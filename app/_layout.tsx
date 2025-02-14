import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Platform, SafeAreaView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as NavigationBar from "expo-navigation-bar";
import NetInfo from "@react-native-community/netinfo";

export default function Layout() {
    const [isOnline, setIsOnline] = useState(true);
    const [showBackOnline, setShowBackOnline] = useState(false);

    useEffect(() => {
        NetInfo.fetch().then((state) => setIsOnline(state.isInternetReachable ?? true));
        const unsubscribe = NetInfo.addEventListener((state) => {
            if (!isOnline && state.isInternetReachable) {
                setShowBackOnline(true);
                setTimeout(() => setShowBackOnline(false), 3000);
            }
            setIsOnline(state.isInternetReachable ?? true);
        });

        return () => unsubscribe();
    }, [isOnline]);

    useEffect(() => {
        if (Platform.OS === "android") {
            const hideNavigationBar = async () => {
                await NavigationBar.setVisibilityAsync("hidden");
                await NavigationBar.setBehaviorAsync("overlay-swipe");
            };

            hideNavigationBar();

            const interval = setInterval(() => {
                hideNavigationBar();
            }, 3000);

            return () => {
                clearInterval(interval);
                NavigationBar.setVisibilityAsync("visible");
            };
        }
    }, []);

    return (
        <>
            <StatusBar style="dark" hidden={true} />
            <SafeAreaView style={{ flex: 1 }}>
                {/* Banner Status Internet */}
                <View>
                    {!isOnline && (
                        <View style={[styles.banner, { backgroundColor: "red" }]}>
                            <Ionicons name="cloud-offline" size={20} color="white" style={styles.icon} />
                            <Text style={styles.text}>No Internet Connection</Text>
                        </View>
                    )}
                    {showBackOnline && (
                        <View style={[styles.banner, { backgroundColor: "green" }]}>
                            <Ionicons name="cloud-done" size={20} color="white" style={styles.icon} />
                            <Text style={styles.text}>Back Online</Text>
                        </View>
                    )}
                </View>

                {/* Navigasi Stack */}
                <Stack>
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen name="schedule" options={{ headerShown: true, title: "Jadwal TV" }} />
                </Stack>
            </SafeAreaView>
        </>
    );
}

const styles = StyleSheet.create({
    banner: {
        padding: 10,
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "center",
        width: "100%",
    },
    icon: {
        marginRight: 5,
    },
    text: {
        color: "white",
        fontWeight: "bold",
    },
});
