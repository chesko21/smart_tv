import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, SafeAreaView, Platform, Dimensions, ScaledSize } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import * as NavigationBar from "expo-navigation-bar";
import * as ScreenOrientation from "expo-screen-orientation";
import LottieView from "lottie-react-native";
import loadingAnimation from "../assets/animations/loading.json";
import DrawerNavigator from "./(tabs)/DrawerNavigator";
import { Ionicons } from '@expo/vector-icons';
import { PipProvider } from '../contexts/PipContext';
import FloatingPipPlayer from '../components/FloatingPipPlayer';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const baseWidth = 375; 
const baseHeight = 812; 

const scale = SCREEN_WIDTH / baseWidth;
const verticalScale = SCREEN_HEIGHT / baseHeight;
const moderateScale = (size: number, factor = 0.4) => size + (scale - 1) * factor;

export default function Layout() {
    const [isOnline, setIsOnline] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [showBackOnline, setShowBackOnline] = useState(false);
    const [dimensions, setDimensions] = useState({
        window: Dimensions.get('window'),
        screen: Dimensions.get('screen'),
    });

    useEffect(() => {
        const subscription = Dimensions.addEventListener('change', ({ window, screen }) => {
            setDimensions({ window, screen });
        });

        return () => subscription?.remove();
    }, []);

    useEffect(() => {
        const simulateLoading = async () => {
            await new Promise(resolve => setTimeout(resolve, 3000));
            setIsLoading(false);
        };
        simulateLoading();

        NetInfo.fetch().then((state) => {
            const isReachable = state.isInternetReachable ?? state.isConnected ?? false;
            setIsOnline(isReachable);
        });

        const unsubscribe = NetInfo.addEventListener((state) => {
            const isReachable = state.isInternetReachable ?? state.isConnected ?? false;
          //  console.log("NetInfo state:", state); 
           // console.log("isOnline:", isOnline, "isReachable:", isReachable); 
            if (!isOnline && isReachable) {
                setShowBackOnline(true);
                setTimeout(() => setShowBackOnline(false), 5000);
            }
            setIsOnline(isReachable);
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

            return () => {
                NavigationBar.setVisibilityAsync("visible");
            };
        }

        ScreenOrientation.unlockAsync();
    }, []);

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <LottieView 
                    source={loadingAnimation} 
                    autoPlay 
                    loop 
                    style={[
                        styles.lottieAnimation,
                        { width: moderateScale(200), height: moderateScale(200) }
                    ]} 
                />
                <Text style={styles.loadingText}>Loading...</Text>
            </View>
        );
    }

    const bannerTopPosition = Platform.OS === 'android' ? 
        dimensions.window.height * 0.05 : // 5% from top on iOS
        0; // 0 for Android

    return (
        <PipProvider>
            <StatusBar style="light" translucent={true} backgroundColor="transparent" hidden={!isOnline} />  
            <SafeAreaView style={styles.safeArea}>
                {!isOnline && (
                    <View style={[
                        styles.banner, 
                        { 
                            backgroundColor: "red",
                            top: bannerTopPosition,
                            height: moderateScale(50)
                        }
                    ]}>
                        <Ionicons name="cloud-offline" size={moderateScale(20)} color="white" style={styles.icon} />
                        <Text style={[styles.text, { fontSize: moderateScale(16) }]}>No Internet Connection</Text>
                    </View>
                )}
                {showBackOnline && (
                    <View style={[
                        styles.banner,
                        { 
                            backgroundColor: "green",
                            top: bannerTopPosition,
                            height: moderateScale(50)
                        }
                    ]}>
                        <Ionicons name="cloud-done" size={moderateScale(20)} color="white" style={styles.icon} />
                        <Text style={[styles.text, { fontSize: moderateScale(16) }]}>Back Online</Text>
                    </View>
                )}
                <DrawerNavigator />
                <FloatingPipPlayer />
            </SafeAreaView>
        </PipProvider>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#000",
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: "#000",
        justifyContent: "center",
        alignItems: "center",
    },
    lottieAnimation: {
        width: '100%',
        height: '100%',
        aspectRatio: 1,
        maxWidth: moderateScale(200),
        maxHeight: moderateScale(200),
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
        zIndex: 10,
        position: 'absolute',
        left: 0,
        right: 0,
    },
    icon: {
        marginRight: moderateScale(8),
    },
    text: {
        color: "white",
        fontSize: moderateScale(16),
    },
});