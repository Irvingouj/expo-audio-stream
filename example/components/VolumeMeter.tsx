import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface VolumeMeterProps {
  volume: number;
  isActive: boolean;
  rawSoundLevel?: number; // Optional raw dBFS value
}

export function VolumeMeter({ volume, isActive, rawSoundLevel }: VolumeMeterProps) {
  const volumePercentage = Math.round(volume * 100);
  
  const getVolumeColor = (vol: number) => {
    if (vol < 0.3) return '#28A745'; // Green for low volume
    if (vol < 0.7) return '#FFC107'; // Yellow for medium volume
    return '#DC3545'; // Red for high volume
  };

  const getVolumeText = (vol: number, dBFS?: number) => {
    if (dBFS !== undefined) {
      // Use dBFS for more accurate volume description
      if (dBFS < -45) return 'Very Quiet';
      if (dBFS < -30) return 'Quiet';
      if (dBFS < -18) return 'Normal';
      if (dBFS < -6) return 'Loud';
      return 'Very Loud';
    }
    
    // Fallback to normalized volume
    if (vol < 0.1) return 'Very Quiet';
    if (vol < 0.3) return 'Quiet';
    if (vol < 0.5) return 'Normal';
    if (vol < 0.7) return 'Loud';
    return 'Very Loud';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Microphone Volume</Text>
      
      <View style={styles.volumeContainer}>
        <View 
          style={[
            styles.volumeIndicator, 
            { 
              backgroundColor: isActive ? getVolumeColor(volume) : '#CCCCCC',
              opacity: isActive ? 1 : 0.5 
            }
          ]}
        >
          <Text style={styles.volumeNumber}>
            {isActive ? volumePercentage : 0}%
          </Text>
        </View>
        
        <Text style={[styles.volumeLabel, { color: isActive ? '#333' : '#999' }]}>
          {isActive ? getVolumeText(volume, rawSoundLevel) : 'Not Streaming'}
        </Text>
      </View>

      <View style={styles.details}>
        <Text style={styles.detailText}>
          Normalized: {isActive ? volume.toFixed(3) : '0.000'}
        </Text>
        {rawSoundLevel !== undefined && (
          <Text style={styles.detailText}>
            dBFS: {isActive ? rawSoundLevel.toFixed(1) : '-160.0'}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 15,
    color: '#333',
  },
  volumeContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  volumeIndicator: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  volumeNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  volumeLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  details: {
    alignItems: 'center',
  },
  detailText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
});