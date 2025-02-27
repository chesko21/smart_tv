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
  "https://raw.githubusercontent.com/AqFad2811/epg/main/indonesia.xml",
  "https://www.open-epg.com/files/indonesia1.xml",
  "https://www.open-epg.com/files/indonesia3.xml",
  "https://www.open-epg.com/files/sportspremium1.xml"
]; 

const EPGContext = createContext({
  epgUrls: [],
  defaultEpgUrls,
  refreshEPG: async () => {},
});

/**
 * @param {Object} props
 * @param {React.ReactNode} props.children
 */
export const EPGProvider = ({ children }: { children: React.ReactNode; }) => {
  /** @type {[Array<{url: string, active: boolean}>, Function]} */
  const [epgUrls, setEpgUrls] = useState([]);

  const refreshEPG = async () => {
    try {
      const storedUrls = await AsyncStorage.getItem('epgUrls');
      
      const initialUrls = defaultEpgUrls.map(url => ({ url, active: true }));

      const uniqueStoredUrls = storedUrls ? JSON.parse(storedUrls) : [];
      
      const combinedUrls = [...initialUrls, ...uniqueStoredUrls];
      const uniqueUrls = Array.from(new Set(combinedUrls.map(item => item.url)))
        .map(url => ({ url, active: true }));

      setEpgUrls(uniqueUrls);
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