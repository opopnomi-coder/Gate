import React from 'react';
import { PermissionsAndroid, Platform, ViewStyle, StyleSheet } from 'react-native';
import { Camera as RNCameraKit } from 'react-native-camera-kit';

export const CameraModule = {
  async requestCameraPermissionsAsync(): Promise<{ status: 'granted' | 'denied' }> {
    if (Platform.OS !== 'android') {
      return { status: 'granted' };
    }
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
    return { status: result === PermissionsAndroid.RESULTS.GRANTED ? 'granted' : 'denied' };
  },
};

type CameraViewProps = {
  style?: ViewStyle;
  facing?: 'front' | 'back';
  onBarcodeScanned?: (event: { data: string }) => void;
  barcodeScannerSettings?: { barcodeTypes?: string[] };
  children?: React.ReactNode;
};

export const CameraView: React.FC<CameraViewProps> = ({
  style,
  facing = 'back',
  onBarcodeScanned,
  barcodeScannerSettings,
  children,
}) => {
  return (
    <>
      <RNCameraKit
        style={[StyleSheet.absoluteFill, style]}
        cameraType={facing as any}
        scanBarcode
        showFrame={false}
        allowedBarcodeTypes={barcodeScannerSettings?.barcodeTypes as any}
        onReadCode={(event: any) => {
          const data = event?.nativeEvent?.codeStringValue;
          if (data && onBarcodeScanned) {
            onBarcodeScanned({ data });
          }
        }}
      />
      {children}
    </>
  );
};

export { CameraModule as Camera };
