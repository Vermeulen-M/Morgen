import Sound from 'react-native-sound';

Sound.setCategory('Playback');

let alarmSound = null;

export const startAlarmSound = () => {
  if (alarmSound) {
    alarmSound.stop();
    alarmSound.release();
  }

  alarmSound = new Sound('alarm.mp3', Sound.MAIN_BUNDLE, (error) => {
    if (error) {
      console.log('Sound error:', error);
      return;
    }
    alarmSound.setNumberOfLoops(-1); // boucle infinie
    alarmSound.setVolume(1.0);
    alarmSound.play();
  });
};

export const stopAlarmSound = () => {
  if (alarmSound) {
    alarmSound.stop();
    alarmSound.release();
    alarmSound = null;
  }
};