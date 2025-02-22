// QuickMenu.js
import React, { useRef, useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Animated,
  FlatList,
  TouchableOpacity,
  Image,
  Text,
  PanResponder,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";

const quickMenuItems = [
  {
    name: "Lihat Jadwal",
    icon: "https://thumbor.prod.vidiocdn.com/EchjgZzDLbXT_by4Xtl3GosFxdE=/168x168/...",
    link: "schedule",
  },
  {
    name: "Daftar Channel",
    icon: "https://thumbor.prod.vidiocdn.com/nM7ycXrJE1IJrhU3dtEP8R2tzII=/168x168/...",
    link: "/LiveTv",
  },
  // Add more menu items as needed
];

const QuickMenu = ({ isFullScreen }) => {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState(new Animated.Value(0)); // 0: closed, 1: open
  const [menuWidth, setMenuWidth] = useState(0);

  const screenWidth = Dimensions.get("window").width;

  const toggleMenu = () => {
    Animated.spring(menuPosition, {
      toValue: isMenuOpen ? 0 : 1,
      useNativeDriver: false, 
    }).start();
    setIsMenuOpen(!isMenuOpen);
  };

  const menuTranslateX = menuPosition.interpolate({
    inputRange: [0, 1],
    outputRange: [screenWidth, 0],
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt, gestureState) => true,
      onPanResponderMove: (evt, gestureState) => {
        const dragAmount = gestureState.dx;
        if (isMenuOpen && dragAmount < 0) { 
          setMenuPosition(new Animated.Value(Math.max(0, 1 + dragAmount / screenWidth)));
        }
        if (!isMenuOpen && dragAmount > 0) { 
          setMenuPosition(new Animated.Value(Math.min(1, dragAmount / screenWidth)));
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        const dragAmount = gestureState.dx;
        if (isMenuOpen && dragAmount < -50) { 
          toggleMenu();
        } else if (!isMenuOpen && dragAmount > 50) { 
          toggleMenu();
        } else { 
            Animated.spring(menuPosition, {
                toValue: isMenuOpen ? 1 : 0,
                useNativeDriver: false,
            }).start();
        }
      },
    })
  ).current;

  const handleMenuPress = (item) => {
  
    toggleMenu(); 
    router.push(item.link === "schedule" ? "./Schedule" : item.link);
  };

  
  useEffect(() => {
    const numColumns = 4; 
    const horizontalPadding = 20;  
    const itemMargin = 10 * 2; 
    const iconSize = 60 + 5 * 2;
    const itemWidth = 80;
    const calculatedMenuWidth = numColumns * itemWidth + horizontalPadding +  itemMargin * numColumns + iconSize;
    setMenuWidth(calculatedMenuWidth);
  }, []);

  return (
    <Animated.View
      style={[
        styles.menuContainer,
        {
          transform: [{ translateX: menuTranslateX }],
          width: menuWidth,
          //position: 'absolute', // Changed back to absolute
          top: isFullScreen ? 50 : 10, // Adjust top based on fullscreen
          right: 0, // Menu slides from the right
          zIndex: 10,  // Ensure it's above other content.
          opacity: isMenuOpen ? 1 : 0,  // Added opacity
          // Remove overflow: 'hidden',  // Removed overflow
        },
      ]}
      {...panResponder.panHandlers}
    >
      {/* Add a button or area to close/open the menu */}
      <TouchableOpacity style={styles.menuHeader} onPress={toggleMenu}>
        <Text style={styles.menuHeaderText}>{isMenuOpen ? "Tutup" : "Menu"}</Text>
      </TouchableOpacity>
      {isMenuOpen && (
        <FlatList
          data={quickMenuItems}
          numColumns={4} // Adjust as needed
          keyExtractor={(item, index) => String(index)}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuPress(item)}
            >
              <Image source={{ uri: item.icon }} style={styles.menuIcon} />
              <Text style={styles.menuText}>{item.name}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  menuContainer: {
    backgroundColor: "rgba(0, 0, 0, 0.8)", // Semi-transparent background
    borderRadius: 8,
    // padding: 10, // Removed because it's not needed
    // width: 300, // Set the width to the desired value
    // position: "absolute", // Keep absolute for overlay
    // top: 20, // Adjusted for fullscreen
    // right: 20,  // Menu slides from the right

  },
  menuHeader: {
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  menuHeaderText: {
    color: "#fff",
    fontSize: 16,
  },
  menuItem: {
    alignItems: "center",
    margin: 5,
    width: 80, // or dynamic value
  },
  menuIcon: {
    width: 60,
    height: 60,
    borderRadius: 10,
  },
  menuText: {
    color: "#fff",
    fontSize: 12,
    textAlign: "center",
    marginTop: 5,
  },
});

export default QuickMenu;