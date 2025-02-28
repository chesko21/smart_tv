import React, { useState, useCallback, useEffect } from "react";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { Ionicons } from "@expo/vector-icons";
import HomeScreen from "./HomeScreen";
import VodScreen from "./VodScreen";
import LiveTvScreen from "./LiveTvScreen";
import PlayerScreen from "./PlayerScreen";
import useM3uParse from '../../hooks/M3uParse';

import Colors from "../../constants/Colors";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StyleSheet, View, Text, Image, TouchableOpacity, SafeAreaView, BackHandler } from 'react-native';
import { useFocusEffect, CommonActions } from '@react-navigation/native';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { EventEmitter } from 'events';

export const userUpdateEmitter = new EventEmitter();

const Drawer = createDrawerNavigator();
const Tab = createBottomTabNavigator();

const ProfileScreen = React.lazy(() => import('./ProfileScreen'));
const EditUrl = React.lazy(() => import('./EditUrl'));
const SearchScreen = React.lazy(() => import('./SearchScreen'));
const EditEpg = React.lazy(() => import('./EditEpg'));

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: "#888",
        tabBarStyle: {
          backgroundColor: Colors.background,
          borderTopWidth: 1,
          borderTopColor: "#bbb",
          height: 55,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
        },
      }}
    >
      <Tab.Screen
        name="HomeScreen"
        component={HomeScreen}
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="VodScreen"
        component={VodScreen}
        options={{
          title: "VOD",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="videocam" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="LiveTvScreen"
        component={LiveTvScreen}
        options={{
          title: "Live TV",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="tv" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="PlayerScreen"
        component={PlayerScreen}
        options={{
          title: 'Player',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="play" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileScreen"
        component={ProfileScreen}
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function DrawerNavigator() {
  const {
    refetch,
    loadActiveUrl,
  } = useM3uParse();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const activeUrl = await loadActiveUrl();
        if (activeUrl) {
          refetch();
        } else {
          console.log("No active URL found.");
        }
      } catch (error) {
        console.error("Failed to load active URL:", error);
      }
    };

    fetchData();
  }, [loadActiveUrl, refetch]);

  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: Colors.background,
          width: 250,
        },
        drawerActiveTintColor: Colors.primary,
        drawerInactiveTintColor: Colors.text,
        drawerLabelStyle: {
          fontSize: 16,
          marginLeft: -10,
        },
        drawerItemStyle: {
          borderRadius: 8,
          marginVertical: 4,
        },
      }}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      <Drawer.Screen
        name="Home"
        component={HomeTabs}
        options={{
          drawerIcon: ({ color }) => (
            <Ionicons name="home" size={22} color={color || Colors.primary} />
          ),
        }}
      />
      <Drawer.Screen
        name="EditUrl"
        component={EditUrl}
        options={{
          drawerIcon: ({ color }) => (
            <Ionicons name="unlink" size={22} color={color || Colors.primary} />
          ),
        }}
      />
      <Drawer.Screen
        name="EditEpg"
        component={EditEpg}
        options={{
          drawerIcon: ({ color }) => (
            <Ionicons name="list" size={22} color={color || Colors.primary} />
          ),
        }}
      />
      <Drawer.Screen
        name="SearchScreen"
        component={SearchScreen}
        options={{
          title: "Search",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="search" size={22} color={color || Colors.primary} />
          ),
        }}
      />
    </Drawer.Navigator>
  );
}

const CustomDrawerContent = React.memo((props) => {
  const { navigation } = props;
  const [user, setUser] = useState({ username: 'Guest', avatar: null });
  const [avatarError, setAvatarError] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const loadUserData = async () => {
        try {
          const storedUser = await AsyncStorage.getItem('user');
          if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            setAvatarError(false);
          }
        } catch (e) {
          console.error("Failed to load user data from storage", e);
        }
      };

      const handleUserUpdate = () => {
        loadUserData();
      };

      userUpdateEmitter.on('userUpdate', handleUserUpdate);
      loadUserData();

      return () => {
        userUpdateEmitter.removeListener('userUpdate', handleUserUpdate);
      };
    }, [])
  );

  const handleAvatarError = () => {
    setAvatarError(true);
  };

  const handleExitApp = () => {
    BackHandler.exitApp();
  };

  const handleNavigation = (routeName: string) => {
    if (routeName === 'Home') {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        })
      );
    } else {
      navigation.navigate(routeName);
    }
    navigation.closeDrawer();
  };

  const defaultAvatar = require("../../assets/images/ic_launcher.png");
  const avatarSource = avatarError || !user?.avatar ? defaultAvatar : { uri: user.avatar };

  return (
    <SafeAreaView style={styles.drawerContainer}>
      <View style={styles.drawerHeader}>
        <Image
          source={avatarSource}
          style={styles.drawerAvatar}
          onError={handleAvatarError}
        />
        <Text style={styles.drawerUsername}>{user.username}</Text>
      </View>
      <View style={styles.drawerContent}>
        {props.state.routes.map((route: { key: React.Key | null | undefined; name: string; }) => (
          <TouchableOpacity
            key={route.key}
            style={styles.drawerItem}
            onPress={() => handleNavigation(route.name)}
          >
            <View style={styles.drawerItemContent}>
              <Ionicons
                name={props.descriptors[route.key].options.drawerIcon({ color: Colors.text, size: 22 }).props.name}
                size={22}
                color={Colors.text}
                style={styles.drawerItemIcon}
              />
              <Text style={styles.drawerItemText}>{props.descriptors[route.key].options.title || route.name}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={styles.exitButton} onPress={handleExitApp}>
        <Ionicons name="exit" size={22} color={Colors.text} style={styles.exitIcon} />
        <Text style={styles.exitText}>Exit App</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  drawerHeader: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    alignItems: 'center',
  },
  drawerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 40,
    marginBottom: 10,
    backgroundColor: '#ccc',
  },
  drawerUsername: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  drawerContent: {
    flex: 1,
  },
  drawerItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  drawerItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  drawerItemIcon: {
    marginRight: 16,
  },
  drawerItemText: {
    fontSize: 16,
    color: Colors.text,
  },
  exitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  exitIcon: {
    marginRight: 16,
  },
  exitText: {
    fontSize: 16,
    color: Colors.text,
  },
});

export default DrawerNavigator;