import React, { useState, useCallback, useEffect } from "react";
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    StatusBar,
    RefreshControl,
    SafeAreaView,
    Modal,
    TextInput,
    Alert,
    Button,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { watchHistoryEvent } from "./PlayerScreen";
import { useNavigation } from "@react-navigation/native";
import { launchImageLibrary } from 'react-native-image-picker';
import { userUpdateEmitter } from './DrawerNavigator';
import { usePip } from '../../contexts/PipContext';
import LottieView from 'lottie-react-native';
import loadingAnimation from '../../assets/animations/loading.json';

const isValidURL = (url) => {
    try {
        new URL(url);
        return true;
    } catch (error) {
        return false;
    }
};

const Header = ({ navigation, user, avatarError, onEditPress, setAvatarError }) => {
    const isValidAvatar = user && user.avatar && typeof user.avatar === 'string';
    const isLocalImage = user?.avatar && !isValidURL(user.avatar);
    const { setPipMode } = usePip();

    const defaultAvatarUrl = "https://img.lovepik.com/png/20231108/cute-cartoon-water-drop-coloring-page-can-be-used-for_531960_wh860.png";
    let imageSource;

    if (avatarError || !isValidAvatar || !user?.avatar) {
        imageSource = { uri: defaultAvatarUrl };
    } else if (isLocalImage) {
        imageSource = { uri: user.avatar };
    } else {
        imageSource = { uri: user.avatar };
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.fixedHeader}>
                <View style={styles.header}></View>
                <View style={styles.profileSection}>
                    <View style={styles.avatarContainer}>
                        <Image
                            source={imageSource}
                            style={styles.avatar}
                            onError={() => {
                                setAvatarError(true);
                            }}
                        />
                    </View>
                    <Text style={styles.username}>{user.username}</Text>
                </View>
                <BioSection bio={user.bio} />
                <EditProfileButton onPress={onEditPress} />
                <HistoryTitle />
            </View>
        </SafeAreaView>
    );
};

const BioSection = ({ bio }) => {
    return (
        <View style={styles.bioContainer}>
            <Text style={styles.bio} numberOfLines={2}>
                {bio}
            </Text>
        </View>
    );
};

const EditProfileButton = ({ onPress }) => {
    return (
        <TouchableOpacity style={styles.editProfileButton} onPress={onPress}>
            <Text style={styles.editProfileText}>Edit Profile</Text>
        </TouchableOpacity>
    );
};

const HistoryTitle = () => {
    return (
        <View>
            <Text style={styles.historyTitle}>📺 Riwayat Tontonan</Text>
        </View>
    );
};

