import { AudioDataEvent } from "@irvingouj/expo-audio-stream";
import * as Audio from "expo-audio";

export const ANDROID_SAMPLE_RATE = 16000;
export const IOS_SAMPLE_RATE = 48000;
export const CHANNELS = 1;
export const ENCODING = "pcm_16bit";
export const RECORDING_INTERVAL = 100;

export const turnId1 = "turnId1";
export const turnId2 = "turnId2";

export const requestMicrophonePermission = async (): Promise<boolean> => {
  const { granted } = await Audio.getRecordingPermissionsAsync();
  let permissionGranted = granted;
  if (!permissionGranted) {
    const { granted: grantedPermission } =
      await Audio.requestRecordingPermissionsAsync();
    permissionGranted = grantedPermission;
  }
  return permissionGranted;
};

export const isMicrophonePermissionGranted = async (): Promise<boolean> => {
  const { granted } = await Audio.getRecordingPermissionsAsync();
  return granted;
};

// Calculate volume level from AudioDataEvent using soundLevel (dBFS)
export const calculateVolume = (audioData: AudioDataEvent): number => {
  try {
    // soundLevel is in dBFS (typically -160.0 to 0.0)
    // -160.0 = silence, 0.0 = maximum volume
    const dBFS = audioData.soundLevel;
    
    // Convert dBFS to 0-1 range for UI display
    // We'll use -60dBFS as our minimum threshold (anything quieter is considered 0)
    const minDB = -60;
    const maxDB = 0;
    
    // Clamp the value and normalize
    const clampedDB = Math.max(minDB, Math.min(maxDB, dBFS));
    const normalizedVolume = (clampedDB - minDB) / (maxDB - minDB);
    
    return normalizedVolume;
  } catch (error) {
    console.warn("Error calculating volume from soundLevel:", error);
    return 0;
  }
};

export const onAudioCallback = async (audio: any) => {
  console.log(audio.data.slice(0, 100));
};
