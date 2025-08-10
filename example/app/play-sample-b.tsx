import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { ExpoPlayAudioStream } from "@irvingouj/expo-audio-stream";
import { sampleB } from "../samples/sample-b";
import { turnId1 } from "../utils/audio";

export default function PlaySampleBScreen() {
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlaySampleB = async () => {
    try {
      setIsPlaying(true);
      await ExpoPlayAudioStream.playAudio(sampleB, turnId1);
      Alert.alert('Success', 'Sample B started playing');
    } catch (error) {
      Alert.alert('Error', `Failed to play sample: ${error}`);
    } finally {
      setIsPlaying(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Play Sample B Test</Text>
      <Text style={styles.description}>
        This test plays audio using the playAudio method with Sample B data.
        It uses turnId1 for queue management.
      </Text>
      
      <TouchableOpacity
        style={[styles.button, isPlaying && styles.buttonDisabled]}
        onPress={handlePlaySampleB}
        disabled={isPlaying}
      >
        <Text style={styles.buttonText}>
          {isPlaying ? 'Playing...' : 'Play Sample B'}
        </Text>
      </TouchableOpacity>
      
      <View style={styles.info}>
        <Text style={styles.infoTitle}>Test Details:</Text>
        <Text style={styles.infoText}>• Uses ExpoPlayAudioStream.playAudio()</Text>
        <Text style={styles.infoText}>• Turn ID: {turnId1}</Text>
        <Text style={styles.infoText}>• Sample: Binary audio data (Sample B)</Text>
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
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 30,
  },
  buttonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  info: {
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
});