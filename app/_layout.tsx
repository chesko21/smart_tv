import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, SafeAreaView, Platform, Dimensions } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import * as NavigationBar from "expo-navigation-bar";
import * as ScreenOrientation from "expo-screen-orientation";
import LottieView from "lottie-react-native";
import loadingAnimation from "../assets/animations/loading.json";
import DrawerNavigator from "./(tabs)/DrawerNavigator";
import { Ionicons } from '@expo/vector-icons';
import { PipProvider } from '../contexts/PipContext';
import FloatingPipPlayer from '../components/FloatingPipPlayer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const baseWidth = Dimensions.get('window').width; 
const baseHeight = Dimensions.get('window').height; 


const scale = Math.min(SCREEN_WIDTH / baseWidth, SCREEN_HEIGHT / baseHeight);
const moderateScale = (size: number, factor = 0.4) => size + (scale - 1) * factor;


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
            <PipProvider>
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
                                    <Ionicons name="cloud-offline" size={moderateScale(20)} color="white" style={styles.icon} />
                                    <Text style={[styles.text, { fontSize: moderateScale(16) }]}>No Internet Connection</Text>
                                </View>
                            )}
                            {showBackOnline && (
                                <View style={[styles.banner, { backgroundColor: "green" }]}>
                                    <Ionicons name="cloud-done" size={moderateScale(20)} color="white" style={styles.icon} />
                                    <Text style={[styles.text, { fontSize: moderateScale(16) }]}>Back Online</Text>
                                </View>
                            )}
                            <DrawerNavigator />
                            <FloatingPipPlayer />
                        </>
                    )}
                </View>
            </PipProvider>
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#000",
        position: 'relative',
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: "#000",
        justifyContent: "center",
        alignItems: "center",
        padding: moderateScale(5),
    },

    lottieAnimation: {
        width: '50%',
        height: undefined,
        aspectRatio: 1,
    },
    loadingText: {
        color: "white",
        marginTop: moderateScale(20),
        fontSize: moderateScale(16),
    },
    banner: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        padding: moderateScale(10),
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        position: 'absolute',
        top: Platform.OS === 'ios' ? moderateScale(10) : 0,
        width: '100%',
    },

    icon: {
        marginRight: moderateScale(8),
    },
    text: {
        color: "white",
        fontSize: moderateScale(16),
    },
});
