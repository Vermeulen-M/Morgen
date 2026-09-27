import React, {useState, useEffect} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
} from 'react-native';
import {Camera, useCameraDevice, useCodeScanner} from 'react-native-vision-camera';
import {useTheme} from '../../theme';

const QRScanScreen = ({navigation, route}) => {
  const {colors} = useTheme();
  const {expectedCode, onSuccess} = route?.params || {};
  const device = useCameraDevice('back');
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: (codes) => {
      if (scanned) return;
      const value = codes?.[0]?.value;
      if (!value) return;

      setScanned(true);

      if (!expectedCode || value === expectedCode) {
        onSuccess && onSuccess();
        navigation.goBack();
      } else {
        setErrorMsg("Mauvais QR code — cherche celui de cette alarme !");
        setTimeout(() => {
          setScanned(false);
          setErrorMsg(null);
        }, 1600);
      }
    },
  });

  if (hasPermission === null) {
    return (
      <SafeAreaView style={[styles.center, {backgroundColor: colors.background}]}>
        <Text style={{color: colors.textSecondary}}>Demande d'accès à la caméra...</Text>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={[styles.center, {backgroundColor: colors.background, paddingHorizontal: 32}]}>
        <Text style={{color: colors.text, fontSize: 17, fontWeight: '700', textAlign: 'center', marginBottom: 12}}>
          Accès caméra refusé
        </Text>
        <Text style={{color: colors.textSecondary, textAlign: 'center', marginBottom: 28, lineHeight: 20}}>
          Active la permission caméra dans les paramètres du téléphone pour pouvoir scanner le QR code.
        </Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{backgroundColor: colors.accent, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14}}>
          <Text style={{color: '#fff', fontWeight: '700'}}>Retour</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!device) {
    return (
      <SafeAreaView style={[styles.center, {backgroundColor: colors.background}]}>
        <Text style={{color: colors.textSecondary}}>Aucune caméra disponible sur cet appareil</Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        codeScanner={codeScanner}
      />

      <SafeAreaView style={styles.overlay}>
        <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
          <View style={[styles.frame, errorMsg && {borderColor: '#FF3B30'}]} />
          <Text style={styles.hint}>
            {errorMsg || 'Vise le QR code caché dans ta maison'}
          </Text>
        </View>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelBtn}>
          <Text style={{color: '#fff', fontWeight: '700', fontSize: 14}}>Annuler</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#000'},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  overlay: {flex: 1, justifyContent: 'space-between'},
  frame: {
    width: 240, height: 240, borderRadius: 24,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.9)',
  },
  hint: {
    color: '#fff', fontSize: 14, fontWeight: '600',
    marginTop: 24, textAlign: 'center', paddingHorizontal: 32,
  },
  cancelBtn: {
    alignSelf: 'center', marginBottom: 40,
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14,
    paddingHorizontal: 32, paddingVertical: 14,
  },
});

export default QRScanScreen;
