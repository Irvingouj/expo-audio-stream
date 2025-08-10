import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { ExpoPlayAudioStream, AudioDataEvent } from "@irvingouj/expo-audio-stream";
import { EventSubscription } from "expo-modules-core";
import { 
  requestMicrophonePermission, 
  isMicrophonePermissionGranted,
  CHANNELS,
  ENCODING,
  RECORDING_INTERVAL
} from "../utils/audio";
import { VolumeMeter } from "../components/VolumeMeter";
import { useVolumeMeter } from "../hooks/useVolumeMeter";

export default function SixteenKhzRecordingScreen() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState('');
  const eventListenerSubscriptionRef = useRef<EventSubscription | undefined>(undefined);
  const { volume, rawSoundLevel, updateVolume, resetVolume } = useVolumeMeter();

  const onAudioCallback = async (audio: AudioDataEvent) => {
    console.log('16kHz sample rate:', audio.soundLevel);
    updateVolume(audio);
  };

  const handleStartRecording = async () => {
    try {
      if (!(await isMicrophonePermissionGranted())) {
        const permissionGranted = await requestMicrophonePermission();
        if (!permissionGranted) {
          Alert.alert('Error', 'Microphone permission is required');
          return;
        }
      }

      // Test with specific 16kHz sample rate (for ML models)
      const { recordingResult, subscription } = await ExpoPlayAudioStream.startMicrophone({
        interval: RECORDING_INTERVAL,
        sampleRate: 16000,
        channels: CHANNELS,
        encoding: ENCODING,
        onAudioStream: onAudioCallback,
      });

      console.log('16kHz sample rate:', JSON.stringify(recordingResult, null, 2));
      eventListenerSubscriptionRef.current = subscription;
      setIsRecording(true);
      setRecordingStatus(JSON.stringify(recordingResult, null, 2));
      Alert.alert('Success', 'Microphone streaming started with 16kHz sample rate');
    } catch (error) {
      Alert.alert('Error', `Failed to start microphone: ${error}`);
    }
  };

  const handleStopRecording = async () => {
    try {
      await ExpoPlayAudioStream.stopMicrophone();
      if (eventListenerSubscriptionRef.current) {
        eventListenerSubscriptionRef.current.remove();
        eventListenerSubscriptionRef.current = undefined;
      }
      setIsRecording(false);
      setRecordingStatus('');
      resetVolume();
      Alert.alert('Success', 'Microphone streaming stopped');
    } catch (error) {
      Alert.alert('Error', `Failed to stop microphone: ${error}`);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
      <Text style={styles.title}>16kHz Microphone Streaming</Text>
      <Text style={styles.description}>
        This test forces microphone streaming at 16kHz sample rate, which is commonly
        used for machine learning models and speech recognition.
      </Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.startButton, isRecording && styles.buttonDisabled]}
          onPress={handleStartRecording}
          disabled={isRecording}
        >
          <Text style={styles.buttonText}>Start Microphone</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.stopButton, !isRecording && styles.buttonDisabled]}
          onPress={handleStopRecording}
          disabled={!isRecording}
        >
          <Text style={styles.buttonText}>Stop Microphone</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.status}>
        <Text style={styles.statusText}>
          Status: {isRecording ? 'Streaming at 16kHz...' : 'Not Streaming'}
        </Text>
      </View>

      <VolumeMeter volume={volume} isActive={isRecording} rawSoundLevel={rawSoundLevel} />
      
      <View style={styles.info}>
        <Text style={styles.infoTitle}>Test Details:</Text>
        <Text style={styles.infoText}>• Sample Rate: 16,000Hz (forced)</Text>
        <Text style={styles.infoText}>• Channels: {CHANNELS}</Text>
        <Text style={styles.infoText}>• Encoding: {ENCODING}</Text>
        <Text style={styles.infoText}>• Interval: {RECORDING_INTERVAL}ms</Text>
        <Text style={styles.infoText}>• Purpose: ML/Speech recognition optimized</Text>
      </View>

      {recordingStatus ? (
        <View style={styles.result}>
          <Text style={styles.resultTitle}>16kHz Microphone Streaming Result:</Text>
          <Text style={styles.resultText}>{recordingStatus}</Text>
        </View>
      ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
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
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 10,
    alignItems: 'center',
    minWidth: 120,
  },
  startButton: {
    backgroundColor: '#6F42C1',
  },
  stopButton: {
    backgroundColor: '#DC3545',
  },
  buttonDisabled: {
    backgroundColor: '#CCCCCC',
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
  result: {
    backgroundColor: '#fff',
    padding: 15,
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
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  resultText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
});