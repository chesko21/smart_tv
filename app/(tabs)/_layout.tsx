import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../constants/Colors";

export default function TabsLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: Colors.primary,
                tabBarInactiveTintColor: "#888",
                tabBarStyle: {
                    backgroundColor: Colors.background,
                    borderTopWidth: 1,
                    borderTopColor: "#bbb",
                    height: 50,
                    paddingBottom: 5,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "Home",
                    tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="Vod"
                options={{
                    title: "VOD",
                    tabBarIcon: ({ color, size }) => <Ionicons name="videocam" size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="LiveTv"
                options={{
                    title: "Live TV",
                    tabBarIcon: ({ color, size }) => <Ionicons name="tv" size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="PlayerScreen"
                options={{
                    title: "Vidio",
                    tabBarIcon: ({ color, size }) => <Ionicons name="laptop" size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="Profile"
                options={{
                    title: "Profile",
                    tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
                }}
            />
        </Tabs>
    );
}
