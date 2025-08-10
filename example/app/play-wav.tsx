import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { ExpoPlayAudioStream } from "@irvingouj/expo-audio-stream";
import { sampleC } from "../samples/sample-c";

export default function PlayWavScreen() {
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayWav = async () => {
    try {
      setIsPlaying(true);
      await ExpoPlayAudioStream.playWav(sampleC);
      Alert.alert('Success', 'WAV fragment started playing');
    } catch (error) {
      Alert.alert('Error', `Failed to play WAV: ${error}`);
    } finally {
      setIsPlaying(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Play WAV Fragment Test</Text>
      <Text style={styles.description}>
        This test plays a WAV audio file using the playWav method.
        It supports standard WAV format with proper headers.
      </Text>
      
      <TouchableOpacity
        style={[styles.button, isPlaying && styles.buttonDisabled]}
        onPress={handlePlayWav}
        disabled={isPlaying}
      >
        <Text style={styles.buttonText}>
          {isPlaying ? 'Playing...' : 'Play WAV Fragment'}
        </Text>
      </TouchableOpacity>
      
      <View style={styles.info}>
        <Text style={styles.infoTitle}>Test Details:</Text>
        <Text style={styles.infoText}>• Uses ExpoPlayAudioStream.playWav()</Text>
        <Text style={styles.infoText}>• Format: WAV file with headers</Text>
        <Text style={styles.infoText}>• Sample: Binary WAV data (Sample C)</Text>
        <Text style={styles.infoText}>• No turn ID required</Text>
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
    backgroundColor: '#FFC107',
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
    color: '#333',
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