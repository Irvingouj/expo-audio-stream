import { EventSubscription } from 'expo-modules-core'
import ExpoPlayAudioStreamModule from "./ExpoPlayAudioStreamModule";
import {
  AudioDataEvent,
  RecordingAudioDataEvent,
  MicrophoneAudioDataEvent,
  AudioRecording,
  RecordingConfig,
  MicrophoneConfig,
  StartRecordingResult,
  StartMicrophoneResult,
  SoundConfig,
  PlaybackMode,
  Encoding,
  EncodingTypes,
  PlaybackModes,
} from "./types";

import {
  addAudioEventListener,
  addSoundChunkPlayedListener,
  AudioEventPayload,
  SoundChunkPlayedEventPayload,
  AudioEvents,
  subscribeToEvent,
  DeviceReconnectedReason,
  DeviceReconnectedEventPayload,
} from "./events";

const SuspendSoundEventTurnId = "suspend-sound-events";

// Helper function to transform raw event payload to proper AudioDataEvent
function transformAudioEventPayload(event: AudioEventPayload): AudioDataEvent {
  if (event.type === 'recording') {
    return {
      type: 'recording',
      fileUri: event.fileUri,
      soundLevel: event.soundLevel,
    } as RecordingAudioDataEvent;
  } else {
    return {
      type: 'microphone',
      data: event.encoded,
      position: event.position ?? 0,
      eventDataSize: event.deltaSize,
      totalSize: event.totalSize,
      soundLevel: event.soundLevel,
    } as MicrophoneAudioDataEvent;
  }
}

export class ExpoPlayAudioStream {
  /**
   * Destroys the audio stream module, cleaning up all resources.
   * This should be called when the module is no longer needed.
   * It will reset all internal state and release audio resources.
   */
  static destroy() {
    ExpoPlayAudioStreamModule.destroy();
  }

  /**
   * Starts audio recording to file with volume feedback.
   * @param {RecordingConfig} recordingConfig - Configuration for the recording.
   * @returns {Promise<{recordingResult: StartRecordingResult, subscription: EventSubscription | undefined}>} A promise that resolves to an object containing the recording result and a subscription to volume events.
   * @throws {Error} If the recording fails to start.
   * @note Records audio to an M4A file and emits only volume levels (not raw audio data) via AudioData events.
   */
  static async startRecording(recordingConfig: RecordingConfig): Promise<{
    recordingResult: StartRecordingResult;
    subscription?: EventSubscription;
  }> {
    const { onAudioStream, ...options } = recordingConfig;

    let subscription: EventSubscription | undefined;

    if (onAudioStream && typeof onAudioStream == "function") {
      subscription = addAudioEventListener(async (event: AudioEventPayload) => {
        const transformedEvent = transformAudioEventPayload(event);
        onAudioStream?.(transformedEvent);
      });
    }

    try {
      const recordingResult = await ExpoPlayAudioStreamModule.startRecording(
        options
      );
      return { recordingResult, subscription };
    } catch (error) {
      console.error(error);
      subscription?.remove();
      throw new Error(`Failed to start recording: ${error}`);
    }
  }

  /**
   * Stops the current microphone recording.
   * @returns {Promise<AudioRecording>} A promise that resolves to the audio recording data.
   * @throws {Error} If the recording fails to stop.
   */
  static async stopRecording(): Promise<AudioRecording> {
    try {
      return await ExpoPlayAudioStreamModule.stopRecording();
    } catch (error) {
      console.error(error);
      throw new Error(`Failed to stop recording: ${error}`);
    }
  }

  /**
   * Plays an audio chunk.
   * @param {string} base64Chunk - The base64 encoded audio chunk to play.
   * @param {string} turnId - The turn ID.
   * @param {string} [encoding] - The encoding format of the audio data ('pcm_f32le' or 'pcm_s16le').
   * @returns {Promise<void>}
   * @throws {Error} If the audio chunk fails to stream.
   */
  static async playAudio(
    base64Chunk: string,
    turnId: string,
    encoding?: Encoding
  ): Promise<void> {
    try {
      return ExpoPlayAudioStreamModule.playAudio(
        base64Chunk,
        turnId,
        encoding ?? EncodingTypes.PCM_S16LE
      );
    } catch (error: any) {
      console.error(error);
      throw new Error(`Failed to stream audio chunk: ${error.message || error}`);
    }
  }

  /**
   * Pauses the current audio playback.
   * @returns {Promise<void>}
   * @throws {Error} If the audio playback fails to pause.
   */
  static async pauseAudio(): Promise<void> {
    try {
      return await ExpoPlayAudioStreamModule.pauseAudio();
    } catch (error) {
      console.error(error);
      throw new Error(`Failed to pause audio: ${error}`);
    }
  }

