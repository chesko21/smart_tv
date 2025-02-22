import React, { useState, useEffect } from "react";
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
    Dimensions,
    Platform,
    StatusBar
} from "react-native";
import Modal from "react-native-modal";
import Icon from "react-native-vector-icons/FontAwesome";
import useM3uParse from "../../hooks/M3uParse";
import { Camera, CameraType, CameraView } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from "@react-navigation/native";

const EditUrl = () => {
    const {
        userUrls,
        addUrl,
        deleteUrl,
        defaultUrls,
        toggleDefaultUrl,
        refetch,
        loading,
        error,
    } = useM3uParse();

    const [newUrl, setNewUrl] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [activeUrl, setActiveUrl] = useState("");
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedUrl, setSelectedUrl] = useState(null);
    const [isScannerVisible, setScannerVisible] = useState(false);
    const [hasPermission, setHasPermission] = useState(null);
    const [scanned, setScanned] = useState(false);
    const insets = useSafeAreaInsets();
    const [fadeAnim] = useState(new Animated.Value(0));
    const windowWidth = Dimensions.get('window').width;
    const navigation = useNavigation();

    useEffect(() => {
        setIsProcessing(loading);
        const activeDefault = defaultUrls.find((item) => item.enabled);
        if (activeDefault) {
            setActiveUrl(activeDefault.url);
        } else if (userUrls.length > 0) {
            setActiveUrl(userUrls[0]);
        }
    }, [loading, defaultUrls, userUrls]);

    useEffect(() => {
        const getCameraPermissions = async () => {
          const { status } = await Camera.requestCameraPermissionsAsync();
          setHasPermission(status === "granted");
        };
    
        getCameraPermissions();
      }, []);

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
        }).start();
    }, []);

    const isValidUrl = (url) => {
        const urlPattern = /^(https?:\/\/)[\w\-_]+(\.[\w\-_]+)+([\w\-\.,@?^=%&:/~+#]*[\w\-\@?^=%&/~+#])?$/;
        return urlPattern.test(url);
    };

    const handleAddUrl = async () => {
        const trimmedUrl = newUrl.trim();
        if (!isValidUrl(trimmedUrl)) {
            Alert.alert("URL Tidak Valid", "Silakan masukkan URL yang benar.");
            return;
        }
        if (userUrls.includes(trimmedUrl) || defaultUrls.some((item) => item.url === trimmedUrl)) {
            Alert.alert("URL Sudah Ada", "URL ini sudah ada dalam daftar.");
            return;
        }
        setIsProcessing(true);
        await addUrl(trimmedUrl);
        setNewUrl(""); 
        setIsProcessing(false);
    };

    const handleDeleteUrl = (url) => {
        setSelectedUrl(url);
        setModalVisible(true);
    };

    const confirmDelete = async () => {
        setIsProcessing(true);
        await deleteUrl(selectedUrl);
        setIsProcessing(false);
        setModalVisible(false);
    };

    const handleToggleUrl = async (url) => {
        if (url === activeUrl) {
            return;
        }
        setIsProcessing(true);
        setActiveUrl(url);
        if (defaultUrls.some((item) => item.url === url)) {
            await toggleDefaultUrl(url);
        }
        await refetch();
        setIsProcessing(false);
    };

    const combinedUrls = [
        ...defaultUrls.map((item, index) => ({
            ...item,
            name: `smart_tv ${index + 1}`,
            enabled: item.url === activeUrl,
            isUser: false,
        })),
        ...userUrls.map((url) => ({
            url,
            name: `🔒 ${url.substring(0, 15)}...`,
            enabled: url === activeUrl,
            isUser: true,
        })),
    ];

    const handleBarcodeScanned = ({ data }) => {
        setScanned(true);
        if (isValidUrl(data)) {
            setNewUrl(data);
            setScannerVisible(false);
            handleAddUrl();
        } else {
            Alert.alert("URL Tidak Valid", "QR code tidak mengandung URL yang valid");
        }
    };

    return (
        <Animated.View style={[
            styles.container,
            { opacity: fadeAnim, paddingTop: insets.top }
        ]}>
            <StatusBar barStyle="dark-content" />
            
            <View style={styles.header}>
                <TouchableOpacity 
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Icon name="arrow-left" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.title}>Kelola URL M3U</Text>
                <View style={styles.headerRight} />
            </View>
            
            {error && <Text style={styles.errorText}>Error: {error}</Text>}

            <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                    <Icon name="link" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Masukkan URL M3U"
                        placeholderTextColor="#999"
                        value={newUrl}
                        onChangeText={setNewUrl}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                </View>
                
                <TouchableOpacity
                    style={[
                        styles.actionButton,
                        styles.addButton,
                        (!isValidUrl(newUrl) || isProcessing) && styles.disabledButton
                    ]}
                    onPress={handleAddUrl}
                    disabled={!isValidUrl(newUrl) || isProcessing}
                >
                    {isProcessing ? (
                        <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                        <Icon name="plus" size={20} color="white" />
                    )}
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.actionButton, styles.scanButton]}
                    onPress={() => setScannerVisible(true)}
                >
                    <Icon name="qrcode" size={20} color="white" />
                </TouchableOpacity>
            </View>

            {!isValidUrl(newUrl) && newUrl.length > 0 && (
                <Text style={styles.errorText}>URL tidak valid! Gunakan format yang benar.</Text>
            )}

            {loading && <ActivityIndicator size="large" color="#0000ff" />}

            <FlatList
                data={combinedUrls}
                keyExtractor={(item) => item.url}
                contentContainerStyle={styles.listContainer}
                renderItem={({ item }) => (
                    <Animated.View 
                        style={[styles.listItem, { transform: [{ scale: fadeAnim }] }]}
                    >
                        <View style={styles.urlInfoContainer}>
                            <Icon 
                                name={item.isUser ? "lock" : "globe"} 
                                size={16} 
                                color={item.enabled ? "#4CAF50" : "#757575"}
                                style={styles.urlIcon}
                            />
                            <Text style={[
                                styles.urlText,
                                item.enabled && styles.activeUrlText
                            ]}>
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
                                >
                                    <Icon name="trash" size={20} color="#FF5733" />
                                </TouchableOpacity>
                            )}
                        </View>
                    </Animated.View>
                )}
            />

            <Modal 
                isVisible={modalVisible}
                onBackdropPress={() => setModalVisible(false)}
                animationIn="fadeIn"
                animationOut="fadeOut"
                backdropTransitionOutTiming={0}
            >
                <View style={styles.modalContainer}>
                    <Icon name="exclamation-circle" size={40} color="#FF5733" />
                    <Text style={styles.modalTitle}>Hapus URL?</Text>
                    <Text style={styles.modalMessage}>Apakah Anda yakin ingin menghapus URL ini?</Text>
                    <View style={styles.modalButtons}>
                        <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setModalVisible(false)}>
                            <Text style={styles.buttonText}>Batal</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.modalButton, styles.confirmButton]} onPress={confirmDelete}>
                            <Text style={styles.buttonText}>Hapus</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Scanner modal */}
            <Modal isVisible={isScannerVisible} onBackdropPress={() => setScannerVisible(false)}>
                <View style={styles.scannerContainer}>
                    {hasPermission === null ? (
                        <Text style={styles.scannerText}>Meminta izin kamera...</Text>
                    ) : hasPermission === false ? (
                        <Text style={styles.scannerText}>Tidak ada akses ke kamera</Text>
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
                        <Icon name="times" size={24} color="white" />
                    </TouchableOpacity>
                    {scanned && (
                        <TouchableOpacity
                            style={styles.rescanButton}
                            onPress={() => setScanned(false)}
                        >
                            <Icon name="refresh" size={24} color="white" />
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
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 4,
            },
        }),
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
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
            },
            android: {
                elevation: 4,
            },
        }),
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
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 2,
            },
        }),
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
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    headerRight: {
        width: 40, // Balance layout with back button
    },
});

export default EditUrl;