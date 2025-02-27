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

    // Request camera permissions
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

                if (active && isValidUrl(active)) {
                    setActiveUrl(active);
                    refetch();
                } else {
                  
                    const defaultActive = defaultUrls.find(url => url.enabled)?.url;

                    if (defaultActive) {
                        setActiveUrl(defaultActive);
                        await useM3uSaveActiveUrl(defaultActive);
                        refetch();
                    }
                }
            } catch (error) {
                console.error("Failed to load active URL:", error);
            }
        };
        loadActive();
    }, [loadActiveUrl, refetch, defaultUrls]);

    // Auto-save activeUrl to AsyncStorage whenever it changes
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

    // Fade-in animation effect
    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
        }).start();
    }, []);

    // Interval to refetch data every 3 hours
    useEffect(() => {
        const intervalId = setInterval(refetch, 10800000);
        return () => clearInterval(intervalId);
    }, [refetch]);

    // Validate URL format
    const isValidUrl = (url: string) => {
        const urlPattern = /^(https?:\/\/)[\w\-]+(\.[\w\-]+)+([\w\-\.,@?^=%&:/~+#]*[\w\-\@?^=%&/~+#])?$/;
        return urlPattern.test(url);
    };

    // Save new URL to AsyncStorage
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

    // Remove URL from AsyncStorage
    const deleteUrl = async (url: null) => {
        try {
            const updatedUrls = userUrls.filter((item) => item !== url);
            await AsyncStorage.setItem("user_m3u_urls", JSON.stringify(updatedUrls));
            await useM3uDeleteUrl(url);
        } catch (error) {
            console.error("Failed to delete URL:", error);
        }
    };

    // Handle adding URL with validation
    const handleAddUrl = useCallback(async () => {
        const trimmedUrl = newUrl.trim();
        if (!isValidUrl(trimmedUrl)) {
            Alert.alert("Invalid URL", "Please enter a valid URL.");
            return;
        }
        if (userUrls.includes(trimmedUrl)) {
            Alert.alert("Duplicate URL", "This URL already exists in the list.");
            return;
        }
        setIsProcessing(true);
        await addUrl(trimmedUrl);
        setIsProcessing(false);
    }, [newUrl, userUrls, addUrl]);

    const handleDeleteUrl = useCallback((url: React.SetStateAction<null>) => {
        setSelectedUrl(url);
        setModalVisible(true);
    }, []);

    const confirmDelete = useCallback(async () => {
        setIsProcessing(true);
        await deleteUrl(selectedUrl);
        setIsProcessing(false);
        setModalVisible(false);
    }, [selectedUrl, deleteUrl]);

    const handleToggleUrl = useCallback(async (url: React.SetStateAction<string>) => {
        if (url !== activeUrl) {
            setIsProcessing(true);
            setActiveUrl(url);
            refetch();
            setIsProcessing(false);
        }
    }, [activeUrl, refetch]);

    // Handle pull-to-refresh functionality
    const onRefresh = async () => {
        setRefreshing(true);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setRefreshing(false);
    };

    // Handle barcode scanning result
    const handleBarcodeScanned = ({ data }) => {
        setScanned(true);
        if (isValidUrl(data)) {
            setNewUrl(data);
            setScannerVisible(false);
            handleAddUrl();
        } else {
            Alert.alert("Invalid URL", "The QR code does not contain a valid URL.");
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
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} accessibilityLabel="Back">
                    <Icon name="arrow-left" size={16} color="#333" />
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
                    <Text style={styles.modalTitle}>Delete URL?</Text>
                    <Text style={styles.modalMessage}>Are you sure you want to delete this URL?</Text>
                    <View style={styles.modalButtons}>
                        <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setModalVisible(false)}>
                            <Text style={styles.buttonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.modalButton, styles.confirmButton]} onPress={confirmDelete}>
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
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#000",
    },
    title: {
        fontSize: 20,
        fontWeight: "600",
        color: "#FF5733",
    },
    inputContainer: {
        flexDirection: "row",
        paddingHorizontal: 20,
        marginBottom: 20,
        alignItems: "center",
    },
    inputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        marginRight: 10,
        paddingHorizontal: 12,
        backgroundColor: "#Ff3",
    },
    inputIcon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        height: 48,
        color: '#333',
        fontSize: 16,
    },
    actionButton: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addButton: {
        backgroundColor: "#4CAF50",
    },
    scanButton: {
        backgroundColor: "#007BFF",
        marginLeft: 8,
    },
    listContainer: {
        paddingHorizontal: 20,
    },
    listItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
        padding: 16,
        borderRadius: 12,
        backgroundColor: "#Ff3",
    },
    urlInfoContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    urlIcon: {
        marginRight: 8,
    },
    urlText: {
        flex: 1,
        fontSize: 15,
        color: '#000',
    },
    activeUrlText: {
        color: '#4CAF50',
        fontWeight: '600',
    },
    actionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    deleteButton: {
        marginLeft: 16,
        padding: 8,
    },
    modalContainer: {
        backgroundColor: "white",
        padding: 20,
        borderRadius: 10,
        alignItems: "center",
    },
    scannerContainer: {
        height: 400,
        position: 'relative',
        borderRadius: 10,
        overflow: 'hidden',
        backgroundColor: 'black',
    },
    closeButton: {
        position: "absolute",
        top: 10,
        right: 10,
        backgroundColor: "rgba(255, 87, 51, 0.8)",
        padding: 12,
        borderRadius: 30,
        zIndex: 1,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "bold",
        marginVertical: 10,
    },
    modalMessage: {
        textAlign: "center",
        marginBottom: 20,
        color: "#555",
    },
    modalButtons: {
        flexDirection: "row",
        justifyContent: "space-between",
        width: "100%",
    },
    modalButton: {
        flex: 1,
        padding: 10,
        alignItems: "center",
        borderRadius: 5,
    },
    cancelButton: {
        backgroundColor: "#757575",
        marginRight: 5,
    },
    confirmButton: {
        backgroundColor: "#FF5733",
        marginLeft: 5,
    },
    buttonText: {
        color: "white",
        fontWeight: "bold",
    },
    disabledButton: {
        backgroundColor: "#ccc",
    },
    errorText: {
        color: "red",
        fontSize: 14,
        marginTop: 5,
        textAlign: "center",
    },
    scannerText: {
        color: 'white',
        textAlign: 'center',
        padding: 20,
    },
    rescanButton: {
        position: 'absolute',
        bottom: 20,
        alignSelf: 'center',
        backgroundColor: 'rgba(76, 175, 80, 0.8)',
        padding: 12,
        borderRadius: 30,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: 'transparent',
    },
    backButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.9)',
    },
    headerRight: {
        width: 40,
    },
});

export default EditUrl;