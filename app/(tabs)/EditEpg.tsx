import React, { useEffect, useState } from 'react';
import { useEPG } from '../../contexts/EPGContext';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Alert,
  Switch,
  ActivityIndicator,
  ToastAndroid,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../../constants/Colors'; 
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const EditEpg = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { refreshEPG, defaultEpgUrls } = useEPG();
  const [epgUrls, setEpgUrls] = useState([]);
  const [newUrl, setNewUrl] = useState("");
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    const loadEpgUrls = async () => {
      try {
        const storedUrls = await AsyncStorage.getItem('epgUrls');
        const initialUrls = defaultEpgUrls.map(url => ({ url, active: true }));
        const uniqueStoredUrls = storedUrls ? JSON.parse(storedUrls) : [];
        const combinedUrls = [...initialUrls, ...uniqueStoredUrls];
        
        const uniqueUrls = Array.from(new Set(combinedUrls.map(item => item.url)))
          .map(url => ({ url, active: true }));

        setEpgUrls(uniqueUrls);
        setLastUpdated(new Date());
      } catch (error) {
        console.error('Failed to load EPG URLs:', error);
        ToastAndroid.show('Failed to load EPG URLs', ToastAndroid.SHORT);
      }
    };

    loadEpgUrls();
  }, []);

  const saveEpgUrls = async (urls: any[]) => {
    try {
      await AsyncStorage.setItem('epgUrls', JSON.stringify(urls));
      ToastAndroid.show('EPG URLs saved!', ToastAndroid.SHORT);
    } catch (error) {
      console.error('Failed to save EPG URLs:', error);
      ToastAndroid.show('Failed to save EPG URLs', ToastAndroid.SHORT);
    }
  };

  const isValidUrl = (url: string) => {
    const regex = /^(http|https):\/\/[^ "]+$/;
    return regex.test(url);
  };

  const checkUrlExists = async (url: string) => {
    try {
      const response = await axios.head(url, { timeout: 5000 });
      return response.status === 200;
    } catch {
      return false;
    }
  };

  const handleAddOrEditUrl = async () => {
    if (!newUrl.trim()) {
      Alert.alert("Please enter a URL.");
      return;
    }

    const url = newUrl.trim();

    if (!isValidUrl(url)) {
      Alert.alert("Please enter a valid URL.");
      return;
    }

    setIsTesting(true);
    try {
      console.log('Checking URL accessibility:', url);
      const urlExists = await checkUrlExists(url);
      if (!urlExists) {
        console.log('URL not accessible:', url);
        Alert.alert("The URL cannot be reached. Please check and try again.");
        return;
      }
      console.log('URL is accessible, fetching EPG data...');

      const response = await axios.get(url);
      console.log('EPG Response status:', response.status);
      
      if (!response.data || !response.data.includes('<?xml')) {
        console.log('Invalid EPG XML data received');
        Alert.alert("Invalid EPG XML format");
        return;
      }
      console.log('Valid XML data received');

      const updatedUrls = [...epgUrls];
      if (editIndex !== null) {
        updatedUrls[editIndex] = { url, active: true };
      } else if (!updatedUrls.some(item => item.url === url)) {
        updatedUrls.push({ url, active: true });
      } else {
        Alert.alert("This URL already exists.");
        return;
      }

      await saveEpgUrls(updatedUrls);
      setEpgUrls(updatedUrls);
      
      console.log('Refreshing EPG data with new URL...');
      await refreshEPG();
      console.log('EPG refresh completed');
      
      ToastAndroid.show('EPG URL added and data updated successfully!', ToastAndroid.SHORT);
      setNewUrl('');
    } catch (error) {
      console.error('Error details:', error);
      ToastAndroid.show('Failed to process EPG URL', ToastAndroid.SHORT);
    } finally {
      setIsTesting(false);
    }
  };

  const handleEditUrl = (index: number) => {
    setNewUrl(epgUrls[index].url);
    setEditIndex(index);
  };

  const handleDeleteUrl = (index: number) => {
    Alert.alert(
      "Delete URL",
      "Are you sure you want to delete this URL?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          onPress: async () => {
            const updatedUrls = epgUrls.filter((_, i) => i !== index);
            await saveEpgUrls(updatedUrls);
            setEpgUrls(updatedUrls);
            ToastAndroid.show('URL deleted successfully!', ToastAndroid.SHORT);
          },
        },
      ]
    );
  };

  const toggleUrlActive = async (urlToToggle: string) => {
    const updatedUrls = epgUrls.map(item => ({
      ...item,
      active: item.url === urlToToggle ? !item.active : item.active,
    }));

    setEpgUrls(updatedUrls);
    await saveEpgUrls(updatedUrls);
  };

  const renderItem = ({ item, index }) => (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <Text style={[styles.urlText, !item.active && styles.inactiveText]}>{item.url}</Text>
        <Switch
          value={item.active}
          onValueChange={() => toggleUrlActive(item.url)}
          thumbColor={item.active ? '#fff' : '#757575'} 
          trackColor={{ false: '#767577', true: '#3b3b3b' }}
        />
      </View>
      <View style={styles.actionContainer}>
        <TouchableOpacity onPress={() => handleEditUrl(index)} style={styles.iconButton}>
          <Ionicons name="pencil" size={15} color="#C4C4C4" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDeleteUrl(index)} style={[styles.iconButton, styles.deleteButton]}>
          <Ionicons name="trash" size={15} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <View style={[styles.headerContainer, { marginTop: insets.top }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={16} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Manage EPG URLs</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <Ionicons name="link" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter EPG URL"
              placeholderTextColor="#999"
              value={newUrl}
              onChangeText={setNewUrl}
              onFocus={() => setEditIndex(null)}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <TouchableOpacity
            style={[styles.actionButton, styles.addButton, (!isValidUrl(newUrl) || isTesting) && styles.disabledButton]}
            onPress={handleAddOrEditUrl}
            disabled={!isValidUrl(newUrl) || isTesting}
          >
            {isTesting ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Ionicons name={editIndex !== null ? "create" : "add"} size={16} color="white" />
            )}
          </TouchableOpacity>
        </View>
        <FlatList
          data={epgUrls}
          keyExtractor={(item) => item.url}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item, index }) => (
            <View style={styles.listItem}>
              <View style={styles.urlInfoContainer}>
                <Ionicons 
                  name={item.active ? "globe" : "globe-outline"} 
                  size={15} 
                  color={item.active ? "#4CAF50" : "#757575"} 
                  style={styles.urlIcon} 
                />
                <Text style={[styles.urlText, !item.active && styles.inactiveText]}>
                  {item.url}
                </Text>
              </View>
    
              <View style={styles.actionContainer}>
                <Switch
                  value={item.active}
                  onValueChange={() => toggleUrlActive(item.url)}
                  trackColor={{ false: "#ddd", true: "#4CAF50" }}
                  thumbColor={item.active ? "#fff" : "#FF5733"}
                />
                <TouchableOpacity
                  onPress={() => handleEditUrl(index)}
                  style={styles.iconButton}
                >
                  <Ionicons name="create-outline" size={15} color="#4CAF50" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDeleteUrl(index)}
                  style={styles.deleteButton}
                >
                  <Ionicons name="trash-outline" size={15} color="#FF5733" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      </View>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  headerContainer: {
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
  inputIcon: {
    marginRight: 8,
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
  disabledButton: {
    backgroundColor: '#666666',
    opacity: 0.7,
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
  inactiveText: {
    color: '#757575',
    textDecorationLine: 'line-through',
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
    paddingTop: 12,
  },
  iconButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
    marginLeft: 12,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
    marginLeft: 12,
  },
});

export default EditEpg;