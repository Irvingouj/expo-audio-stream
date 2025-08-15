import Foundation
import AVFoundation
import Accelerate
import ExpoModulesCore

class AudioSessionManager {
    // MARK: - Simple Recording Properties
    private var audioRecorder: AVAudioRecorder?
    
    /// Public getter for audioRecorder to allow delegate access
    var currentAudioRecorder: AVAudioRecorder? {
        return audioRecorder
    }
    private var meteringTimer: Timer?
    
    // MARK: - Playback Properties (keep existing for sound playback)
    private var audioEngine = AVAudioEngine()
    private var audioPlayerNode: AVAudioPlayerNode?
    private let audioFormat = AVAudioFormat(commonFormat: .pcmFormatFloat32, sampleRate: 16000.0, channels: 1, interleaved: false)
    private var bufferQueue: [(buffer: AVAudioPCMBuffer, promise: RCTPromiseResolveBlock, turnId: String)] = []
    private let bufferAccessQueue = DispatchQueue(label: "com.expoaudiostream.bufferAccessQueue")
    
    // MARK: - Recording State
    private var startTime: Date?
    private var pauseStartTime: Date?
    private var isPaused = false
    private var pausedDuration = 0
    private var fileManager = FileManager.default
    internal var recordingSettings: RecordingSettings?
    internal var recordingUUID: UUID?
    internal var mimeType: String = "audio/m4a"
    
    weak var delegate: AudioStreamManagerDelegate?

