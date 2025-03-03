import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    View,
    Text,
    TextInput,
    FlatList,
    StyleSheet,
    Switch,
    ActivityIndicator,
    TouchableOpacity,
    Alert,
    Animated,
    StatusBar,
    RefreshControl,
} from "react-native";
import Modal from "react-native-modal";
import Icon from "react-native-vector-icons/FontAwesome";
import { Camera, CameraView } from "expo-camera";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import useM3uParse from "../../hooks/M3uParse";
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import Toast from "react-native-toast-message";


const EditUrl = () => {
    const {
        userUrls,
        addUrl: useM3uAddUrl,
        deleteUrl: useM3uDeleteUrl,
        defaultUrls,
        refetch,
        loading,
        error,
        loadActiveUrl,
        saveActiveUrl: useM3uSaveActiveUrl,
    } = useM3uParse();

    const [newUrl, setNewUrl] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [activeUrl, setActiveUrl] = useState("");
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedUrl, setSelectedUrl] = useState(null);
    const [isScannerVisible, setScannerVisible] = useState(false);
    const [hasPermission, setHasPermission] = useState(null);
    const [scanned, setScanned] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const insets = useSafeAreaInsets();
    const [fadeAnim] = useState(new Animated.Value(0));
    const navigation = useNavigation();
    const handleDeleteUrl = useCallback((url: string) => {
        setSelectedUrl(url);
        setModalVisible(true);
    }, []);
    useEffect(() => {
        const getCameraPermissions = async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === "granted");
        };
        getCameraPermissions();
    }, []);

    useFocusEffect(
        useCallback(() => {
            refetch(); 
        }, [refetch])
    );

    useEffect(() => {
        const loadActive = async () => {
            try {
                const active = await loadActiveUrl();
                console.log(`Loaded Active URL: ${active}`);

                if (active && await isValidUrl(active)) {
                    setActiveUrl(active);
                    await useM3uSaveActiveUrl(active);
                    refetch();
                } else {
                   
                    const firstDefaultUrl = defaultUrls[0]?.url;
                    if (firstDefaultUrl) {
                        setActiveUrl(firstDefaultUrl);
                        await useM3uSaveActiveUrl(firstDefaultUrl);
                        console.log(`Setting default URL as active: ${firstDefaultUrl}`);
                        refetch();
                    } else {
                        console.log('No default URLs available');
                    }
                }
            } catch (error) {
                console.error("Failed to load active URL:", error);
            }
        };
        loadActive();
    }, [loadActiveUrl, refetch, defaultUrls]);

    useEffect(() => {
        const saveActiveToStorage = async () => {
            try {
                await AsyncStorage.setItem("active_m3u_url", activeUrl);
            } catch (error) {
                console.error("Failed to save active URL:", error);
            }
        };

        if (activeUrl) saveActiveToStorage();
    }, [activeUrl]);

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
        }).start();
    }, []);

    useEffect(() => {
        const intervalId = setInterval(refetch, 10800000);
        return () => clearInterval(intervalId);
    }, [refetch]);

    const isValidUrl = async (url: string) => {
        const urlPattern = /^(https?:\/\/)[\w\-]+(\.[\w\-]+)+([\w\-\.,@?^=%&:/~+#]*[\w\-\@?^=%&/~+#])?$/;
        if (!urlPattern.test(url)) return false;

        try {
            const response = await axios.get(url, { 
                timeout: 60000,
                maxContentLength: Infinity, 
                headers: {
                    'Accept': 'text/plain',
                    'User-Agent': 'Mozilla/5.0'
                }
            });
            
            const content = response.data.toString();
            return content.includes('#EXTM3U');
        } catch (error) {
            console.error("URL validation error:", error);
            return false;
        }
    };

    const addUrl = async (url: string) => {
        try {
            const updatedUrls = [...userUrls, url];
            setNewUrl("");
            await AsyncStorage.setItem("user_m3u_urls", JSON.stringify(updatedUrls));
            await useM3uAddUrl(url);
        } catch (error) {
            console.error("Failed to save URL:", error);
        }
    };

    const deleteUrl = async (url: null) => {
        try {
            const updatedUrls = userUrls.filter((item) => item !== url);
            await AsyncStorage.setItem("user_m3u_urls", JSON.stringify(updatedUrls));
            await useM3uDeleteUrl(url);
        } catch (error) {
            console.error("Failed to delete URL:", error);
        }
    };

    const handleAddUrl = useCallback(async () => {
        const trimmedUrl = newUrl.trim();
        setIsProcessing(true);
        
        try {
            await AsyncStorage.removeItem('channelsData');
            
            const isValid = await isValidUrl(trimmedUrl);
            if (!isValid) {
                Toast.show({
                    type: 'error',
                    text1: 'Invalid URL',
                    text2: 'Please enter a valid M3U playlist URL with fewer channels.'
                });
                return;
            }

            if (userUrls.includes(trimmedUrl)) {
                Toast.show({
                    type: 'error',
                    text1: 'Duplicate URL',
                    text2: 'This URL already exists in the list.'
                });
                return;
            }

            await addUrl(trimmedUrl);
            Toast.show({
                type: 'success',
                text1: 'Success',
                text2: 'URL added successfully!'
            });
        } catch (error) {
            console.error("Failed to verify URL:", error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to verify M3U playlist URL. The playlist might be too large.'
            });
        } finally {
            setIsProcessing(false);
        }
    }, [newUrl, userUrls, addUrl]);

    // Update URL toggle to include verification
    const handleToggleUrl = useCallback(async (url: React.SetStateAction<string>) => {
        if (url !== activeUrl) {
            setIsProcessing(true);
            try {
                const isValid = await isValidUrl(url);
                if (!isValid) {
                    Toast.show({
                        type: 'error',
                        text1: 'Invalid URL',
                        text2: 'The selected URL is not a valid M3U playlist.'
                    });
                    return;
                }

                await useM3uSaveActiveUrl(url);
                setActiveUrl(url);
                await refetch();
                Toast.show({
                    type: 'success',
                    text1: 'Success',
                    text2: 'URL activated successfully!'
                });
            } catch (error) {
                console.error("Failed to toggle URL:", error);
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'Failed to verify M3U playlist URL.'
                });
            } finally {
                setIsProcessing(false);
            }
        }
    }, [activeUrl, refetch, useM3uSaveActiveUrl]);
    // Handle pull-to-refresh functionality
    const onRefresh = async () => {
        setRefreshing(true);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setRefreshing(false);
    };

    // Handle barcode scanning result
    const handleBarcodeScanned = async ({ data }) => {
        setScanned(true);
        try {
            const isValid = await isValidUrl(data);
            if (isValid) {
                setNewUrl(data);
                setScannerVisible(false);
                handleAddUrl();
            } else {
                Alert.alert("Invalid URL", "The QR code does not contain a valid M3U playlist URL.");
            }
        } catch (error) {
            console.error("QR code validation error:", error);
            Alert.alert("Error", "Failed to validate QR code URL");
        }
    };
    const combinedUrls = useMemo(() => {
        return [
            ...defaultUrls.map((item: { url: string }, index: number) => ({
                ...item,
                name: `smart_tv ${index + 1}`,
                enabled: item.url === activeUrl,
                isUser: false,
            })),
            ...userUrls.map((url: string) => ({
                url,
                name: `🔒 ${url.substring(0, 15)}...`,
                enabled: url === activeUrl,
                isUser: true,
            })),
        ];
    }, [defaultUrls, userUrls, activeUrl]);

    return (
        <Animated.View style={[styles.container, { opacity: fadeAnim, paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.header}>
                <TouchableOpacity 
                    style={styles.backButton} 
                    onPress={() => navigation.goBack()} 
                    accessibilityLabel="Back"
                >
                    <Icon name="arrow-left" size={16} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.title}>Manage M3U URLs</Text>
                <View style={styles.headerRight} />
            </View>

            {error && <Text style={styles.errorText}>Error: {error}</Text>}

            <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                    <Icon name="link" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Enter M3U URL"
                        placeholderTextColor="#999"
                        value={newUrl}
                        onChangeText={setNewUrl}
                        autoCapitalize="none"
                        autoCorrect={false}
                        accessibilityLabel="M3U URL input"
                    />
                </View>

                <TouchableOpacity
                    style={[
                        styles.actionButton,
                        styles.addButton,
                        (!isValidUrl(newUrl) || isProcessing) && styles.disabledButton,
                    ]}
                    onPress={handleAddUrl}
                    disabled={!isValidUrl(newUrl) || isProcessing}
                    accessibilityLabel="Add URL"
                >
                    {isProcessing ? (
                        <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                        <Icon name="plus" size={16} color="white" />
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, styles.scanButton]}
                    onPress={() => setScannerVisible(true)}
                    accessibilityLabel="Scan QR Code"
                >
                    <Icon name="qrcode" size={16} color="white" />
                </TouchableOpacity>
            </View>

            {!isValidUrl(newUrl) && newUrl.length > 0 && (
                <Text style={styles.errorText}>Invalid URL! Please use the correct format.</Text>
            )}

            {loading && <ActivityIndicator size="large" color="#0000ff" />}

            <FlatList
                data={combinedUrls}
                keyExtractor={(item) => item.url}
                contentContainerStyle={styles.listContainer}
                renderItem={({ item }) => (
                    <Animated.View style={[styles.listItem, { transform: [{ scale: fadeAnim }] }]}>
                        <View style={styles.urlInfoContainer}>
                            <Icon name={item.isUser ? "lock" : "globe"} size={15} color={item.enabled ? "#4CAF50" : "#757575"} style={styles.urlIcon} />
                            <Text style={[styles.urlText, item.enabled && styles.activeUrlText]}>
                                {item.name}
                            </Text>
                        </View>

                        <View style={styles.actionContainer}>
                            <Switch
                                value={item.enabled}
                                onValueChange={() => handleToggleUrl(item.url)}
                                disabled={isProcessing}
                                trackColor={{ false: "#ddd", true: "#4CAF50" }}
                                thumbColor={item.enabled ? "#000" : "#FF5733"}
                            />
                            {item.isUser && (
                                <TouchableOpacity
                                    onPress={() => handleDeleteUrl(item.url)}
                                    style={styles.deleteButton}
                                    disabled={isProcessing}
                                    accessibilityLabel="Delete URL"
                                >
                                    <Icon name="trash" size={15} color="#FF5733" />
                                </TouchableOpacity>
                            )}
                        </View>
                    </Animated.View>
                )}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            />

            <Modal 
                isVisible={modalVisible}
                onBackdropPress={() => setModalVisible(false)}
                animationIn="fadeIn"
                animationOut="fadeOut"
                backdropTransitionOutTiming={0}
            >
                <View style={styles.modalContainer}>
                    <Icon name="exclamation-circle" size={20} color="#FF5733" />
                    <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginVertical: 8 }}>Delete URL?</Text>
                    <Text style={{ color: '#fff', fontSize: 16, marginVertical: 12, textAlign: 'center' }}>Are you sure you want to delete this URL?</Text>
                    <View style={styles.modalButtons}>
                        <TouchableOpacity 
                            style={[styles.modalButton, styles.cancelButton]} 
                            onPress={() => setModalVisible(false)}
                        >
                            <Text style={styles.buttonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.modalButton, styles.confirmButton]} 
                            onPress={async () => {
                                setIsProcessing(true);
                                await deleteUrl(selectedUrl);
                                setIsProcessing(false);
                                setModalVisible(false);
                            }}
                        >
                            <Text style={styles.buttonText}>Delete</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Scanner modal */}
            <Modal isVisible={isScannerVisible} onBackdropPress={() => setScannerVisible(false)}>
                <View style={styles.scannerContainer}>
                    {hasPermission === null ? (
                        <Text style={styles.scannerText}>Requesting camera permissions...</Text>
                    ) : hasPermission === false ? (
                        <Text style={styles.scannerText}>No access to camera</Text>
                    ) : (
                        <CameraView
                            style={StyleSheet.absoluteFillObject}
                            onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                            barcodeScannerSettings={{
                                barcodeTypes: ["qr"],
                            }}
                        />
                    )}
                    <TouchableOpacity 
                        onPress={() => {
                            setScannerVisible(false);
                            setScanned(false);
                        }}
                        style={styles.closeButton}
                    >
                        <Icon name="times" size={15} color="white" />
                    </TouchableOpacity>

                    {scanned && (
                        <TouchableOpacity
                            style={styles.rescanButton}
                            onPress={() => setScanned(false)}
                        >
                            <Icon name="refresh" size={15} color="white" />
                        </TouchableOpacity>
                    )}
                </View>
            </Modal>
         <Toast />
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: '#1E1E1E',
        borderBottomWidth: 1,
        borderBottomColor: '#2A2A2A',
    },
    backButton: {
        padding: 10,
        borderRadius: 20,
        backgroundColor: '#FF5733',
    },
    headerRight: {
        width: 40,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: '#1E1E1E',
        marginTop: 16,
        marginHorizontal: 16,
        borderRadius: 12,
    },
    inputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2A2A2A',
        borderRadius: 8,
        marginRight: 8,
        paddingHorizontal: 12,
    },
    input: {
        flex: 1,
        height: 45,
        color: '#fff',
        fontSize: 16,
    },
    actionButton: {
        width: 45,
        height: 45,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
    },
    addButton: {
        backgroundColor: '#4CAF50',
    },
    scanButton: {
        backgroundColor: '#2A2A2A',
        marginLeft: 8,
    },
    listContainer: {
        padding: 16,
    },
    listItem: {
        backgroundColor: '#1E1E1E',
        borderRadius: 12,
        marginBottom: 12,
        padding: 16,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#2A2A2A',
    },
    urlInfoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    urlIcon: {
        marginRight: 8,
    },
    urlText: {
        flex: 1,
        color: '#fff',
        fontSize: 14,
    },
    activeUrlText: {
        color: '#4CAF50',
    },
    actionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        borderTopWidth: 1,
        borderTopColor: '#2A2A2A',
        paddingTop: 12,
    },
    deleteButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#2A2A2A',
        marginLeft: 12,
    },
    modalContainer: {
        backgroundColor: '#1E1E1E',
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#2A2A',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: 16,
    },
    modalButton: {
        flex: 1,
        padding: 12,
        alignItems: 'center',
        borderRadius: 8,
        marginHorizontal: 5,
    },
    cancelButton: {
        backgroundColor: '#2A2A2A',
    },
    confirmButton: {
        backgroundColor: '#FF5733',
    },
    buttonText: {
        color: '#fff',
        fontWeight: '600',
    },
    errorText: {
        color: '#FF5733',
        fontSize: 14,
        marginHorizontal: 16,
        marginTop: 8,
    },
    scannerContainer: {
        height: 400,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#1E1E1E',
        borderWidth: 1,
        borderColor: '#2A2A2A',
    },
    closeButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        backgroundColor: '#2A2A2A',
        padding: 10,
        borderRadius: 20,
        zIndex: 1,
    },
    rescanButton: {
        position: 'absolute',
        bottom: 16,
        alignSelf: 'center',
        backgroundColor: '#4CAF50',
        padding: 10,
        borderRadius: 20,
    },
});
export default EditUrl;
