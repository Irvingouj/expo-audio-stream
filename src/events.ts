// packages/expo-audio-stream/src/events.ts

import { EventSubscription } from 'expo-modules-core'
import ExpoPlayAudioStreamModule from './ExpoPlayAudioStreamModule'

// As of Expo SDK 52, the module is already an EventEmitter
const emitter = ExpoPlayAudioStreamModule

// Define a simple type for the listener
type Listener = (...args: any[]) => any;

// Create a simple addListener function using Expo's EventSubscription
function addListener(eventType: string, listener: Listener): EventSubscription {
  return emitter.addListener(eventType, listener);
}

// Example listener setup - remove unused test listener

// Base payload interface
interface BaseAudioEventPayload {
    type: 'recording' | 'microphone'
    soundLevel: number // Volume level in dBFS (typically -160.0 to 0.0)
}

// Recording payload - only contains volume feedback
export interface RecordingEventPayload extends BaseAudioEventPayload {
    type: 'recording'
    fileUri: string
}

// Microphone streaming payload - contains full audio data
export interface MicrophoneEventPayload extends BaseAudioEventPayload {
    type: 'microphone'
    encoded: string
    buffer?: Float32Array
    fileUri: string // Empty for microphone streaming
    lastEmittedSize?: number
    position?: number
    deltaSize: number
    totalSize: number
    mimeType?: string
    streamUuid?: string
}

// Union type for all possible event payloads
export type AudioEventPayload = RecordingEventPayload | MicrophoneEventPayload

export type SoundChunkPlayedEventPayload = {
    isFinal: boolean
}

export const DeviceReconnectedReasons = {
    newDeviceAvailable: 'newDeviceAvailable',
    oldDeviceUnavailable: 'oldDeviceUnavailable',
    unknown: 'unknown',
} as const

export type DeviceReconnectedReason = (typeof DeviceReconnectedReasons)[keyof typeof DeviceReconnectedReasons]

export type DeviceReconnectedEventPayload = {
    reason: DeviceReconnectedReason
}

export const AudioEvents = {
    AudioData: 'AudioData',
    SoundChunkPlayed: 'SoundChunkPlayed',
    SoundStarted: 'SoundStarted',
    DeviceReconnected: 'DeviceReconnected',
}

export function addAudioEventListener(
    listener: (event: AudioEventPayload) => Promise<void>
): EventSubscription {
    return addListener('AudioData', listener);
}

export function addSoundChunkPlayedListener(
    listener: (event: SoundChunkPlayedEventPayload) => Promise<void>
): EventSubscription {
    return addListener('SoundChunkPlayed', listener);
}

export function subscribeToEvent<T extends unknown>(
    eventName: string,
    listener: (event: T | undefined) => Promise<void>
): EventSubscription {
    return addListener(eventName, listener);
}