    init() {
        NotificationCenter.default.addObserver(self, selector: #selector(handleRouteChange), name: AVAudioSession.routeChangeNotification, object: nil)
    }
    
    /// Handles audio session interruptions.
    @objc func handleAudioSessionInterruption(notification: Notification) {
        guard let info = notification.userInfo,
              let typeValue = info[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: typeValue) else {
            return
        }
        
        Logger.debug("audio session interruption \(type)")
        if type == .began {
            // Pause your audio recording
        } else if type == .ended {
            if let optionsValue = info[AVAudioSessionInterruptionOptionKey] as? UInt {
                let options = AVAudioSession.InterruptionOptions(rawValue: optionsValue)
                if options.contains(.shouldResume) {
                    // Resume your audio recording
                    Logger.debug("Resume audio recording \(recordingUUID!)")
                    try? AVAudioSession.sharedInstance().setActive(true)
                }
            }
        }
    }
    
    @objc private func handleRouteChange(notification: Notification) {
        guard let info = notification.userInfo,
              let reasonValue = info[AVAudioSessionRouteChangeReasonKey] as? UInt,
              let reason = AVAudioSession.RouteChangeReason(rawValue: reasonValue) else {
            return
        }
        
        Logger.debug("Route is changed \(reason)")

        do {
            switch reason {
            case .newDeviceAvailable, .oldDeviceUnavailable:
                if let node = audioPlayerNode, self.audioEngine.isRunning, node.isPlaying {
                    node.pause()
                    node.stop()
                    self.audioEngine.stop()
                    self.destroyPlayerNode()
                    self.audioEngine = AVAudioEngine()
                } else {
                    if self.audioEngine.isRunning {
                       self.audioEngine.stop()
                    }
                    self.destroyPlayerNode()
                    try self.restartAudioSessionForPlayback()
                }
            case .categoryChange:
                print("Category Changed")
            default:
                break
            }
        } catch {
            Logger.debug("Change route if failed: Error \(error.localizedDescription)")
        }
    }
    
    /// Creates a new recording file.
    /// - Returns: The URL of the newly created recording file, or nil if creation failed.
    private func createRecordingFile() -> URL {
        let documentsDirectory = fileManager.urls(for: .documentDirectory, in: .userDomainMask).first!
        recordingUUID = UUID()
        let fileName = "\(recordingUUID!.uuidString).m4a"
        let fileURL = documentsDirectory.appendingPathComponent(fileName)
        return fileURL // No need to pre-create file for AVAudioRecorder
    }
    
    /// Describes the format of the given audio format.
    /// - Parameter format: The AVAudioFormat object to describe.
    /// - Returns: A string description of the audio format.
    func describeAudioFormat(_ format: AVAudioFormat) -> String {
        let sampleRate = format.sampleRate
        let channelCount = format.channelCount
        let bitDepth: String
        
        switch format.commonFormat {
        case .pcmFormatInt16:
            bitDepth = "16-bit Int"
        case .pcmFormatInt32:
            bitDepth = "32-bit Int"
        case .pcmFormatFloat32:
            bitDepth = "32-bit Float"
        case .pcmFormatFloat64:
            bitDepth = "64-bit Float"
        default:
            bitDepth = "Unknown Format"
        }
        
        return "Sample Rate: \(sampleRate), Channels: \(channelCount), Format: \(bitDepth)"
    }
    
    /// Processes audio chunk based on common format
    /// - Parameters:
    ///   - base64String: Base64 encoded audio data
    ///   - commonFormat: The common format of the audio data
    /// - Returns: Processed audio buffer or nil if processing fails
    /// - Throws: Error if format is unsupported
    private func processAudioChunk(_ base64String: String, commonFormat: AVAudioCommonFormat) throws -> AVAudioPCMBuffer? {
        switch commonFormat {
        case .pcmFormatFloat32:
            return AudioUtils.processFloat32LEAudioChunk(base64String, audioFormat: self.audioFormat!)
        case .pcmFormatInt16:
            return AudioUtils.processPCM16LEAudioChunk(base64String, audioFormat: self.audioFormat!)
        default:
            Logger.debug("[AudioSessionManager] Unsupported audio format: \(commonFormat)")
            throw SoundPlayerError.unsupportedFormat
        }
    }
    
    // MARK: - Simple Recording Methods
    
    /// Starts a new audio recording using the simple AVAudioRecorder approach.
    /// - Parameters:
    ///   - intervalMilliseconds: The interval in milliseconds for emitting volume data.
    /// - Returns: A StartRecordingResult object if recording starts successfully, or nil otherwise.
    /// - Note: Uses hardware defaults for all audio settings (sample rate, channels, bit depth).
    func startRecording(intervalMilliseconds: Int) -> StartRecordingResult? {
        guard audioRecorder?.isRecording != true else {
            Logger.debug("Recording is already in progress.")
            return StartRecordingResult(error: "Recording is already in progress.")
        }
        
        let session = AVAudioSession.sharedInstance()

        // 1. Configure the audio session
        do {
            try session.setCategory(.playAndRecord, mode: .default, options: .defaultToSpeaker)
            try session.setActive(true)
            Logger.debug("Audio session configured successfully")
        } catch {
            Logger.debug("Failed to set up audio session: \(error.localizedDescription)")
            return StartRecordingResult(error: "Failed to set up audio session: \(error.localizedDescription)")
        }
        
        // 2. Create recording file URL
        let fileURL = createRecordingFile()
        let sampleRate = session.sampleRate;

        // 3. Use modern, efficient M4A format for the recording
        let recorderSettings: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
            AVSampleRateKey: sampleRate,
            AVNumberOfChannelsKey: 1,
            AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue
        ]
        
        // 4. Create and start the recorder
        do {
            audioRecorder = try AVAudioRecorder(url: fileURL, settings: recorderSettings)
            
            // 5. ENABLE METERING! This is the key for volume feedback.
            audioRecorder!.isMeteringEnabled = true
            
            // 6. Start recording - this can fail, so check the return value
            guard audioRecorder!.record() else {
                Logger.debug("Failed to start recording - AVAudioRecorder.record() returned false")
                return StartRecordingResult(error: "Failed to start recording - AVAudioRecorder.record() returned false")
            }
            
            // 7. Start a timer to poll for the volume level
            let timerInterval = max(0.1, Double(intervalMilliseconds) / 1000.0) // At least 100ms
            Logger.debug("Creating metering timer with interval: \(timerInterval)s (from \(intervalMilliseconds)ms)")
            
            // Ensure timer is created on main thread and added to run loop
            DispatchQueue.main.async {
                self.meteringTimer = Timer.scheduledTimer(withTimeInterval: timerInterval, repeats: true) { [weak self] timer in
                    Logger.debug("Timer fired!")
                    self?.updateMeters()
                }
                // Ensure timer is added to main run loop
                RunLoop.main.add(self.meteringTimer!, forMode: .common)
                Logger.debug("Metering timer created and added to main run loop")
            }
            
            startTime = Date()
            recordingSettings = nil // No settings needed for simple recording
            
            Logger.debug("Simple recording started successfully with AVAudioRecorder.")
            
            // Return result based on our recorder settings
            return StartRecordingResult(
                fileUri: fileURL.absoluteString,
                mimeType: mimeType,
                sampleRate: sampleRate
            )
            
        } catch {
            Logger.debug("Failed to initialize AVAudioRecorder: \(error.localizedDescription)")
            return StartRecordingResult(error: "Failed to initialize AVAudioRecorder: \(error.localizedDescription)")
        }
    }
    