const Profile = () => {
    const navigation = useNavigation();
    const { setPipMode } = usePip();
    const [avatarError, setAvatarError] = useState(false);
    const [watchHistory, setWatchHistory] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const [user, setUser] = useState({
        name: "",
        username: "",
        bio: "",
        avatar: "",
    });

    const defaultUser = {
        name: "Smart_TV",
        username: "Smart_TV",
        bio: "Smart_TV",
        avatar: "https://img.lovepik.com/png/20231108/cute-cartoon-water-drop-coloring-page-can-be-used-for_531960_wh860.png",
    };

    const [isEditModalVisible, setEditModalVisible] = useState(false);
    const [editedUser, setEditedUser] = useState({ ...user });

    const saveUserData = async (userData) => {
        try {
            await AsyncStorage.setItem("user", JSON.stringify(userData));
            setUser(userData);
            setEditedUser(userData);
            setEditModalVisible(false);
            userUpdateEmitter.emit('userUpdate'); // Emit event here
        } catch (e) {
            console.error("Failed to save user data to storage", e);
        }
    };

    const handleEditProfile = () => {
        setEditModalVisible(true);
    };

    const handleInputChange = (field, value) => {
        setEditedUser({ ...editedUser, [field]: value });
    };

    const handleChooseImage = async () => {
        const options = {
            mediaType: 'photo',
            includeBase64: false,
            selectionLimit: 1,
        };

        launchImageLibrary(options, (response) => {
            if (!response.didCancel && response.assets && response.assets.length > 0) {
                const imagePath = response.assets[0].uri;
                handleInputChange('avatar', imagePath);
            }
        });
    };

    const handleSaveProfile = () => {
        saveUserData(editedUser);
        setEditModalVisible(false);
    };

    const loadWatchHistory = useCallback(async () => {
        try {
            const storedHistory = await AsyncStorage.getItem("watchHistory");
            if (storedHistory) {
                let historyArray = JSON.parse(storedHistory);
                let uniqueHistory = historyArray.filter(
                    (item, index, self) =>
                        item.name !== undefined &&
                        item.name !== null &&
                        index === self.findIndex((t) => t.name === item.name)
                );
                uniqueHistory.sort(
                    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                );
                const limitedHistory = uniqueHistory.slice(0, 20);

                setWatchHistory(limitedHistory);
                await AsyncStorage.setItem("watchHistory", JSON.stringify(limitedHistory));
            } else {
                setWatchHistory([]);
            }
        } catch (error) {
            console.error("Gagal mengambil riwayat tontonan:", error);
            setWatchHistory([]);
        }
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await loadWatchHistory();
        } catch (error) {
            console.error("Error saat merefresh riwayat tontonan:", error);
        } finally {
            setRefreshing(false);
        }
    }, [loadWatchHistory]);

    useFocusEffect(
        useCallback(() => {
            const subscription = watchHistoryEvent.addListener("historyUpdated", () => {
                loadWatchHistory();
            });
            loadWatchHistory();
            return () => {
                subscription.remove();
            };
        }, [loadWatchHistory])
    );

    useFocusEffect(
        useCallback(() => {
            const loadUserData = async () => {
                try {
                    const storedUser = await AsyncStorage.getItem("user");
                    if (storedUser) {
                        const parsedUser = JSON.parse(storedUser);
                        setUser(parsedUser);
                        setEditedUser(parsedUser);
                        setAvatarError(false);
                    } else {
                        setUser(defaultUser);
                        setEditedUser(defaultUser);
                        setAvatarError(false);
                        await AsyncStorage.setItem("user", JSON.stringify(defaultUser));
                    }
                } catch (e) {
                    console.error("Failed to load user data from storage in ProfileScreen", e);
                    setUser(defaultUser);
                    setEditedUser(defaultUser);
                    setAvatarError(false);
                }
            };
            loadUserData();
        }, [])
    );

    const handleHistoryItemPress = (item) => {
        if (!item || !item.url) {
            console.warn("URL video tidak ditemukan untuk item riwayat:", item);
            return;
        }
        setPipMode(false); // Set PiP mode to normal
        navigation.navigate("PlayerScreen", {
            url: item.url,
            name: item.name,
            logo: item.logo,
        });
    };

    const renderHistoryItem = ({ item, index }) => {
        return (
            <TouchableOpacity
                style={styles.historyItem}
                onPress={() => handleHistoryItemPress(item)}
            >
                <Image
                    source={
                        item.logo
                            ? { uri: item.logo }
                            : { uri: "https://img.lovepik.com/png/20231108/cute-cartoon-water-drop-coloring-page-can-be-used-for_531960_wh860.png" }
                    }
                    style={styles.thumbnail}
                />
                <View style={styles.overlay}>
                    <Text style={styles.historyText} numberOfLines={1}>
                        {item.name}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    const HeaderComponent = () => (
        <Header
            navigation={navigation}
            user={user}
            avatarError={avatarError}
            onEditPress={handleEditProfile}
            setAvatarError={setAvatarError}
        />
    );

    useEffect(() => {
        // Simulate a loading process
        setTimeout(() => {
            setIsLoading(false);
        }, 3000);
    }, []);

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <LottieView
                    source={loadingAnimation}
                    autoPlay
                    loop
                    style={styles.loadingAnimation}
                />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar backgroundColor="#000" barStyle="light-content" />
            <FlatList
                ListHeaderComponent={HeaderComponent}
                data={watchHistory}
                keyExtractor={(item, index) => index.toString()}
                numColumns={4}
                renderItem={renderHistoryItem}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                contentContainerStyle={styles.flatlistContentContainer}
            />

            {/* Edit Profile Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={isEditModalVisible}
                onRequestClose={() => {
                    setEditModalVisible(!isEditModalVisible);
                }}
            >
                <View style={styles.centeredView}>
                    <View style={styles.modalView}>
                        <Text style={styles.modalTitle}>Edit Profile</Text>

                        <Text style={styles.modalLabel}>Name</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={editedUser.name}
                            onChangeText={(text) => handleInputChange("name", text)}
                        />

                        <Text style={styles.modalLabel}>Username</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={editedUser.username}
                            onChangeText={(text) => handleInputChange("username", text)}
                        />

                        <Text style={styles.modalLabel}>Bio</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={editedUser.bio}
                            onChangeText={(text) => handleInputChange("bio", text)}
                        />

                        <Text style={styles.modalLabel}>Avatar</Text>
                        <TouchableOpacity style={styles.chooseImageButton} onPress={handleChooseImage}>
                            <Image
                                source={editedUser.avatar ? { uri: editedUser.avatar } : { uri: "https://img.lovepik.com/png/20231108/cute-cartoon-water-drop-coloring-page-can-be-used-for_531960_wh860.png" }}
                                style={styles.chooseImagePreview}
                                resizeMode="cover"
                            />
                        </TouchableOpacity>


                        <View style={styles.modalButtonContainer}>
                            <TouchableOpacity
                                style={{ ...styles.modalButton, backgroundColor: "#aaa" }}
                                onPress={() => setEditModalVisible(false)}
                            >
                                <Text style={styles.modalButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalButton}
                                onPress={handleSaveProfile}
                            >
                                <Text style={styles.modalButtonText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
    },
    loadingAnimation: {
        width: 200,
        height: 200,
    },
    container: {
        flex: 1,
        backgroundColor: "#000",
    },
    fixedHeader: {
        backgroundColor: "#000",
        paddingBottom: 10,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 15,
        backgroundColor: "#000",
        marginTop: 20,
    },
    profileSection: {
        alignItems: "center",
        paddingBottom: 10,
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
    bioContainer: {
        alignItems: "center",
        paddingHorizontal: 20,
        marginBottom: 10,
    },
    bio: {
        fontSize: 14,
        color: "#aaa",
        textAlign: "center",
    },
    editProfileButton: {
        backgroundColor: "#333",
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        marginHorizontal: 20,
        marginBottom: 15,
    },
    editProfileText: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#fff",
    },
    historyTitle: {
        color: "#e3c800",
        fontSize: 16,
        fontWeight: "bold",
        marginBottom: 10,
        paddingHorizontal: 10,
    },
    historyItem: {
        width: "24%",
        aspectRatio: 1,
        margin: 5,
        borderRadius: 10,
        overflow: "hidden",
        backgroundColor: "#222",
        alignSelf: "flex-start",
    },
    thumbnail: {
        width: "100%",
        height: "100%",
        resizeMode: "cover",
    },
    overlay: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        paddingVertical: 5,
        paddingHorizontal: 8,
        backgroundColor: "rgba(223, 247, 15, 0.69)",
    },
    historyText: {
        color: "#000",
        fontSize: 14,
        fontWeight: "bold",
        textAlign: "center",
    },
    flatlistContentContainer: {
        paddingTop: 10,
        paddingBottom: 10,
    },
    separator: {
        height: 5,
    },
    centeredView: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    modalView: {
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 20,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        width: "80%",
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 15,
        color: "#333",
    },
    modalLabel: {
        fontSize: 16,
        marginBottom: 5,
        alignSelf: "flex-start",
        color: "#555",
    },
    modalInput: {
        width: "100%",
        height: 40,
        borderColor: "#ccc",
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 10,
        marginBottom: 15,
        backgroundColor: "#f9f9f9",
    },
    modalButtonContainer: {
        flexDirection: "row",
        justifyContent: "space-around",
        width: "100%",
        marginTop: 10,
    },
    modalButton: {
        backgroundColor: "#007bff",
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 25,
        elevation: 2,
        width: "45%",
        alignItems: "center",
    },
    modalButtonText: {
        color: "#fff",
        fontWeight: "bold",
        textAlign: "center",
        fontSize: 16,
    },
    chooseImageButton: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: "#ccc",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 15,
        overflow: 'hidden', 
    },
    chooseImagePreview: {
        width: '100%',
        height: '100%',
        borderRadius: 50,
    },
});

export default Profile;