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

    const filteredChannels = searchPressed
        ? Array.from(
            new Map(
                allChannels
                    .filter(channel => channel.name?.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map(channel => [channel.tvgId || channel.name, channel])
            ).values()
        )
        : [];

    const showToast = (message) => {
        Toast.show({
            type: 'error',
            text1: message,
            position: 'top',
        });
    };

    const handleSearch = debounce((query) => {
        setSearchQuery(query);
        setSearchPressed(true);
    }, 300);

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch(); // Refresh the channel data
        setRefreshing(false); // Stop refreshing
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
            <View style={styles.container}>
                <Text style={styles.title}>Search TV Channels</Text>

                <View style={styles.searchContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Search for a channel..."
                        value={searchQuery}
                        onChangeText={handleSearch}
                    />
                    <TouchableOpacity
                        style={styles.searchButton}
                        onPress={() => {
                            if (searchQuery.trim() === "") {
                                showToast("Please enter a text");
                                return;
                            }
                            setSearchPressed(true);
                        }}
                    >
                        <Text style={styles.searchButtonText}>Search</Text>
                    </TouchableOpacity>
                </View>

                {loading && <ActivityIndicator size="large" color="#007bff" style={styles.loader} />}
                {error && <Text style={styles.error}>{error}</Text>}

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

                {searchPressed && filteredChannels.length === 0 && !loading && (
                    <Text style={styles.noResults}>No results found.</Text>
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
    },
    input: {
        flex: 1,
        height: 42,
        borderColor: "#007bff",
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        backgroundColor: "#fff",
    },
    searchButton: {
        backgroundColor: "#007bff",
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginLeft: 8,
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
        marginTop: 20,
    },
});

export default SearchScreen;