    /// Updates volume meters and emits volume to delegate
    @objc private func updateMeters() {
        Logger.debug("updateMeters() called")
        
        guard let audioRecorder = audioRecorder else {
            Logger.debug("audioRecorder is nil")
            return
        }
        
        guard audioRecorder.isRecording else {
            Logger.debug("audioRecorder is not recording")
            return
        }
        
        guard let delegate = delegate else {
            Logger.debug("delegate is nil - no one to send volume updates to")
            return
        }
        
        Logger.debug("audioRecorder is recording, updating meters")
        
        // Refresh the meter values
        audioRecorder.updateMeters()
        
        // Get the average power in decibels (-160.0 to 0.0)
        let averagePower = audioRecorder.averagePower(forChannel: 0)
        
        Logger.debug("averagePower: \(averagePower), calling delegate")
        
        // Send the volume to delegate (simplified - only volume, no audio data)
        delegate.audioSessionManager(self, didUpdateRecordingVolume: averagePower)
        
        Logger.debug("delegate call completed")
    }
    
    /// Stops the current audio recording using simple AVAudioRecorder.
    /// - Parameter completion: Completion handler called with the recording result.
    func stopRecording(completion: @escaping (RecordingResult?) -> Void) {
        guard audioRecorder?.isRecording == true else {
            Logger.debug("Recording is not active")
            completion(RecordingResult(fileUri: "", error: "Recording is not active"))
            return
        }
        
        
        // Stop the recorder
        audioRecorder?.stop()
        
        // Stop the metering timer
        meteringTimer?.invalidate()
        meteringTimer = nil
        
        // Create the result - the file is already finalized and correct by AVAudioRecorder
        let result = createRecordingResult()
        
        // Clean up
        audioRecorder = nil
        
        
        // Reset the audio session to playback mode
        resetAudioSessionToPlayback()
        
        Logger.debug("Simple recording stopped successfully")
        completion(result)
    }
    
    /// Resets audio session to playback mode after recording
    private func resetAudioSessionToPlayback() {
        do {
            let audioSession = AVAudioSession.sharedInstance()
            try audioSession.setCategory(.playback, mode: .default)
            try audioSession.setActive(false) // Deactivate first
            try audioSession.setActive(true)  // Then reactivate for playback
            Logger.debug("Audio session reset to playback mode")
        } catch {
            Logger.debug("Error resetting audio session for playback: \(error)")
        }
    }
    
