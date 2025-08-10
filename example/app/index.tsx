import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Link } from 'expo-router';

const tests = [
  {
    href: '/play-sample-b',
    title: 'Play Sample B',
    description: 'Test audio playback with Sample B'
  },
  {
    href: '/play-sample-a',
    title: 'Play Sample A',
    description: 'Test sound playback with Sample A'
  },
  {
    href: '/play-wav',
    title: 'Play WAV Fragment',
    description: 'Test WAV file playback'
  },
  {
    href: '/recording',
    title: 'Realtime Microphone Streaming',
    description: 'Basic realtime microphone streaming functionality'
  },
  {
    href: '/hardware-default',
    title: 'Hardware Default Microphone Streaming',
    description: 'Stream microphone with hardware default sample rate'
  },
  {
    href: '/16khz-recording',
    title: '16kHz Microphone Streaming',
    description: 'Stream microphone with 16kHz sample rate override'
  },
  {
    href: '/playback-control',
    title: 'Playback Control',
    description: 'Pause audio and clear queue controls'
  },
  {
    href: '/file-recording',
    title: 'File Recording',
    description: 'Record to file, then play back with volume monitoring'
  }
];

export default function HomeScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Audio Stream Tests</Text>
        <Text style={styles.subtitle}>Select a test to run:</Text>
        
        {tests.map((test, index) => (
          <Link key={index} href={test.href} asChild>
            <TouchableOpacity style={styles.testCard}>
              <Text style={styles.testTitle}>{test.title}</Text>
              <Text style={styles.testDescription}>{test.description}</Text>
            </TouchableOpacity>
          </Link>
        ))}
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
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  testCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  testTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 5,
    color: '#333',
  },
  testDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});