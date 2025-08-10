import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { ExpoPlayAudioStream } from "@irvingouj/expo-audio-stream";
import { turnId1 } from "../utils/audio";

export default function PlaybackControlScreen() {
  const [operationStatus, setOperationStatus] = useState('Ready');

  const handlePauseAudio = async () => {
    try {
      setOperationStatus('Pausing audio...');
      await ExpoPlayAudioStream.pauseAudio();
      setOperationStatus('Audio paused');
      Alert.alert('Success', 'Audio playback paused');
    } catch (error) {
      setOperationStatus('Error pausing audio');
      Alert.alert('Error', `Failed to pause audio: ${error}`);
    }
  };

  const handleClearTurnId1 = async () => {
    try {
      setOperationStatus('Clearing turnId1 queue...');
      await ExpoPlayAudioStream.clearPlaybackQueueByTurnId(turnId1);
      setOperationStatus('turnId1 queue cleared');
      Alert.alert('Success', `Cleared playback queue for ${turnId1}`);
    } catch (error) {
      setOperationStatus('Error clearing queue');
      Alert.alert('Error', `Failed to clear queue: ${error}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Playback Control</Text>
      <Text style={styles.description}>
        Control audio playback with pause functionality and queue management.
        Test these controls while audio is playing from other test pages.
      </Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.pauseButton]}
          onPress={handlePauseAudio}
        >
          <Text style={styles.buttonText}>Pause Audio</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.clearButton]}
          onPress={handleClearTurnId1}
        >
          <Text style={styles.buttonText}>Clear {turnId1} Queue</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.status}>
        <Text style={styles.statusText}>Status: {operationStatus}</Text>
      </View>
      
      <View style={styles.info}>
        <Text style={styles.infoTitle}>Control Functions:</Text>
        <Text style={styles.infoText}>• Pause Audio: Stops all current playback</Text>
        <Text style={styles.infoText}>• Clear Queue: Removes queued audio for specific turn ID</Text>
        <Text style={styles.infoText}>• Turn ID: {turnId1} (used by Sample B playback)</Text>
      </View>

      <View style={styles.instructions}>
        <Text style={styles.instructionsTitle}>How to Test:</Text>
        <Text style={styles.instructionsText}>
          1. Go to "Play Sample B" and start playback{'\n'}
          2. Return here and test "Pause Audio"{'\n'}
          3. Start more audio and test "Clear Queue"{'\n'}
          4. Observe the behavior in console logs
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
    lineHeight: 22,
  },
  buttonContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
    minWidth: 200,
  },
  pauseButton: {
    backgroundColor: '#FD7E14',
  },
  clearButton: {
    backgroundColor: '#DC3545',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  status: {
    alignItems: 'center',
    marginBottom: 20,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  info: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  instructions: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  instructionsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});