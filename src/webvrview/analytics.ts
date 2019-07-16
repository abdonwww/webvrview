export default class Analytics {
  lastModeChangeTime: any;
  lastModeLabel: string;
  lastMode: number;

  MODE_LABELS = {
    0: 'UNKNOWN',
    1: 'NORMAL',
    2: 'MAGIC_WINDOW',
    3: 'VR'
  };

  constructor() {
    (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
      (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
        m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
    })(window,document,'script','//www.google-analytics.com/analytics.js','ga');

    ga('create', 'UA-35315454-8', 'auto');
    ga('send', 'pageview');

    this.lastModeChangeTime = window.performance.now();
    this.lastModeLabel = this.MODE_LABELS[0];
  }

  logModeChanged(mode: number) {
    const modeLabel = this.MODE_LABELS[mode];
    const lastModeLabel = this.MODE_LABELS[this.lastMode];
  
    console.log('Analytics: going from mode %s to %s', lastModeLabel, modeLabel);
  
    ga('send', 'screenview', {
      appName: 'EmbedVR',
      screenName: modeLabel
    });
  
    var now = window.performance.now();
    var msSinceLastModeChange = Math.round(now - this.lastModeChangeTime);
    ga('send', 'timing', 'Time spent in mode', lastModeLabel, msSinceLastModeChange);
  
    this.lastModeChangeTime = now;
    this.lastMode = mode;
  }
}

// window.analytics = new Analytics();