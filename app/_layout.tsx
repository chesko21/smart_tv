import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, SafeAreaView, Platform } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import * as NavigationBar from "expo-navigation-bar";
import * as ScreenOrientation from "expo-screen-orientation";
import LottieView from "lottie-react-native";
import loadingAnimation from "../assets/animations/loading.json";
import DrawerNavigator from "./(tabs)/DrawerNavigator";
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function Layout() {
    const [isOnline, setIsOnline] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [showBackOnline, setShowBackOnline] = useState(false);

    useEffect(() => {
        const simulateLoading = async () => {
            await new Promise(resolve => setTimeout(resolve, 3000));
            setIsLoading(false);
        };
        simulateLoading();

        const unsubscribe = NetInfo.addEventListener((state) => {
            const isReachable = state.isInternetReachable ?? state.isConnected ?? false;
            if (!isOnline && isReachable) {
                setShowBackOnline(true);
                setTimeout(() => setShowBackOnline(false), 5000);
            }
            setIsOnline(isReachable);
        });

        return () => unsubscribe();
    }, [isOnline]);

    useEffect(() => {
        (async () => {
            await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
        })();

        return () => {
            ScreenOrientation.unlockAsync();
        };
    }, []);

    useEffect(() => {
        if (Platform.OS === "android") {
            const setupAndroid = async () => {
                await NavigationBar.setVisibilityAsync("hidden");
                await NavigationBar.setBehaviorAsync("overlay-swipe");
            };
            setupAndroid();

            return () => {
                NavigationBar.setVisibilityAsync("visible");
            };
        }
    }, []);

    return (
        <SafeAreaProvider>
            <View style={styles.container}>
                <StatusBar style="light" translucent={true} backgroundColor="transparent" />
                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <LottieView
                            source={loadingAnimation}
                            autoPlay
                            loop
                            style={styles.lottieAnimation}
                        />
                        <Text style={styles.loadingText}>Loading...</Text>
                    </View>
                ) : (
                    <>
                        {!isOnline && (
                            <View style={[styles.banner, { backgroundColor: "red" }]}>
                                <Ionicons name="cloud-offline" size={20} color="white" style={styles.icon} />
                                <Text style={[styles.text, { fontSize: 16 }]}>No Internet Connection</Text>
                            </View>
                        )}
                        {showBackOnline && (
                            <View style={[styles.banner, { backgroundColor: "green" }]}>
                                <Ionicons name="cloud-done" size={20} color="white" style={styles.icon} />
                                <Text style={[styles.text, { fontSize: 16 }]}>Back Online</Text>
                            </View>
                        )}
                        <DrawerNavigator />
                    </>
                )}
            </View>
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,

    },
    loadingContainer: {
        flex: 1,
        backgroundColor: "#000",
        justifyContent: "center",
        alignItems: "center",
        padding: 10,
    },
    lottieAnimation: {
        width: 150,
        height: 150,
    },
    loadingText: {
        color: "white",
        marginTop: 20,
        fontSize: 16,
    },
    banner: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        padding: 10,
        position: 'absolute',
        top: Platform.OS === 'ios' ? 10 : 0,
        width: '100%',
    },
    icon: {
        marginRight: 8,
    },
    text: {
        color: "white",
        fontSize: 16,
    },
});