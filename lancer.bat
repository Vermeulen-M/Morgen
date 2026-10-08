@echo off
title Morgen - lancement
cd /d C:\Users\Vermeulen\AlarmChallenge

echo [1/4] Arret des anciens Metro sur le port 8081...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8081 ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>&1

echo [2/4] Demarrage de Metro...
start "Metro" cmd /k "cd /d C:\Users\Vermeulen\AlarmChallenge && npx react-native start --reset-cache"
timeout /t 15 /nobreak >nul

echo [3/4] Branchement du telephone et compilation...
adb reverse tcp:8081 tcp:8081
start "Build Android" cmd /k "cd /d C:\Users\Vermeulen\AlarmChallenge && npx react-native run-android"

echo [4/4] Fenetre des logs (erreurs de l'app)...
adb logcat -c
start "Logs Morgen" cmd /k "adb logcat *:S ReactNativeJS:V"

echo.
echo Tout est lance. Tu peux fermer cette fenetre.
pause
