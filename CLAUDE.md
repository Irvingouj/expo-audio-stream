# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Expo native module called `@irvingouj/expo-audio-stream` that provides real-time audio recording and playback capabilities for React Native applications. The module supports simultaneous recording and playback, voice processing, and real-time audio streaming - features not available in standard Expo audio APIs.

## Development Commands

### Building & Testing
- `yarn build` - Build the module using expo-module-scripts
- `yarn clean` - Clean build artifacts  
- `yarn lint` - Run linting
- `yarn test` - Run tests
- `yarn prepare` - Prepare for publishing

### Development Setup
- `yarn open:ios` - Open iOS example in Xcode
- `yarn open:android` - Open Android example in Android Studio

### Example App
```bash
cd example
npx expo start  # Start the example app
npx expo install expo-audio  # Install required audio permissions
```

## Architecture

### Module Structure
The module follows modern Expo module patterns (SDK 52+) with:

- **TypeScript API Layer** (`src/`): Public API with type definitions and event handling
- **Native iOS Implementation** (`ios/`): Swift module using AVFoundation 
- **Native Android Implementation** (`android/`): Kotlin module using AudioTrack
- **Example App** (`example/`): Demonstrates all module features
- **Expo Plugin** (`plugin/`): Configuration plugin for native permissions

### Key Components

**iOS Native (`ios/ExpoPlayAudioStreamModule.swift`)**:
- Uses AVFoundation framework with dual-buffer queue system
- Implements delegates: `AudioStreamManagerDelegate`, `MicrophoneDataDelegate`, `SoundPlayerDelegate`
- Handles audio session configuration and voice processing
- Manages lazy-loaded components: `AudioSessionManager`, `Microphone`, `SoundPlayer`

**Android Native** (`android/src/main/java/expo/modules/audiostream/`):
- `ExpoPlayAudioStreamModule.kt` - Main module class
- `AudioRecorderManager.kt` - Recording functionality  
- `AudioPlaybackManager.kt` - Playback functionality
- Uses AudioTrack with concurrent queue and coroutines

**TypeScript API** (`src/`):
- `index.ts` - Main ExpoPlayAudioStream class with static methods
- `types.ts` - Type definitions for all interfaces and enums
- `events.ts` - Event system using EventSubscription
- `ExpoPlayAudioStreamModule.ts` - Native module bridge

### Event System Architecture
The module uses modern Expo event patterns:
- Events: `"AudioData"`, `"SoundChunkPlayed"`, `"SoundStarted"`, `"DeviceReconnected"`
- Uses `EventSubscription` from `expo-modules-core` (not custom Subscription interface)
- Event payloads include `streamUuid` for correlation

## Audio Processing Features

### Dual Recording Modes
1. **Standard Recording** (`startRecording/stopRecording`): File-based recording
2. **Microphone Streaming** (`startMicrophone/stopMicrophone`): Real-time streaming with voice processing

### Simultaneous Operations  
- Record while playing audio using voice processing to prevent feedback
- Separate queues for playback (`playAudio`) vs simultaneous playback (`playSound`)
- Turn-based audio management with `turnId` system

### Voice Processing (iOS)
- Uses iOS voice processing modes: `regular`, `voiceProcessing`, `conversation`  
- iOS 15+ supports system microphone mode selection
- Echo cancellation and noise reduction when enabled

## Common Development Patterns

### Error Handling
Native modules use standardized error codes:
- `AUDIO_RECORDING_ERROR` - Recording failures
- `MICROPHONE_ERROR` - Microphone access issues  
- `AUDIO_PLAYBACK_ERROR` - Playback failures
- `SOUND_CONFIG_ERROR` - Configuration errors
- `AUDIO_SESSION_ERROR` - Audio session setup failures

### Event Subscription Pattern
```typescript
const subscription = ExpoPlayAudioStream.subscribeToAudioEvents(async (event) => {
  // Handle audio data
});
// Always clean up
subscription.remove();
```

### Permission Handling
Uses `expo-audio` (not `expo-av`) for microphone permissions:
```typescript
import * as Audio from 'expo-audio';
await Audio.requestRecordingPermissionsAsync();
```

## Module Configuration

### Expo Module Config (`expo-module.config.json`)
Defines platform-specific module classes:
- iOS: `ExpoPlayAudioStreamModule`  
- Android: `expo.modules.audiostream.ExpoPlayAudioStreamModule`

### Audio Configuration
Supports multiple sample rates (16000, 44100, 48000 Hz) and encoding formats:
- `pcm_f32le` - 32-bit float
- `pcm_s16le` - 16-bit signed integer (default)

## Important Notes

### Modern Expo Module Patterns (SDK 52+)
- Native modules are already EventEmitters - don't wrap them
- Use string literals for event names, not constants
- Use `EventSubscription` from expo-modules-core
- `promise.reject()` takes 2 parameters: `(code, message)`

### Audio Format Requirements  
- Designed for RIFF, 16 kHz, 16-bit, mono PCM
- Base64 encoding for data transfer between JS and native
- WAV format supported via `playWav()` method

### Performance Considerations
- Dual-buffer queue system prevents audio dropouts
- Coroutine-based processing on Android  
- Voice processing trades volume for clarity
- Real-time streaming requires proper cleanup of subscriptions

## Debugging Audio Issues
- Check audio session configuration in iOS logs
- Verify microphone permissions are granted
- Monitor buffer queue status for playback issues
- Check for proper subscription cleanup to prevent memory leaks