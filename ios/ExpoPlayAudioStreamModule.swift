import Foundation
import AVFoundation
import ExpoModulesCore

// Event names moved to inline usage for modern Expo module API


public class ExpoPlayAudioStreamModule: Module, AudioStreamManagerDelegate, MicrophoneDataDelegate, SoundPlayerDelegate {
    private var _audioSessionManager: AudioSessionManager?
    private var _microphone: Microphone?
    
    private lazy var audioSessionManager: AudioSessionManager = {
        let manager = AudioSessionManager()
        manager.delegate = self
        return manager
    }()
    
    private lazy var microphone: Microphone = {
        let mic = Microphone()
        mic.delegate = self
        return mic
    }()
    
    private lazy var soundPlayer: SoundPlayer = {
        let player = SoundPlayer()
        player.delegate = self
        return player
    }()
    
    private var isAudioSessionInitialized: Bool = false

    public func definition() -> ModuleDefinition {
        Name("ExpoPlayAudioStream")
        
        // Defines event names that the module can send to JavaScript.
        Events(["AudioData", "SoundChunkPlayed", "SoundStarted", "DeviceReconnected"])
        
        Function("destroy") {
            // Now we can properly reset all instances
            self._audioSessionManager = nil
            self._microphone = nil
            self.isAudioSessionInitialized = false
        }
        
        /// Prompts the user to select the microphone mode.
        Function("promptMicrophoneModes") {
            promptForMicrophoneModes()
        }
        
        /// Asynchronously starts audio recording to file with volume feedback.
        ///
        /// - Parameters:
        ///   - options: A dictionary containing:
        ///     - `interval`: The interval in milliseconds at which to emit volume level data (default is 1000 ms).
        ///   - promise: A promise to resolve with the recording settings or reject with an error.
        ///   
        /// - Note: This records audio to an M4A file using hardware defaults and emits only volume levels (not raw audio data) via AudioData events.
        AsyncFunction("startRecording") { (options: [String: Any], promise: Promise) in
            // For recording, we only accept interval - all other settings are determined by hardware
            let interval = options["interval"] as? Int ?? 1000
            
            if let result = self.audioSessionManager.startRecording(intervalMilliseconds: interval) {
                if let resError = result.error {
                    promise.reject("AUDIO_RECORDING_ERROR", resError)
                } else {
                    // Only include actual values that exist in the result
                    var resultDict: [String: Any] = [:]
                    
                    if let fileUri = result.fileUri {
                        resultDict["fileUri"] = fileUri
                    }
                    
                    if let channels = result.channels {
                        resultDict["channels"] = channels
                    }
                    
                    if let bitDepth = result.bitDepth {
                        resultDict["bitDepth"] = bitDepth
                    }
                    
                    if let sampleRate = result.sampleRate {
                        resultDict["sampleRate"] = sampleRate
                    }
                    
                    if let mimeType = result.mimeType {
                        resultDict["mimeType"] = mimeType
                    }
                    
                    promise.resolve(resultDict)
                }
            } else {
                promise.reject("AUDIO_RECORDING_ERROR", "Failed to start recording.")
            }
        }
        
        /// Pauses audio recording.
        Function("pauseRecording") {
            self.audioSessionManager.pauseRecording()
        }
        
        /// Resumes audio recording.
        Function("resumeRecording") {
            self.audioSessionManager.resumeRecording()
        }
        
        /// Asynchronously stops audio recording and retrieves the recording result.
        ///
        /// - Parameters:
        ///   - promise: A promise to resolve with the recording result or reject with an error.
        AsyncFunction("stopRecording") { (promise: Promise) in
            self.audioSessionManager.stopRecording { recordingResult in
                guard let recordingResult = recordingResult else {
                    promise.reject("AUDIO_RECORDING_ERROR", "Failed to stop recording or no recording in progress.")
                    return
                }
                
                if let resError = recordingResult.error {
                    promise.reject("AUDIO_RECORDING_ERROR", resError)
                } else {
                    // Convert RecordingResult to a dictionary - only include values that exist
                    var resultDict: [String: Any] = [:]
                    
                    resultDict["fileUri"] = recordingResult.fileUri
                    
                    if let filename = recordingResult.filename {
                        resultDict["filename"] = filename
                    }
                    
                    if let duration = recordingResult.duration {
                        resultDict["durationMs"] = duration
                    }
                    
                    if let size = recordingResult.size {
                        resultDict["size"] = size
                    }
                    
                    if let channels = recordingResult.channels {
                        resultDict["channels"] = channels
                    }
                    
                    if let bitDepth = recordingResult.bitDepth {
                        resultDict["bitDepth"] = bitDepth
                    }
                    
                    if let sampleRate = recordingResult.sampleRate {
                        resultDict["sampleRate"] = sampleRate
                    }
                    
                    if let mimeType = recordingResult.mimeType {
                        resultDict["mimeType"] = mimeType
                    }
                    promise.resolve(resultDict)
                }
            }
        }
        
        
        
        AsyncFunction("playAudio") { (base64chunk: String, turnId: String, encoding: String? , promise: Promise) in
            // Determine the audio format based on the encoding parameter
            let commonFormat: AVAudioCommonFormat
            switch encoding {
            case "pcm_f32le":
                commonFormat = .pcmFormatFloat32
            case "pcm_s16le", nil:
                commonFormat = .pcmFormatInt16
            default:
                Logger.debug("[ExpoPlayAudioStreamModule] Unsupported encoding: \(encoding ?? "nil"), defaulting to PCM_S16LE")
                commonFormat = .pcmFormatInt16
            }
            
            audioSessionManager.playAudio(base64chunk, turnId, commonFormat: commonFormat, resolver: { _ in
                promise.resolve(nil)
            }, rejecter: { code, message, error in
                promise.reject(code ?? "AUDIO_PLAYBACK_ERROR", message ?? "Unknown error")
            })
        }
        
        AsyncFunction("clearPlaybackQueueByTurnId") { (turnId: String, promise: Promise) in
            audioSessionManager.cleanPlaybackQueue(turnId, resolver: { _ in
                promise.resolve(nil)
            }, rejecter: { code, message, error in
                promise.reject(code ?? "AUDIO_PLAYBACK_ERROR", message ?? "Unknown error")
            })
        }

        AsyncFunction("pauseAudio") { (promise: Promise) in
            audioSessionManager.pauseAudio(promise: promise)
        }


        AsyncFunction("stopAudio") { promise in
            audioSessionManager.stopAudio(promise: promise)
        }
        
        Function("listAudioFiles") {
            return listAudioFiles()
        }
        
        AsyncFunction("playSound") { (base64Chunk: String, turnId: String, encoding: String?, promise: Promise) in
            Logger.debug("Play sound")
            do {
                if !isAudioSessionInitialized {
                    try ensureAudioSessionInitialized()
                }
                
                // Determine the audio format based on the encoding parameter
                let commonFormat: AVAudioCommonFormat
                switch encoding {
                case "pcm_f32le":
                    commonFormat = .pcmFormatFloat32
                case "pcm_s16le", nil:
                    commonFormat = .pcmFormatInt16
                default:
                    Logger.debug("[ExpoPlayAudioStreamModule] Unsupported encoding: \(encoding ?? "nil"), defaulting to PCM_S16LE")
                    commonFormat = .pcmFormatInt16
                }

                try soundPlayer.play(audioChunk: base64Chunk, turnId: turnId, resolver: {
                    _ in promise.resolve(nil)
                }, rejecter: {code, message, error in
                    promise.reject(code ?? "AUDIO_PLAYBACK_ERROR", message ?? "Unknown error")
                }, commonFormat: commonFormat)
            } catch {
                print("Error enqueuing audio: \(error.localizedDescription)")
                promise.reject("AUDIO_PLAYBACK_ERROR", "Error enqueuing audio: \(error.localizedDescription)")
            }
        }
        
        AsyncFunction("playWav") { (base64Chunk: String, promise: Promise) in
            if !isAudioSessionInitialized {
                do {
                    try ensureAudioSessionInitialized()
                } catch {
                    print("Failed to init audio session \(error.localizedDescription)")
                    promise.reject("AUDIO_SESSION_ERROR", "Failed to init audio session: \(error.localizedDescription)" )
                    return
                }
            }
            soundPlayer.playWav(base64Wav: base64Chunk)
            promise.resolve(nil)
        }
        
        AsyncFunction("playM4a") { (base64Chunk: String, promise: Promise) in
            if !isAudioSessionInitialized {
                do {
                    try ensureAudioSessionInitialized()
                } catch {
                    print("Failed to init audio session \(error.localizedDescription)")
                    promise.reject("AUDIO_SESSION_ERROR", "Failed to init audio session: \(error.localizedDescription)")
                    return
                }
            }
            soundPlayer.playM4a(base64M4a: base64Chunk)
            promise.resolve(nil)
        }

        AsyncFunction("playM4aFile") { (fileUri: String, promise: Promise) in
            if !isAudioSessionInitialized {
                do {
                    try ensureAudioSessionInitialized()
                } catch {
                    print("Failed to init audio session \(error.localizedDescription)")
                    promise.reject("AUDIO_SESSION_ERROR", "Failed to init audio session: \(error.localizedDescription)")
                    return
                }
            }
            soundPlayer.playM4aFile(fileUri: fileUri)
            promise.resolve(nil)
        }
        
        AsyncFunction("stopSound") { (promise: Promise) in
            soundPlayer.stop(promise)
        }
        
        AsyncFunction("interruptSound") { (promise: Promise) in
            soundPlayer.interrupt(promise)
        }
        
        Function("resumeSound") {
            soundPlayer.resume()
        }
        
        AsyncFunction("clearSoundQueueByTurnId") { (turnId: String, promise: Promise) in
            soundPlayer.clearSoundQueue(turnIdToClear: turnId, resolver: promise)
        }
        
        AsyncFunction("startMicrophone") { (options: [String: Any], promise: Promise) in
            // Get the hardware's current sample rate
            let hardwareSampleRate = AVAudioSession.sharedInstance().sampleRate
            
            // Create recording settings
            // Extract settings from provided options, using hardware defaults if necessary
            let sampleRate = options["sampleRate"] as? Double ?? hardwareSampleRate
            let numberOfChannels = options["channelConfig"] as? Int ?? 1 // Mono channel configuration
            let bitDepth = options["audioFormat"] as? Int ?? 16 // 16bits
            let interval = options["interval"] as? Int ?? 1000
            
            let settings = RecordingSettings(
                sampleRate: sampleRate,
                desiredSampleRate: sampleRate,
                numberOfChannels: numberOfChannels,
                bitDepth: bitDepth,
                maxRecentDataDuration: nil,
                pointsPerSecond: nil
            )
            
            if !isAudioSessionInitialized {
                do {
                    try ensureAudioSessionInitialized(settings: settings)
                } catch {
                    promise.reject("AUDIO_SESSION_ERROR", "Failed to init audio session \(error.localizedDescription)")
                    return
                }
            }            
            
            if let result = self.microphone.startRecording(settings: settings, intervalMilliseconds: interval) {
                if let resError = result.error {
                    promise.reject("MICROPHONE_ERROR", resError)
                } else {
                    let resultDict: [String: Any] = [
                        "fileUri": result.fileUri ?? "",
                        "channels": result.channels ?? 1,
                        "bitDepth": result.bitDepth ?? 16,
                        "sampleRate": result.sampleRate ?? 48000,
                        "mimeType": result.mimeType ?? "",
                    ]
                    promise.resolve(resultDict)
                }
            } else {
                promise.reject("MICROPHONE_ERROR", "Failed to start recording.")
            }
        }
        
        /// Stops the microphone recording and releases associated resources
        /// - Parameter promise: A promise to resolve when microphone recording is stopped
        /// - Note: This method stops the active recording session, processes any remaining audio data,
        ///         and releases hardware resources. It should be called when the app no longer needs
        ///         microphone access to conserve battery and system resources.
        AsyncFunction("stopMicrophone") { (promise: Promise) in
            microphone.stopRecording(resolver: promise)
        }
        
        Function("toggleSilence") {
            microphone.toggleSilence()
        }
        
        /// Sets the sound player configuration
        /// - Parameters:
        ///   - config: A dictionary containing configuration options:
        ///     - `sampleRate`: The sample rate for audio playback (default is 16000.0).
        ///     - `playbackMode`: The playback mode ("regular", "voiceProcessing", or "conversation").
        ///     - `useDefault`: When true, resets to default configuration regardless of other parameters.
        ///   - promise: A promise to resolve when configuration is updated or reject with an error.
        AsyncFunction("setSoundConfig") { (config: [String: Any], promise: Promise) in
            // Check if we should use default configuration
            let useDefault = config["useDefault"] as? Bool ?? false
            
            do {
                if !isAudioSessionInitialized {
                    try ensureAudioSessionInitialized()
                }
                
                if useDefault {
                    // Reset to default configuration
                    Logger.debug("[ExpoPlayAudioStreamModule] Resetting sound configuration to default values")
                    try soundPlayer.resetConfigToDefault()
                } else {
                    // Extract configuration values from the provided dictionary
                    let sampleRate = config["sampleRate"] as? Double ?? 16000.0
                    let playbackModeString = config["playbackMode"] as? String ?? "regular"
                    
                    // Convert string playback mode to enum
                    let playbackMode: PlaybackMode
                    switch playbackModeString {
                    case "voiceProcessing":
                        playbackMode = .voiceProcessing
                    case "conversation":
                        playbackMode = .conversation
                    default:
                        playbackMode = .regular
                    }
                    
                    // Create a new SoundConfig object
                    let soundConfig = SoundConfig(sampleRate: sampleRate, playbackMode: playbackMode)
                    
                    // Update the sound player configuration
                    Logger.debug("[ExpoPlayAudioStreamModule] Setting sound configuration - sampleRate: \(sampleRate), playbackMode: \(playbackModeString)")
                    try soundPlayer.updateConfig(soundConfig)
                }
                
                promise.resolve(nil)
            } catch {
                promise.reject("SOUND_CONFIG_ERROR", "Failed to set sound configuration: \(error.localizedDescription)")
            }
        }
        
        /// Clears all audio files stored in the document directory.
        Function("clearAudioFiles") {
            clearAudioFiles()
        }
    }
    
