import { useState, useCallback } from "react";
import { calculateVolume } from "../utils/audio";
import { AudioDataEvent } from "@irvingouj/expo-audio-stream";

export function useVolumeMeter() {
  const [volume, setVolume] = useState(0);
  const [rawSoundLevel, setRawSoundLevel] = useState<number>(-160);

  const updateVolume = useCallback((audioData: AudioDataEvent) => {
    const newVolume = calculateVolume(audioData);
    setVolume(newVolume);
    setRawSoundLevel(audioData.soundLevel);
  }, []);

  const resetVolume = useCallback(() => {
    setVolume(0);
    setRawSoundLevel(-160);
  }, []);

  return {
    volume,
    rawSoundLevel,
    updateVolume,
    resetVolume,
  };
}
