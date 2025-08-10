protocol AudioStreamManagerDelegate: AnyObject {
    func audioSessionManager(_ manager: AudioSessionManager, didUpdateRecordingVolume soundLevel: Float)
}
