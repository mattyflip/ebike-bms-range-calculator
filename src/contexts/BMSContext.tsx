import React, { createContext, useContext, useState, useEffect } from 'react';
import { bmsService, type BMSData } from '../services/bluetoothService';
import { isBluetoothSupported } from '../utils/device';

interface BMSContextType {
  isConnected: boolean;
  isConnecting: boolean;
  data: BMSData | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  error: string | null;
  isMockMode: boolean;
  toggleMockMode: () => void;
}

const BMSContext = createContext<BMSContextType | undefined>(undefined);

export const BMSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [data, setData] = useState<BMSData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMockMode, setIsMockMode] = useState(true);

  useEffect(() => {
    bmsService.onData((newData) => {
      setData(newData);
    });
  }, []);

  useEffect(() => {
    if (isConnected && isMockMode) {
      const interval = setInterval(() => {
        setData(prev => ({
          voltage: 52.4 + (Math.random() * 0.2),
          current: 5 + (Math.random() * 10),
          soc: prev ? Math.max(0, prev.soc - 0.01) : 85,
          temp: 25 + (Math.random() * 2)
        }));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isConnected, isMockMode]);

  const connect = async () => {
    if (!isBluetoothSupported() && !isMockMode) {
      setError('Bluetooth is not supported in this browser.');
      return;
    }

    setIsConnecting(true);
    setError(null);
    try {
      if (isMockMode) {
        await new Promise(resolve => setTimeout(resolve, 800));
        setData({ voltage: 52.5, current: 0, soc: 85, temp: 25 });
      } else {
        await bmsService.connect();
      }
      setIsConnected(true);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to BMS');
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    if (!isMockMode) bmsService.disconnect();
    setIsConnected(false);
    setData(null);
  };

  const toggleMockMode = () => setIsMockMode(!isMockMode);

  return (
    <BMSContext.Provider value={{ 
      isConnected, 
      isConnecting, 
      data, 
      connect, 
      disconnect, 
      error, 
      isMockMode, 
      toggleMockMode 
    }}>
      {children}
    </BMSContext.Provider>
  );
};

export const useBMS = () => {
  const context = useContext(BMSContext);
  if (context === undefined) {
    throw new Error('useBMS must be used within a BMSProvider');
  }
  return context;
};