  /**
   * Stops the currently playing audio.
   * @returns {Promise<void>}
   * @throws {Error} If the audio fails to stop.
   */
  static async stopAudio(): Promise<void> {
    try {
      return await ExpoPlayAudioStreamModule.stopAudio();
    } catch (error) {
      console.error(error);
      throw new Error(`Failed to stop audio: ${error}`);
    }
  }

  /**
   * Clears the playback queue by turn ID.
   * @param {string} turnId - The turn ID.
   * @returns {Promise<void>}
   * @throws {Error} If the playback queue fails to clear.
   */
  static async clearPlaybackQueueByTurnId(turnId: string): Promise<void> {
    try {
      await ExpoPlayAudioStreamModule.clearPlaybackQueueByTurnId(turnId);
    } catch (error) {
      console.error(error);
      throw new Error(`Failed to clear playback queue: ${error}`);
    }
  }

  /**
   * Plays a sound.
   * @param {string} audio - The audio to play.
   * @param {string} turnId - The turn ID.
   * @param {string} [encoding] - The encoding format of the audio data ('pcm_f32le' or 'pcm_s16le').
   * @returns {Promise<void>}
   * @throws {Error} If the sound fails to play.
   */
  static async playSound(
    audio: string,
    turnId: string,
    encoding?: Encoding
  ): Promise<void> {
    try {
      await ExpoPlayAudioStreamModule.playSound(
        audio,
        turnId,
        encoding ?? EncodingTypes.PCM_S16LE
      );
    } catch (error: any) {
      console.error(error);
      throw new Error(`Failed to enqueue audio: ${error.message || error}`);
    }
  }

  /**
   * Stops the currently playing sound.
   * @returns {Promise<void>}
   * @throws {Error} If the sound fails to stop.
   */
  static async stopSound(): Promise<void> {
    try {
      await ExpoPlayAudioStreamModule.stopSound();
    } catch (error) {
      console.error(error);
      throw new Error(`Failed to stop enqueued audio: ${error}`);
    }
  }

  /**
   * Interrupts the current sound.
   * @returns {Promise<void>}
   * @throws {Error} If the sound fails to interrupt.
   */
  static async interruptSound(): Promise<void> {
    try {
      await ExpoPlayAudioStreamModule.interruptSound();
    } catch (error) {
      console.error(error);
      throw new Error(`Failed to stop enqueued audio: ${error}`);
    }
  }

  /**
   * Resumes the current sound.
   * @returns {Promise<void>}
   * @throws {Error} If the sound fails to resume.
   */
  static resumeSound(): void {
    try {
      ExpoPlayAudioStreamModule.resumeSound();
    } catch (error) {
      console.error(error);
      throw new Error(`Failed to resume sound: ${error}`);
    }
  }

  /**
   * Clears the sound queue by turn ID.
   * @param {string} turnId - The turn ID.
   * @returns {Promise<void>}
   * @throws {Error} If the sound queue fails to clear.
   */
  static async clearSoundQueueByTurnId(turnId: string): Promise<void> {
    try {
      await ExpoPlayAudioStreamModule.clearSoundQueueByTurnId(turnId);
    } catch (error) {
      console.error(error);
      throw new Error(`Failed to clear sound queue: ${error}`);
    }
  }

  /**
   * Starts microphone streaming for real-time audio data.
   * @param {MicrophoneConfig} microphoneConfig - The microphone streaming configuration.
   * @returns {Promise<{recordingResult: StartMicrophoneResult, subscription: EventSubscription | undefined}>} A promise that resolves to an object containing the recording result and a subscription to audio data events.
   * @throws {Error} If the microphone streaming fails to start.
   */
  static async startMicrophone(microphoneConfig: MicrophoneConfig): Promise<{
    recordingResult: StartMicrophoneResult;
    subscription?: EventSubscription;
  }> {
    let subscription: EventSubscription | undefined;
    try {
      const { onAudioStream, ...options } = microphoneConfig;

      if (onAudioStream && typeof onAudioStream == "function") {
        subscription = addAudioEventListener(
          async (event: AudioEventPayload) => {
            // Type guard ensures the event has the right structure
            if (event.type === 'microphone' && !event.encoded) {
              console.error(`[ExpoPlayAudioStream] Encoded audio data is missing for microphone stream`);
              throw new Error("Encoded audio data is missing for microphone stream");
            }
            const transformedEvent = transformAudioEventPayload(event);
            onAudioStream?.(transformedEvent);
          }
        );
      }

      const result = await ExpoPlayAudioStreamModule.startMicrophone(options);

      return { recordingResult: result, subscription };
    } catch (error) {
      console.error(error);
      subscription?.remove();
      throw new Error(`Failed to start recording: ${error}`);
    }
  }

