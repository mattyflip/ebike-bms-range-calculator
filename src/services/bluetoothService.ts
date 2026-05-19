/// <reference types="web-bluetooth" />

export interface BMSData {
  voltage: number;
  current: number;
  soc: number;
  temp: number;
}

export type BMSCallback = (data: BMSData) => void;

class BluetoothService {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private notifyChar: BluetoothRemoteGATTCharacteristic | null = null;
  private writeChar: BluetoothRemoteGATTCharacteristic | null = null;
  private callbacks: BMSCallback[] = [];
  private dataBuffer: number[] = [];
  private isReconnecting: boolean = false;

  async connect(): Promise<void> {
    try {
      this.device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [0xff00, 0xffe0, "battery_service", 0xfee0]
      });

      if (this.device) {
        this.device.addEventListener("gattserverdisconnected", this.handleDisconnect.bind(this));
        await this.establishGATTConnection();
      }
    } catch (error) {
      console.error("Bluetooth connection failed:", error);
      throw error;
    }
  }

  private async establishGATTConnection() {
    if (!this.device) return;
    
    try {
      console.log("Connecting to GATT Server...");
      this.server = await this.device.gatt?.connect() || null;
      
      if (!this.server) throw new Error("GATT Server connection failed");

      const services = await this.server.getPrimaryServices();
      
      for (const service of services) {
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          const props = char.properties;
          if (props.notify || props.indicate) this.notifyChar = char;
          if (props.write || props.writeWithoutResponse) this.writeChar = char;
        }
      }

      if (this.notifyChar) {
        await this.notifyChar.startNotifications();
        this.notifyChar.addEventListener("characteristicvaluechanged", this.handleData.bind(this));
        console.log("Notifications re-established");
      }

      if (this.writeChar) {
        this.startQueryLoop();
      }
      
      this.isReconnecting = false;
    } catch (e) {
      console.error("Failed to establish GATT channels:", e);
      this.handleDisconnect();
    }
  }

  private async startQueryLoop() {
    const queryCommand = new Uint8Array([0xDD, 0xA5, 0x03, 0x00, 0xFF, 0xFD, 0x77]);
    
    const poll = async () => {
      if (!this.device?.gatt?.connected) {
        console.log("Device disconnected, stopping poll loop.");
        return;
      }

      if (this.writeChar) {
        try {
          await this.writeChar.writeValue(queryCommand);
          setTimeout(poll, 2000);
        } catch (e) {
          console.error("Poll write failed, connection might be unstable.", e);
          // Don't restart loop here, wait for handleDisconnect to trigger
        }
      }
    };
    poll();
  }

  private handleData(event: any) {
    const value = event.target.value as DataView;
    for (let i = 0; i < value.byteLength; i++) {
      this.dataBuffer.push(value.getUint8(i));
    }

    if (this.dataBuffer[0] === 0xDD && this.dataBuffer[this.dataBuffer.length - 1] === 0x77) {
      this.parseJBDPacket(new Uint8Array(this.dataBuffer));
      this.dataBuffer = [];
    } else if (this.dataBuffer.length > 100) {
      this.dataBuffer = [];
    }
  }

  private parseJBDPacket(packet: Uint8Array) {
    try {
      const voltage = ((packet[4] << 8) | packet[5]) / 100;
      let currentRaw = (packet[6] << 8) | packet[7];
      if (currentRaw > 0x7FFF) currentRaw -= 0x10000;
      const current = currentRaw / 100;
      const soc = packet[23];
      const tempK = ((packet[27] << 8) | packet[28]) / 10;
      const tempF = (tempK - 273.15) * 9/5 + 32;

      this.notifyCallbacks({ voltage, current, soc, temp: Math.round(tempF) });
    } catch (e) {
      console.error("JBD Parse Error", e);
    }
  }

  private async handleDisconnect() {
    console.log("BMS Disconnected.");
    this.server = null;
    this.notifyChar = null;
    this.writeChar = null;
    this.dataBuffer = [];

    // Attempt ONE auto-reconnect if it was unexpected
    if (this.device && !this.isReconnecting) {
      console.log("Attempting automatic reconnection...");
      this.isReconnecting = true;
      setTimeout(() => this.establishGATTConnection(), 2000);
    }
  }

  onData(callback: BMSCallback) {
    this.callbacks.push(callback);
  }

  private notifyCallbacks(data: BMSData) {
    this.callbacks.forEach(cb => cb(data));
  }

  disconnect() {
    this.isReconnecting = true; // Prevent auto-reconnect when user clicks disconnect
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    this.device = null;
  }
}

export const bmsService = new BluetoothService();
