import Util from '../util';

/**
 * A proxy class for working around the fact that as soon as a video is play()ed
 * on iOS, Safari auto-fullscreens the video.
 *
 * TODO(smus): The entire raison d'etre for this class is to work around this
 * issue. Once Safari implements some way to suppress this fullscreen player, we
 * can remove this code.
 */
export default class VideoProxy {
  videoElement: any;
  audioElement: any;
  isFakePlayback: boolean;
  startTime: any;

  constructor(videoElement: any) {
    this.videoElement = videoElement;
    // True if we're currently manually advancing the playhead (only on iOS).
    this.isFakePlayback = false;
  
    // When the video started playing.
    this.startTime = null;
  }

  play() {
    if (Util.isIOS9OrLess()) {
      this.startTime = window.performance.now();
      this.isFakePlayback = true;
  
      // Make an audio element to playback just the audio part.
      this.audioElement = new Audio();
      this.audioElement.src = this.videoElement.src;
      this.audioElement.play();
    } else {
      this.videoElement.play().then(function(e: any) {
        console.log('Playing video.', e);
      });
    }
  }

  pause() {
    if (Util.isIOS9OrLess() && this.isFakePlayback) {
      this.isFakePlayback = true;
  
      this.audioElement.pause();
    } else {
      this.videoElement.pause();
    }
  }

  setVolume(volumeLevel: number) {
    if (this.videoElement) {
      // On iOS 10, the VideoElement.volume property is read-only. So we special
      // case muting and unmuting.
      if (Util.isIOS()) {
        this.videoElement.muted = (volumeLevel === 0);
      } else {
        this.videoElement.volume = volumeLevel;
      }
    }
    if (this.audioElement) {
      this.audioElement.volume = volumeLevel;
    }
  }

  /**
   * Set the attribute mute of the elements according with the muteState param.
   *
   * @param bool muteState
   */
  mute(muteState: boolean) {
    if (this.videoElement) {
      this.videoElement.muted = muteState;
    }
    if (this.audioElement) {
      this.audioElement.muted = muteState;
    }
  }

  getCurrentTime() {
    return Util.isIOS9OrLess() ? this.audioElement.currentTime : this.videoElement.currentTime;
  };

  /**
   *
   * @param {Object} time
   */
  setCurrentTime(time: any) {
    if (this.videoElement) {
      this.videoElement.currentTime = time.currentTime;
    }
    if (this.audioElement) {
      this.audioElement.currentTime = time.currentTime;
    }
  }

  /**
   * Called on RAF to progress playback.
   */
  update() {
    // Fakes playback for iOS only.
    if (!this.isFakePlayback) {
      return;
    }
    var duration = this.videoElement.duration;
    var now = window.performance.now();
    var delta = now - this.startTime;
    var deltaS = delta / 1000;
    this.videoElement.currentTime = deltaS;
  
    // Loop through the video
    if (deltaS > duration) {
      this.startTime = now;
      this.videoElement.currentTime = 0;
      // Also restart the audio.
      this.audioElement.currentTime = 0;
    }
  }
}
