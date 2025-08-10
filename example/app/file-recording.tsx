import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Platform } from 'react-native';
import { ExpoPlayAudioStream, AudioDataEvent, AudioRecording } from "@irvingouj/expo-audio-stream";
import { EventSubscription } from "expo-modules-core";
import { useAudioPlayer } from 'expo-audio';
import { 
  requestMicrophonePermission, 
  isMicrophonePermissionGranted,
  ANDROID_SAMPLE_RATE,
  IOS_SAMPLE_RATE,
  CHANNELS,
  ENCODING,
  RECORDING_INTERVAL
} from "../utils/audio";
import { VolumeMeter } from "../components/VolumeMeter";
import { useVolumeMeter } from "../hooks/useVolumeMeter";

export default function FileRecordingScreen() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingResult, setRecordingResult] = useState<AudioRecording | null>(null);
  const [playbackStatus, setPlaybackStatus] = useState<string>('');
  
  const eventListenerSubscriptionRef = useRef<EventSubscription | undefined>(undefined);
  const [audioPlayerSource, setAudioPlayerSource] = useState<string | null>(null);
  const player = useAudioPlayer(audioPlayerSource || '');
  const { volume, rawSoundLevel, updateVolume, resetVolume } = useVolumeMeter();

  const onAudioCallback = async (audio: AudioDataEvent) => {
    console.log('File recording volume:', audio.soundLevel);
    updateVolume(audio);
  };

  // Monitor player state
  useEffect(() => {
    if (player.playing) {
      setIsPlaying(true);
      setPlaybackStatus('Playing...');
    } else {
      if (isPlaying) { // Was playing but now stopped
        setIsPlaying(false);
        setPlaybackStatus('Playback finished');
      }
    }
  }, [player.playing]);

  const handleStartRecording = async () => {
    try {
      if (!(await isMicrophonePermissionGranted())) {
        const permissionGranted = await requestMicrophonePermission();
        if (!permissionGranted) {
          Alert.alert('Error', 'Microphone permission is required');
          return;
        }
      }

      const { recordingResult: result, subscription } = await ExpoPlayAudioStream.startRecording({
        interval: RECORDING_INTERVAL,
        onAudioStream: onAudioCallback,
      });

      console.log('Recording started:', JSON.stringify(result, null, 2));
      eventListenerSubscriptionRef.current = subscription;
      setIsRecording(true);
      setRecordingResult(null); // Clear previous recording
    } catch (error) {
      Alert.alert('Error', `Failed to start recording: ${error}`);
    }
  };

  const handleStopRecording = async () => {
    try {
      const recording = await ExpoPlayAudioStream.stopRecording();
      
      if (eventListenerSubscriptionRef.current) {
        eventListenerSubscriptionRef.current.remove();
        eventListenerSubscriptionRef.current = undefined;
      }
      
      setIsRecording(false);
      setRecordingResult(recording);
      resetVolume();
      
      console.log('Recording stopped:', JSON.stringify(recording, null, 2));
    } catch (error) {
      Alert.alert('Error', `Failed to stop recording: ${error}`);
    }
  };

  const handlePlayRecording = async () => {
    if (!recordingResult?.fileUri) {
      Alert.alert('Error', 'No recording available to play');
      return;
    }

    try {
      setPlaybackStatus('Loading...');
      
      // Set the audio source and play
      setAudioPlayerSource(recordingResult.fileUri);
      // Give the player a moment to initialize with the new source
      setTimeout(() => {
        player.play();
      }, 100);
    } catch (error) {
      setIsPlaying(false);
      setPlaybackStatus('Playback failed');
      Alert.alert('Error', `Failed to play recording: ${error}`);
    }
  };

  const handleStopPlayback = async () => {
    try {
      player.pause();
      setIsPlaying(false);
      setPlaybackStatus('Playback stopped');
    } catch (error) {
      Alert.alert('Error', `Failed to stop playback: ${error}`);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>File-Based Recording</Text>
        <Text style={styles.description}>
          This test demonstrates file-based recording using startRecording().
          Records to a file, then plays it back using expo-audio.
        </Text>
        
        {/* Recording Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recording</Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.startButton, isRecording && styles.buttonDisabled]}
              onPress={handleStartRecording}
              disabled={isRecording}
            >
              <Text style={styles.buttonText}>Start Recording</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.stopButton, !isRecording && styles.buttonDisabled]}
              onPress={handleStopRecording}
              disabled={!isRecording}
            >
              <Text style={styles.buttonText}>Stop Recording</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.status}>
            <Text style={styles.statusText}>
              Status: {isRecording ? 'Recording to file...' : 'Not Recording'}
            </Text>
          </View>

          {isRecording && <VolumeMeter volume={volume} isActive={isRecording} rawSoundLevel={rawSoundLevel} />}
        </View>

        {/* Playback Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Playback</Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.playButton, (!recordingResult || isRecording || isPlaying) && styles.buttonDisabled]}
              onPress={handlePlayRecording}
              disabled={!recordingResult || isRecording || isPlaying}
            >
              <Text style={styles.buttonText}>Play Recording</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.stopButton, !isPlaying && styles.buttonDisabled]}
              onPress={handleStopPlayback}
              disabled={!isPlaying}
            >
              <Text style={styles.buttonText}>Stop Playback</Text>
            </TouchableOpacity>
          </View>

          {playbackStatus && (
            <View style={styles.status}>
              <Text style={styles.statusText}>{playbackStatus}</Text>
            </View>
          )}
        </View>

        {/* Recording Info */}
        {recordingResult && (
          <View style={styles.info}>
            <Text style={styles.infoTitle}>Last Recording:</Text>
            <Text style={styles.infoText}>• File: {recordingResult.filename}</Text>
            <Text style={styles.infoText}>• Duration: {(recordingResult.durationMs / 1000).toFixed(1)}s</Text>
            <Text style={styles.infoText}>• Size: {(recordingResult.size / 1024).toFixed(1)} KB</Text>
            <Text style={styles.infoText}>• Sample Rate: {recordingResult.sampleRate}Hz</Text>
            <Text style={styles.infoText}>• Channels: {recordingResult.channels}</Text>
            <Text style={styles.infoText}>• Bit Depth: {recordingResult.bitDepth}-bit</Text>
            <Text style={styles.infoText}>• MIME Type: {recordingResult.mimeType}</Text>
          </View>
        )}

        {/* Technical Details */}
        <View style={styles.info}>
          <Text style={styles.infoTitle}>Recording Details:</Text>
          <Text style={styles.infoText}>• Method: ExpoPlayAudioStream.startRecording()</Text>
          <Text style={styles.infoText}>• Sample Rate: {Platform.OS === "ios" ? IOS_SAMPLE_RATE : ANDROID_SAMPLE_RATE}Hz</Text>
          <Text style={styles.infoText}>• Channels: {CHANNELS}</Text>
          <Text style={styles.infoText}>• Encoding: {ENCODING}</Text>
          <Text style={styles.infoText}>• Interval: {RECORDING_INTERVAL}ms</Text>
          <Text style={styles.infoText}>• Output: Audio file with metadata</Text>
        </View>
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
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
    textAlign: 'center',
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
    backgroundColor: '#28A745',
  },
  stopButton: {
    backgroundColor: '#DC3545',
  },
  playButton: {
    backgroundColor: '#007AFF',
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
});