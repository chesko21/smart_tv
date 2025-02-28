import React, { useRef, useState } from 'react';
import { View, StyleSheet, Animated, PanResponder, Dimensions, TouchableOpacity } from 'react-native';
import VideoPlayer from './VideoPlayer';
import { usePip } from '../contexts/PipContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const FloatingPipPlayer = () => {
  const { isInPipMode, pipUrl, pipChannel, setPipMode } = usePip();
  const [pipPosition, setPipPosition] = useState({ x: SCREEN_WIDTH - 200, y: SCREEN_HEIGHT - 150 }); // Default position
  const draggedPosition = useRef(new Animated.ValueXY(pipPosition)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        draggedPosition.setOffset({ x: pipPosition.x, y: pipPosition.y });
        draggedPosition.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [
          null,
          { dx: draggedPosition.x, dy: draggedPosition.y }
        ],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, gestureState) => {
        const newX = Math.min(
          Math.max(draggedPosition.x._offset + gestureState.dx, 0),
          SCREEN_WIDTH - 200 // Keep it within screen bounds
        );
        const newY = Math.min(
          Math.max(draggedPosition.y._offset + gestureState.dy, 0),
          SCREEN_HEIGHT - 150 // Keep it within screen bounds
        );

        setPipPosition({ x: newX, y: newY });
        draggedPosition.setOffset({ x: newX, y: newY });
        draggedPosition.setValue({ x: 0, y: 0 });
      },
    })
  ).current;

  const handlePipModeChange = (isInPip: boolean) => {
    setPipMode(isInPip);
  };

  const handlePress = () => {
    setPipMode(false); 
  };

  // New default implementations for onLoadStart, onLoad, and onErrorts
  const handleLoadStart = () => {
    console.log('Load started');
  };
  
  const handleLoad = () => {
    console.log('Load completed');
  };
  
  const handleError = () => {
    console.log('Error occurred');
  };

  if (!isInPipMode || !pipUrl) return null;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.pipContainer,
        {
          transform: [
            { translateX: draggedPosition.x },
            { translateY: draggedPosition.y },
          ],
        },
      ]}
    >
      <TouchableOpacity onPress={handlePress} style={styles.pipVideoContainer}>
        <VideoPlayer
          url={pipUrl}
          channel={pipChannel}
          paused={false}
          style={styles.pipVideoContainer}
          onLoadStart={handleLoadStart}
          onLoad={handleLoad}
          onError={handleError}
          onPipModeChange={handlePipModeChange}
        />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  pipContainer: {
    position: 'absolute',
    width: 180,
    height: 120,
    zIndex: 999999,
    backgroundColor: '#000',
    borderRadius: 8,
    borderColor: "#fff",
    borderWidth: 2,
    elevation: 5,
    shadowOpacity: 0.3,
  },
  pipVideoContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    overflow: 'hidden',
  },
});

export default FloatingPipPlayer;