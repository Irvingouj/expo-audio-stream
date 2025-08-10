import { useEffect, useRef } from 'react';
import { Stack } from 'expo-router/stack';
import { ExpoPlayAudioStream } from "@irvingouj/expo-audio-stream";
import { EventSubscription } from "expo-modules-core";

export default function RootLayout() {
  const playEventsListenerSubscriptionRef = useRef<EventSubscription | undefined>(undefined);

  useEffect(() => {
    // Set up global sound chunk played event listener
    playEventsListenerSubscriptionRef.current =
      ExpoPlayAudioStream.subscribeToSoundChunkPlayed(async (event) => {
        console.log('Sound chunk played:', event);
      });

    return () => {
      if (playEventsListenerSubscriptionRef.current) {
        playEventsListenerSubscriptionRef.current.remove();
        playEventsListenerSubscriptionRef.current = undefined;
      }
    };
  }, []);

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Audio Stream Tests' }} />
      <Stack.Screen name="play-sample-b" options={{ title: 'Play Sample B' }} />
      <Stack.Screen name="play-sample-a" options={{ title: 'Play Sample A' }} />
      <Stack.Screen name="play-wav" options={{ title: 'Play WAV Fragment' }} />
      <Stack.Screen name="recording" options={{ title: 'Realtime Microphone Streaming' }} />
      <Stack.Screen name="hardware-default" options={{ title: 'Hardware Default Streaming' }} />
      <Stack.Screen name="16khz-recording" options={{ title: '16kHz Streaming' }} />
      <Stack.Screen name="playback-control" options={{ title: 'Playback Control' }} />
      <Stack.Screen name="file-recording" options={{ title: 'File Recording' }} />
    </Stack>
  );
}