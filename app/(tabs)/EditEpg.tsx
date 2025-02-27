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

const EditEpg = () => {
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
      const urlExists = await checkUrlExists(url);
      if (!urlExists) {
        Alert.alert("The URL cannot be reached. Please check and try again.");
        return;
      }

      const updatedUrls = [...epgUrls];
      if (editIndex !== null) {
        updatedUrls[editIndex] = { url, active: true };
        ToastAndroid.show('URL updated successfully!', ToastAndroid.SHORT);
        setEditIndex(null);
      } else if (!updatedUrls.some(item => item.url === url)) {
        updatedUrls.push({ url, active: true });
        ToastAndroid.show('URL added successfully!', ToastAndroid.SHORT);
      } else {
        Alert.alert("This URL already exists.");
        return;
      }

      await saveEpgUrls(updatedUrls);
      setEpgUrls(updatedUrls);
      refreshEPG();
      setNewUrl('');
    } catch (error) {
      console.error('Error handling URL:', error);
      ToastAndroid.show('An error occurred while handling the URL', ToastAndroid.SHORT);
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
    <View style={styles.container}>
      <Text style={styles.header}>Manage EPG URLs</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter EPG URL"
        value={newUrl}
        onChangeText={setNewUrl}
        onFocus={() => setEditIndex(null)}
        placeholderTextColor="#A5A5A5" 
      />
      <TouchableOpacity style={styles.button} onPress={handleAddOrEditUrl} disabled={isTesting}>
        {isTesting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>{editIndex !== null ? 'Edit URL' : 'Add URL'}</Text>
        )}
      </TouchableOpacity>
      {epgUrls.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyState}>
            No EPG URLs available. Please add a valid URL to ensure accurate EPG data!
          </Text>
          {lastUpdated && (
            <Text style={styles.lastUpdatedText}>
              Last updated: {lastUpdated.toLocaleString()}
            </Text>
          )}
        </View>
      ) : (
        <FlatList
          data={epgUrls}
          keyExtractor={(item) => item.url}
          renderItem={renderItem}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#121212',
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 20,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  input: {
    height: 50,
    borderColor: '#444', 
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    color: '#FFFFFF',
    backgroundColor: '#1E1E1E',
  },
  button: {
    backgroundColor: '#BB86FC', 
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    marginVertical: 8,
    padding: 15,
    elevation: 3,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  urlText: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
  },
  inactiveText: {
    color: '#A5A5A5',
    textDecorationLine: 'line-through', 
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    marginLeft: 15,
  },
  deleteButton: { 
    padding: 5, 
    borderRadius: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyState: {
    textAlign: 'center',
    color: '#A5A5A5',
    fontSize: 16,
    marginBottom: 10,
  },
  lastUpdatedText: {
    color: '#B0BEC5',
    marginTop: 5,
  },
});

export default EditEpg;