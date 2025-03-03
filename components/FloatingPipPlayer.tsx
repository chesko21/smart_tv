import React, { useState, useRef } from 'react';
import { View, StyleSheet, Dimensions, PanResponder, TouchableOpacity, Text } from 'react-native';
import VideoPlayer from './VideoPlayer';
import { usePip } from '../contexts/PipContext';
import Icon from "@expo/vector-icons/MaterialIcons"; 

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const FloatingPipPlayer = () => {
  const { isInPipMode, pipUrl, pipChannel, setPipMode } = usePip();
  const [pipPosition, setPipPosition] = useState({ x: SCREEN_WIDTH - 220, y: SCREEN_HEIGHT - 180 }); // Adjusted for padding
  const isDragging = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        isDragging.current = true;
      },
      onPanResponderMove: (event, gestureState) => {
        if (isDragging.current) {
          const newX = Math.min(
            Math.max(pipPosition.x + gestureState.dx, 0),
            SCREEN_WIDTH - 200 
          );
          const newY = Math.min(
            Math.max(pipPosition.y + gestureState.dy, 0),
            SCREEN_HEIGHT - 160 
          );
          setPipPosition({ x: newX, y: newY });
        }
      },
      onPanResponderRelease: () => {
        isDragging.current = false;
      },
    })
  ).current;

  const handlePress = () => {
    setPipMode(false);
  };

  const handleLoadStart = () => console.log('Load started');
  const handleLoad = () => console.log('Load completed');
  const handleError = () => console.log('Error occurred');

  if (!isInPipMode || !pipUrl) return null;

  return (
    <View
      {...panResponder.panHandlers}
      style={[
        styles.pipContainer,
        {
          left: pipPosition.x,
          top: pipPosition.y,
        },
      ]}
    >
      <TouchableOpacity style={styles.pipVideoContainer}>
        <VideoPlayer
          url={pipUrl}
          channel={pipChannel}
          paused={false}
          style={styles.videoCentered}
          onLoadStart={handleLoadStart}
          onLoad={handleLoad}
          onError={handleError}
        />

        <View style={styles.overlay}>
          <Text style={styles.channelText}>
            {pipChannel?.name || "Live Channel"} 
          </Text>
          <TouchableOpacity style={styles.closeButton} onPress={handlePress}>
            <Icon name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  pipContainer: {
    position: 'absolute',
    width: 200,
    height: 180, 
    backgroundColor: '#000',
    borderRadius: 4,
    borderColor: '#fff',
    borderWidth: 2,
    elevation: 5,
    shadowOpacity: 0.3,
    zIndex: 999999,
    overflow: 'hidden',
  },
  pipVideoContainer: {
    flex: 1,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative', 
  },
  videoCentered: {
    width: '100%',
    height: '100%',
    alignItems: 'center', 
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 10,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', 
    padding: 4,
  },
  channelText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
});

export default FloatingPipPlayer;