    /// Creates recording result from current recording state
    private func createRecordingResult() -> RecordingResult {
        guard let audioRecorder = audioRecorder, let startTime = startTime else {
            Logger.debug("Recording data is nil")
            return RecordingResult(fileUri: "", error: "Recording data is nil")
        }
        
        let fileURL = audioRecorder.url
        let settings = audioRecorder.settings
        
        let endTime = Date()
        let duration = Int64(endTime.timeIntervalSince(startTime) * 1000) - Int64(pausedDuration * 1000)
        
        // Extract actual values from audioRecorder settings - only if we know them
        let channels = settings[AVNumberOfChannelsKey] as? Int
        let sampleRate = settings[AVSampleRateKey] as? Double
        
        // For M4A/AAC format, bit depth is not directly stored in settings
        // AAC is a lossy format, but we can estimate based on quality/bitrate if available
        let bitDepth: Int?
        if let audioQuality = settings[AVEncoderAudioQualityKey] as? Int {
            // Map audio quality to approximate bit depth equivalent
            switch audioQuality {
            case AVAudioQuality.min.rawValue:
                bitDepth = 8
            case AVAudioQuality.low.rawValue:
                bitDepth = 12
            case AVAudioQuality.medium.rawValue:
                bitDepth = 16
            case AVAudioQuality.high.rawValue, AVAudioQuality.max.rawValue:
                bitDepth = 16 // AAC high quality roughly equivalent to 16-bit
            default:
                bitDepth = nil // Unknown quality level
            }
        } else {
            bitDepth = nil // No quality information available
        }
        
        do {
            let fileAttributes = try FileManager.default.attributesOfItem(atPath: fileURL.path)
            let fileSize = fileAttributes[FileAttributeKey.size] as? Int64 ?? 0
            
            return RecordingResult(
                fileUri: fileURL.absoluteString,
                filename: fileURL.lastPathComponent,
                mimeType: mimeType,
                duration: duration,
                size: fileSize,
                channels: channels,
                bitDepth: bitDepth,
                sampleRate: sampleRate.map { Double(Int($0)) }
            )
        } catch {
            Logger.debug("Failed to fetch file attributes: \(error.localizedDescription)")
            return RecordingResult(fileUri: "", error: "Failed to fetch file attributes: \(error.localizedDescription)")
        }
    }
    
    // MARK: - Playback Methods (Keep existing for sound playback)
    
    func playAudio(_ chunk: String, _ turnId: String, commonFormat: AVAudioCommonFormat = .pcmFormatInt16, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
        do {
            guard let buffer = try processAudioChunk(chunk, commonFormat: commonFormat) else {
                Logger.debug("[AudioSessionManager] Failed to process audio chunk")
                rejecter("ERR_DECODE_AUDIO", "Failed to process audio chunk", nil)
                return
            }
            
            let bufferTuple = (buffer: buffer, promise: resolver, turnId: turnId)
            bufferQueue.append(bufferTuple)
            
            if self.audioPlayerNode == nil {
                Logger.debug("Player node is destroyed starting new one")
                do {
                    try self.restartAudioSessionForPlayback()
                } catch {
                    Logger.debug("Failed to restart Audio Session")
                    rejecter("ERR_START_PLAYBACK_SESSION", "Failed to restart to playback session", nil)
                    return
                }
            }
            
            do {
                Logger.debug("Engine is Running \(self.audioEngine.isRunning)")
                if !self.audioEngine.isRunning {
                    Logger.debug("Starting Engine Again")
                    try self.audioEngine.start()
                }
                
                Logger.debug("Player node is playing \(self.audioPlayerNode!.isPlaying)")
                if let playerNode = self.audioPlayerNode, !playerNode.isPlaying {
                    Logger.debug("Starting Player")
                    playerNode.play()
                }
                
                self.scheduleNextBuffer()
            } catch {
                Logger.debug("Error to start playback audio chunk \(error.localizedDescription)")
                rejecter("ERR_SCHEDULE_BUFFER", "Schedule playback failed: \(error.localizedDescription)", nil)
            }
        } catch {
            Logger.debug("[AudioSessionManager] Error processing audio: \(error.localizedDescription)")
            rejecter("ERR_PROCESS_AUDIO", "Failed to process audio: \(error.localizedDescription)", nil)
        }
    }
    
    func stopAudio(promise: Promise) {
        Logger.debug("Stopping Audio")
        if let playerNode = self.audioPlayerNode, playerNode.isPlaying {
            Logger.debug("Player is playing stopping")
            playerNode.stop()
        }
        if !self.bufferQueue.isEmpty {
            Logger.debug("Queue is not empty clearing")
            self.bufferQueue.removeAll()
        }
        self.destroyPlayerNode()
        promise.resolve(nil)
    }
    
    func cleanPlaybackQueue(_ turnId: String, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
        if !self.bufferQueue.isEmpty {
            Logger.debug("Clearing only items for turn id \(turnId)")
            self.bufferQueue.removeAll(where: { $0.turnId == turnId } )
            Logger.debug("Items left \(self.bufferQueue.count)")
        } else {
            Logger.debug("Queue is empty")
        }
        resolver(nil)
    }
    
