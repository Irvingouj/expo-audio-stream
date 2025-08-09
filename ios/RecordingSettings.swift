// RecordingSettings.swift

import AVFoundation

struct RecordingSettings {
    var sampleRate: Double
    var desiredSampleRate: Double?
    var numberOfChannels: Int = 1
    var bitDepth: Int = 16
    var maxRecentDataDuration: Double? = 10.0 // Default to 10 seconds
    var pointsPerSecond: Int? = 1000 // Default value

    func toAVAudioFormat() -> AVAudioFormat? {
        let commonFormat: AVAudioCommonFormat = AudioUtils.getCommonFormat(depth: bitDepth)
        return AVAudioFormat(commonFormat: commonFormat, sampleRate: sampleRate, channels: UInt32(numberOfChannels), interleaved: true)
    }
}

