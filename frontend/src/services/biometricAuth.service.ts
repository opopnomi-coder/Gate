import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactNativeBiometrics from 'react-native-biometrics';
import * as Keychain from 'react-native-keychain';

const SESSION_KEY = '@mygate_biometric_session';
const PIN_AUTH_SERVICE = 'mygate_pin_auth';

export const biometricAuthService = {
  /** Arm the session flag — stored in AsyncStorage so it survives process kill */
  async markSessionActive(): Promise<void> {
    await AsyncStorage.setItem(SESSION_KEY, '1');
  },

  /** Clear the session flag */
  async clearSession(): Promise<void> {
    await AsyncStorage.removeItem(SESSION_KEY);
    try { await Keychain.resetGenericPassword({ service: PIN_AUTH_SERVICE }); } catch {}
  },

  /** Returns true if the app was killed while a user was logged in */
  async hasSessionFlag(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(SESSION_KEY);
      return value === '1';
    } catch {
      return false;
    }
  },

  /** Biometric only (fingerprint/face) */
  async authenticateBiometric(): Promise<{ success: boolean; error?: string }> {
    try {
      const rnBiometrics = new ReactNativeBiometrics({ allowDeviceCredentials: false });
      const result = await rnBiometrics.simplePrompt({
        promptMessage: 'Use fingerprint to authenticate',
        cancelButtonText: 'Cancel',
        allowDeviceCredentials: false,
      });
      if (result.success) return { success: true };
      return { success: false, error: 'Biometric authentication failed' };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Biometric authentication failed' };
    }
  },

  /**
   * Device credential only (PIN / pattern / password).
   * Only called when user explicitly taps the PIN button on BiometricGateScreen.
   */
  async authenticateDeviceCredential(): Promise<{ success: boolean; error?: string }> {
    try {
      // Write the protected entry fresh each time so it's always present
      await Keychain.setGenericPassword('pin_auth', 'verified', {
        service: PIN_AUTH_SERVICE,
        accessControl: Keychain.ACCESS_CONTROL.DEVICE_PASSCODE,
        accessible: Keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
      });

      const result = await Keychain.getGenericPassword({
        service: PIN_AUTH_SERVICE,
        accessControl: Keychain.ACCESS_CONTROL.DEVICE_PASSCODE,
        authenticationPrompt: {
          title: 'Verify your identity',
          description: 'Enter your PIN, pattern or password',
          cancel: 'Cancel',
        },
      });
      if (result && (result as any).password === 'verified') {
        return { success: true };
      }
      return { success: false, error: 'Authentication failed' };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Authentication failed' };
    }
  },

  /** Legacy */
  async authenticate(): Promise<{ success: boolean; error?: string }> {
    return this.authenticateDeviceCredential();
  },
};

