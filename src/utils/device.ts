export const isIOS = () => {
  return [
    'iPad Simulator',
    'iPhone Simulator',
    'iPod Simulator',
    'iPad',
    'iPhone',
    'iPod'
  ].includes(navigator.platform)
  // iPad on iOS 13 detection
  || (navigator.userAgent.includes('Mac') && 'ontouchend' in document);
};

export const isBluetoothSupported = () => {
  return !!(navigator as any).bluetooth;
};

export const getBluetoothErrorMessage = () => {
  if (isIOS()) {
    return 'Web Bluetooth is not supported on iOS Safari. Standard iPhones block this feature. For iOS, a native app or a specialized browser like Bluefy is required.';
  }
  if (!isBluetoothSupported()) {
    return 'Your browser does not support Web Bluetooth. Please use Chrome or Brave on Android or Desktop.';
  }
  return null;
};
