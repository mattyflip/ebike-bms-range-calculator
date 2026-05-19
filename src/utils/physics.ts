export interface CalculationInputs {
  voltage: number;
  capacityAh: number;
  riderWeightLbs: number;
  bikeWeightLbs: number;
  ambientTempF: number;
  tireType: 'road' | 'knobby';
  tirePressurePsi: number;
  targetSpeedMph: number;
  elevationGainFeet: number;
  motorEfficiency: number;
}

export const calculateRange = (inputs: CalculationInputs, currentSoC: number) => {
  const {
    voltage,
    capacityAh,
    riderWeightLbs,
    bikeWeightLbs,
    ambientTempF,
    tireType,
    tirePressurePsi,
    targetSpeedMph,
    elevationGainFeet,
    motorEfficiency
  } = inputs;

  const massKg = (riderWeightLbs + bikeWeightLbs) * 0.453592;
  const velocityMps = targetSpeedMph * 0.44704;
  const rho = 1.225; // Air density

  // Rolling Resistance
  let Crr = tireType === 'road' ? 0.007 : 0.015;
  if (tirePressurePsi) {
    const refPsi = tireType === 'road' ? 40 : 25;
    Crr = Crr * (refPsi / tirePressurePsi);
  }
  const ForceRolling = Crr * massKg * 9.81;

  // Aerodynamic Drag
  const CdA = 0.55; // Typical ebike CdA
  const ForceDrag = 0.5 * rho * CdA * Math.pow(velocityMps, 2);

  // Power Calculation
  const PowerRequiredWatts = (ForceRolling + ForceDrag) * velocityMps / motorEfficiency;
  
  // Temperature Efficiency
  const tempEfficiency = ambientTempF < 70 ? Math.max(0.7, 1 - (70 - ambientTempF) * 0.005) : 1;
  
  const totalWhUsable = (voltage * capacityAh) * 0.92 * tempEfficiency;
  const startWh = totalWhUsable * (currentSoC / 100);
  
  // Elevation impact (rough estimate: 0.1Wh per foot of gain)
  const elevationWh = elevationGainFeet * 0.1;
  
  const remainingWh = startWh - elevationWh;
  
  // Adjusted miles calculation
  const whPerMile = (PowerRequiredWatts / (targetSpeedMph * 1.60934 / 3600)) * (3600 / 1609.34);
  const miles = remainingWh / whPerMile;

  return {
    miles: Math.max(0, miles),
    whPerMile: whPerMile,
    totalWhUsable: totalWhUsable
  };
};

export const getBatteryLevels = (nominalVoltage: number) => {
  if (nominalVoltage >= 72) return { min: 60, max: 84 };
  if (nominalVoltage >= 60) return { min: 48, max: 67.2 };
  if (nominalVoltage >= 52) return { min: 42, max: 58.8 };
  if (nominalVoltage >= 48) return { min: 39, max: 54.6 };
  if (nominalVoltage >= 36) return { min: 30, max: 42 };
  return { min: nominalVoltage * 0.8, max: nominalVoltage * 1.2 };
};