    private func ensureAudioSessionInitialized(settings recordingSettings: RecordingSettings? = nil) throws {
        if self.isAudioSessionInitialized { return }

        let audioSession = AVAudioSession.sharedInstance()
        try audioSession.setCategory(
            .playAndRecord, mode: .voiceChat,
            options: [.defaultToSpeaker, .allowBluetooth, .allowBluetoothA2DP])
        if let settings = recordingSettings {
            try audioSession.setPreferredSampleRate(settings.sampleRate)
            try audioSession.setPreferredIOBufferDuration(1024 / settings.sampleRate)
        }
        try audioSession.setActive(true)
        isAudioSessionInitialized = true
     }
    
    // used for voice isolation, experimental
    private func promptForMicrophoneModes() {
        guard #available(iOS 15.0, *) else {
            return
        }
        
        if AVCaptureDevice.preferredMicrophoneMode == .voiceIsolation {
            return
        }
        
        AVCaptureDevice.showSystemUserInterface(.microphoneModes)
    }
    
    /// Handles volume level updates during file recording.
    ///
    /// - Parameters:
    ///   - manager: The AudioSessionManager instance.
    ///   - soundLevel: The current volume level in dBFS.
    func audioSessionManager(_ manager: AudioSessionManager, didUpdateRecordingVolume soundLevel: Float) {
        Logger.debug("audioSessionManager delegate called with soundLevel: \(soundLevel)")
        
        guard let audioRecorder = manager.currentAudioRecorder else {
            Logger.debug("audioRecorder is nil, cannot send volume event")
            return
        }
        
        let fileURL = audioRecorder.url
        
        // Construct the event payload for recording (volume feedback only)
        let eventBody: [String: Any] = [
            "type": "recording",
            "fileUri": fileURL.absoluteString,
            "soundLevel": soundLevel
        ]
        
        Logger.debug("Sending volume event to JavaScript: \(eventBody)")
        
        // Emit the event to JavaScript
        sendEvent("AudioData", eventBody)
        
        Logger.debug("Volume event sent successfully")
    }
    
    /// Checks microphone permission and calls the completion handler with the result.
    ///
    /// - Parameters:
    ///   - completion: A completion handler that receives a boolean indicating whether the microphone permission was granted.
    private func checkMicrophonePermission(completion: @escaping (Bool) -> Void) {
        switch AVAudioSession.sharedInstance().recordPermission {
        case .granted:
            completion(true)
        case .denied:
            completion(false)
        case .undetermined:
            AVAudioSession.sharedInstance().requestRecordPermission { granted in
                DispatchQueue.main.async {
                    completion(granted)
                }
            }
        @unknown default:
            completion(false)
        }
    }
    
    /// Clears all audio files stored in the document directory.
    private func clearAudioFiles() {
        let fileURLs = listAudioFiles()  // This now returns full URLs as strings
        fileURLs.forEach { fileURLString in
            if let fileURL = URL(string: fileURLString) {
                do {
                    try FileManager.default.removeItem(at: fileURL)
                    print("Removed file at:", fileURL.path)
                } catch {
                    print("Error removing file at \(fileURL.path):", error.localizedDescription)
                }
            } else {
                print("Invalid URL string: \(fileURLString)")
            }
        }
    }
    
    /// Lists all audio files stored in the document directory.
    ///
    /// - Returns: An array of file URIs as strings.
    func listAudioFiles() -> [String] {
        guard let documentDirectory = try? FileManager.default.url(for: .documentDirectory, in: .userDomainMask, appropriateFor: nil, create: false) else {
            print("Failed to access document directory.")
            return []
        }
        
        do {
            let files = try FileManager.default.contentsOfDirectory(at: documentDirectory, includingPropertiesForKeys: nil)
            let audioFiles = files.filter { $0.pathExtension == "wav" }.map { $0.absoluteString }
            return audioFiles
        } catch {
            print("Error listing audio files:", error.localizedDescription)
            return []
        }
    }
    
    func onMicrophoneData(_ microphoneData: Data, _ soundLevel: Float?) {
        let encodedData = microphoneData.base64EncodedString()
        // Construct the event payload for microphone streaming (with audio data)
        let eventBody: [String: Any] = [
            "type": "microphone",
            "fileUri": "",
            "lastEmittedSize": 0,
            "position": 0, // Add position of the chunk in ms since
            "encoded": encodedData,
            "deltaSize": microphoneData.count,
            "totalSize": microphoneData.count,
            "mimeType": "",
            "streamUuid": UUID().uuidString,
            "soundLevel": soundLevel ?? -160
        ]
        // Emit the event to JavaScript
        sendEvent("AudioData", eventBody)
    }
    
    func onDeviceReconnected(_ reason: AVAudioSession.RouteChangeReason) {
        let reasonString: String
        switch reason {
        case .newDeviceAvailable:
            reasonString = "newDeviceAvailable"
        case .oldDeviceUnavailable:
            reasonString = "oldDeviceUnavailable"
        case .unknown, .categoryChange, .override, .wakeFromSleep, .noSuitableRouteForCategory, .routeConfigurationChange:
            reasonString = "unknown"
        @unknown default:
            reasonString = "unknown"
        }
        
        sendEvent("DeviceReconnected", ["reason": reasonString])
    }
    
    func onSoundChunkPlayed(_ isFinal: Bool) {
        sendEvent("SoundChunkPlayed", ["isFinal": isFinal])
    }
    
    func onSoundStartedPlaying() {
        sendEvent("SoundStarted")
    }
}