  /**
   * Stops the current microphone streaming.
   * @returns {Promise<void>}
   * @throws {Error} If the microphone streaming fails to stop.
   */
  static async stopMicrophone(): Promise<AudioRecording | null> {
    try {
      return await ExpoPlayAudioStreamModule.stopMicrophone();
    } catch (error) {
      console.error(error);
      throw new Error(`Failed to stop mic stream: ${error}`);
    }
  }

  /**
   * Subscribes to audio events emitted during recording/streaming.
   * @param onMicrophoneStream - Callback function that will be called when audio data is received.
   * The callback receives an AudioDataEvent containing:
   * - data: For recording: empty data (volume feedback only). For streaming: base64 encoded audio data
   * - position: Current position in the audio stream
   * - fileUri: URI of the recording file (empty for streaming)
   * - eventDataSize: Size of the current audio data chunk (0 for recording volume events)
   * - totalSize: Total size of recorded audio so far (0 for recording volume events)
   * - soundLevel: Volume level in dBFS (-160.0 to 0.0)
   * @returns {EventSubscription} A subscription object that can be used to unsubscribe from the events
   * @note For file recording, only soundLevel contains meaningful data. For streaming, all fields are populated.
   */
  static subscribeToAudioEvents(
    onAudioStream: (event: AudioDataEvent) => Promise<void>
  ) {
    return addAudioEventListener(async (event: AudioEventPayload) => {
      const transformedEvent = transformAudioEventPayload(event);
      onAudioStream?.(transformedEvent);
    });
  }

  /**
   * Subscribes to events emitted when a sound chunk has finished playing.
   * @param onSoundChunkPlayed - Callback function that will be called when a sound chunk is played.
   * The callback receives a SoundChunkPlayedEventPayload indicating if this was the final chunk.
   * @returns {EventSubscription} A subscription object that can be used to unsubscribe from the events.
   */
  static subscribeToSoundChunkPlayed(
    onSoundChunkPlayed: (event: SoundChunkPlayedEventPayload) => Promise<void>
  ) {
    return addSoundChunkPlayedListener(onSoundChunkPlayed);
  }

  /**
   * Subscribes to events emitted by the audio stream module, for advanced use cases.
   * @param eventName - The name of the event to subscribe to.
   * @param onEvent - Callback function that will be called when the event is emitted.
   * @returns {EventSubscription} A subscription object that can be used to unsubscribe from the events.
   */
  static subscribe<T extends unknown>(
    eventName: string,
    onEvent: (event: T | undefined) => Promise<void>
  ) {
    return subscribeToEvent(eventName, onEvent);
  }

  /**
   * Plays a WAV audio file from base64 encoded data.
   * Unlike playSound(), this method plays the audio directly without queueing.
   * @param {string} wavBase64 - Base64 encoded WAV audio data.
   * @returns {Promise<void>}
   * @throws {Error} If the WAV audio fails to play.
   */
  static async playWav(wavBase64: string) {
    try {
      await ExpoPlayAudioStreamModule.playWav(wavBase64);
    } catch (error: any) {
      console.error(error);
      throw new Error(`Failed to play wav: ${error.message || error}`);
    }
  }

  /**
   * Sets the sound player configuration.
   * @param {SoundConfig} config - Configuration options for the sound player.
   * @returns {Promise<void>}
   * @throws {Error} If the configuration fails to update.
   */
  static async setSoundConfig(config: SoundConfig): Promise<void> {
    try {
      await ExpoPlayAudioStreamModule.setSoundConfig(config);
    } catch (error) {
      console.error(error);
      throw new Error(`Failed to set sound configuration: ${error}`);
    }
  }

  /**
   * Prompts the user to select the microphone mode.
   * @returns {Promise<void>}
   * @throws {Error} If the microphone mode fails to prompt.
   */
  static promptMicrophoneModes() {
    ExpoPlayAudioStreamModule.promptMicrophoneModes();
  }

  /**
   * Toggles the silence state of the microphone.
   * @returns {Promise<void>}
   * @throws {Error} If the microphone fails to toggle silence.
   */
  static toggleSilence() {
    ExpoPlayAudioStreamModule.toggleSilence();
  }

}

export {
  AudioDataEvent,
  RecordingAudioDataEvent,
  MicrophoneAudioDataEvent,
  SoundChunkPlayedEventPayload,
  DeviceReconnectedReason,
  DeviceReconnectedEventPayload,
  AudioRecording,
  RecordingConfig,
  MicrophoneConfig,
  StartRecordingResult,
  StartMicrophoneResult,
  AudioEvents,
  SuspendSoundEventTurnId,
  SoundConfig,
  PlaybackMode,
  Encoding,
  EncodingTypes,
  PlaybackModes,
};