    func pauseAudio(promise: Promise) {
        Logger.debug("Pausing Audio")
        if let node = audioPlayerNode, self.audioEngine.isRunning, node.isPlaying {
            Logger.debug("Pausing audio. Audio engine is running and player node is playing")
            node.pause()
            node.stop()
            self.audioEngine.stop()
            self.destroyPlayerNode()
            self.audioEngine = AVAudioEngine()
        } else {
            Logger.debug("Cannot pause: Engine is not running or node is unavailable.")
        }
        promise.resolve(nil)
    }
    
    private func restartAudioSessionForPlayback() throws {
        Logger.debug("Restarting Audio Session")
        let audioSession = AVAudioSession.sharedInstance()
        try audioSession.setCategory(.playback, mode: .voicePrompt)
        try audioSession.setActive(true)
        Logger.debug("Reattaching the nodes")
        self.audioEngine = AVAudioEngine()
        
        audioPlayerNode = AVAudioPlayerNode()
        audioEngine.attach(audioPlayerNode!)
        audioEngine.connect(audioPlayerNode!, to: audioEngine.mainMixerNode, format: self.audioFormat)
    }
    
    private func scheduleNextBuffer() {
        guard let audioNode = self.audioPlayerNode, self.audioEngine.isRunning, audioNode.isPlaying else {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) { // Check every 50 milliseconds
                self.scheduleNextBuffer()
            }
            return
        }

        self.bufferAccessQueue.async {
            if let (buffer, promise, _) = self.bufferQueue.first {
                self.bufferQueue.removeFirst()

                self.audioPlayerNode!.scheduleBuffer(buffer) {
                    promise(nil)

                    let bufferDuration = Double(buffer.frameLength) / buffer.format.sampleRate
                    if !self.bufferQueue.isEmpty {
                        DispatchQueue.main.asyncAfter(deadline: .now() + bufferDuration) {
                            self.scheduleNextBuffer()
                        }
                    }
                }
            }
        }
    }
    
    private func destroyPlayerNode() {
        Logger.debug("Destroying audio node")
        guard let playerNode = self.audioPlayerNode else { return }

        // Stop and detach the node
        if playerNode.isPlaying {
            Logger.debug("Destroying audio node player is playing, stopping it")
            playerNode.stop()
        }
        self.audioEngine.disconnectNodeOutput(playerNode)
        self.audioEngine.detach(playerNode)

        // Set to nil, ARC deallocates it if no other references exist
        self.audioPlayerNode = nil
    }
    
    /// Pauses the current audio recording.
    func pauseRecording() {
        guard audioRecorder?.isRecording == true && !isPaused else {
            Logger.debug("Recording is not in progress or already paused.")
            return
        }
        
        audioRecorder?.pause()
        isPaused = true
        pauseStartTime = Date()
        
        Logger.debug("Recording paused.")
    }
    
    /// Resumes the current audio recording.
    func resumeRecording() {
        guard audioRecorder?.isRecording == false && isPaused else {
            Logger.debug("Recording is not in progress or not paused.")
            return
        }
        
        audioRecorder?.record()
        isPaused = false
        if let pauseStartTime = pauseStartTime {
            pausedDuration += Int(Date().timeIntervalSince(pauseStartTime))
        }
        Logger.debug("Recording resumed.")
    }
    
    /// Clears all audio files stored in the document directory.
    func clearAudioFiles() {
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
    /// - Returns: An array of file URIs as strings.
    func listAudioFiles() -> [String] {
        guard let documentDirectory = try? FileManager.default.url(for: .documentDirectory, in: .userDomainMask, appropriateFor: nil, create: false) else {
            print("Failed to access document directory.")
            return []
        }
        
        do {
            let files = try FileManager.default.contentsOfDirectory(at: documentDirectory, includingPropertiesForKeys: nil)
            let audioFiles = files.filter { $0.pathExtension == "m4a" || $0.pathExtension == "wav" }.map { $0.absoluteString }
            return audioFiles
        } catch {
            print("Error listing audio files:", error.localizedDescription)
            return []
        }
    }
}
