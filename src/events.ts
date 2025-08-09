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

export interface AudioEventPayload {
    encoded?: string
    buffer?: Float32Array
    fileUri: string
    lastEmittedSize: number
    position: number
    deltaSize: number
    totalSize: number
    mimeType: string
    streamUuid: string
    soundLevel?: number
}

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

