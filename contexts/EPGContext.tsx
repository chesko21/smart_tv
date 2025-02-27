import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * @typedef {Object} EPGContextType
 * @property {Array<{url: string, active: boolean}>} epgUrls
 * @property {Array<string>} defaultEpgUrls
 * @property {() => Promise<void>} refreshEPG
 */

// Define multiple default EPG URLs
const defaultEpgUrls = [
  "https://www.open-epg.com/files/indonesia4.xml",
  "https://raw.githubusercontent.com/AqFad2811/epg/main/indonesia.xml"
]; 

const EPGContext = createContext({
  epgUrls: [],
  defaultEpgUrls,
  refreshEPG: async () => {},
});

export const EPGProvider = ({ children }: { children: React.ReactNode; }) => {
  const [epgUrls, setEpgUrls] = useState([]);

  const refreshEPG = async () => {
    try {
      const storedUrls = await AsyncStorage.getItem('epgUrls');
      const initialUrls = defaultEpgUrls.map(url => ({ url, active: true }));
      const storedUrlsArray = storedUrls ? JSON.parse(storedUrls) : [];

      // Normalize GitHub URLs to prevent duplicates
      const normalizeUrl = (url: string) => {
        return url.replace('/refs/heads/main/', '/main/');
      };

      // Combine and deduplicate URLs
      const allUrls = [...initialUrls, ...storedUrlsArray];
      const uniqueUrls = Array.from(
        new Map(
          allUrls.map(item => [normalizeUrl(item.url), item])
        ).values()
      );

      setEpgUrls(uniqueUrls);
      await AsyncStorage.setItem('epgUrls', JSON.stringify(uniqueUrls));
    } catch (error) {
      console.error('Failed to refresh EPG:', error);
    }
  };

  useEffect(() => {
    refreshEPG();
  }, []);

  return (
    <EPGContext.Provider value={{ epgUrls, defaultEpgUrls, refreshEPG }}>
      {children}
    </EPGContext.Provider>
  );
};

export const useEPG = () => useContext(EPGContext);