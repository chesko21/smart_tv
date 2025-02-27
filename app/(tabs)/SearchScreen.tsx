import React, { useState } from "react";
import {
    View, Text, TextInput, FlatList, TouchableOpacity,
    Image, StyleSheet, ActivityIndicator, SafeAreaView, RefreshControl
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import useM3uParse from "../../hooks/M3uParse";
import { usePip } from '../../contexts/PipContext';
import Toast from 'react-native-toast-message';
import { debounce } from 'lodash';

const defaultLogo = require("../../assets/images/tv_banner.png");

const SearchScreen = () => {
    const { channels, loading, error, refetch } = useM3uParse();
    const [searchQuery, setSearchQuery] = useState("");
    const [searchPressed, setSearchPressed] = useState(false);
    const [refreshing, setRefreshing] = useState(false); 

    const navigation = useNavigation();
    const { setPipMode } = usePip();
    const allChannels = channels ?? [];

    const filteredChannels = searchPressed && searchQuery.trim() !== ""
        ? allChannels.filter(channel => 
            channel.name?.toLowerCase().includes(searchQuery.toLowerCase().trim())
          )
        : [];

    const showToast = (message) => {
        Toast.show({
            type: 'error',
            text1: message,
            position: 'top',
            visibilityTime: 2000,
        });
    };

    const handleSearch = (text) => {
        setSearchQuery(text);
        if (searchPressed) {
            setSearchPressed(false);
        }
    };

    const performSearch = () => {
        const trimmedQuery = searchQuery.trim();
        if (trimmedQuery === "") {
            showToast("Please enter a channel name");
            return;
        }
        setSearchPressed(true);
    };

    const handleClearSearch = () => {
        setSearchQuery("");
        setSearchPressed(false);
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
            <View style={styles.container}>
                <Text style={styles.title}>Search TV Channels</Text>

                <View style={styles.searchContainer}>
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Search for a channel..."
                            placeholderTextColor="#666"
                            value={searchQuery}
                            onChangeText={handleSearch}
                            onSubmitEditing={performSearch}
                            returnKeyType="search"
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity
                                style={styles.clearButton}
                                onPress={handleClearSearch}
                            >
                                <Text style={styles.clearButtonText}>×</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    <TouchableOpacity
                        style={[
                            styles.searchButton,
                            !searchQuery.trim() && styles.searchButtonDisabled
                        ]}
                        onPress={performSearch}
                        disabled={!searchQuery.trim()}
                    >
                        <Text style={styles.searchButtonText}>Search</Text>
                    </TouchableOpacity>
                </View>

                {loading && <ActivityIndicator size="large" color="#007bff" style={styles.loader} />}
                {error && <Text style={styles.error}>{error}</Text>}

                {searchPressed && filteredChannels.length === 0 && !loading && (
                    <Text style={styles.noResults}>No results found.</Text>
                )}

                {searchPressed && (
                    <FlatList
                        data={filteredChannels}
                        keyExtractor={(item, index) => (item.tvgId ? item.tvgId.toString() : `channel-${index}`)}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.channelItem}
                                onPress={() => {
                                    setPipMode(false);
                                    if (item.url) {
                                        navigation.navigate("PlayerScreen", { url: item.url });
                                    } else {
                                        alert("URL tidak tersedia!");
                                    }
                                }}
                            >
                                <Image
                                    source={item.logo ? { uri: item.logo } : defaultLogo}
                                    style={styles.logo}
                                    resizeMode="contain"
                                    defaultSource={defaultLogo}
                                />
                                <Text style={styles.channelName}>{item.name}</Text>
                            </TouchableOpacity>
                        )}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh} // Trigger refresh function
                                tintColor="#007bff" // Customize the loading spinner color
                            />
                        }
                    />
                )}
            </View>
            <Toast />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        paddingTop: 40,
    },
    title: {
        fontSize: 22,
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: 16,
        color: "#fff",
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
        gap: 8,
    },
    inputContainer: {
        flex: 1,
        position: 'relative',
    },
    input: {
        height: 42,
        borderColor: "#007bff",
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingRight: 40,
        backgroundColor: "#fff",
        color: "#000",
    },
    clearButton: {
        position: 'absolute',
        right: 8,
        height: 42,
        width: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    clearButtonText: {
        color: '#666',
        fontSize: 24,
        fontWeight: 'bold',
        lineHeight: 24,
    },
    searchButton: {
        backgroundColor: "#007bff",
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        minWidth: 80,
        alignItems: 'center',
    },
    searchButtonDisabled: {
        backgroundColor: "#666",
    },
    searchButtonText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 16,
    },
    loader: {
        marginTop: 10,
    },
    error: {
        color: "red",
        textAlign: "center",
        marginBottom: 10,
    },
    channelItem: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        backgroundColor: "#1E1E1E",
        borderRadius: 12,
        marginBottom: 12,
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    logo: {
        width: 50,
        height: 50,
        borderRadius: 8,
        marginRight: 12,
    },
    channelName: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#fff",
    },
    noResults: {
        textAlign: "center",
        fontSize: 16,
        color: "#fff",
        marginBottom: 20,
    },
});

export default SearchScreen;