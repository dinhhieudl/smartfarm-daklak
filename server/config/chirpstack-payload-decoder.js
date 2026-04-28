/**
 * ChirpStack Payload Decoder - SmartFarm DakLak
 * 
 * Soil Multi-Parameter Sensor (RS485 Modbus RTU)
 * Decodes 16 bytes (8 registers × 2 bytes, big-endian)
 * 
 * Register map:
 *   0: Temperature  (signed,   ÷10 → °C)
 *   1: Moisture     (unsigned, ÷10 → %VWC)
 *   2: EC           (unsigned, direct → µS/cm)
 *   3: Salinity     (unsigned, direct → ppm)
 *   4: Nitrogen N   (unsigned, direct → mg/kg)
 *   5: Phosphorus P (unsigned, direct → mg/kg)
 *   6: Potassium K  (unsigned, direct → mg/kg)
 *   7: pH           (unsigned, ÷10 → pH)
 */

function decodeUplink(input) {
    var bytes = input.bytes;
    var decoded = {};
    var warnings = [];

    if (bytes.length < 16) {
        return {
            errors: ['Payload too short: ' + bytes.length + ' bytes (expected 16)'],
            data: {}
        };
    }

    // Register 0: Temperature (signed 16-bit, ÷10)
    var tempRaw = (bytes[0] << 8) | bytes[1];
    if (tempRaw > 0x7FFF) {
        tempRaw = tempRaw - 0x10000;  // Two's complement
    }
    decoded.temperature = tempRaw / 10.0;

    // Register 1: Moisture (unsigned 16-bit, ÷10)
    decoded.moisture = ((bytes[2] << 8) | bytes[3]) / 10.0;

    // Register 2: EC (unsigned 16-bit, direct)
    decoded.ec = (bytes[4] << 8) | bytes[5];

    // Register 3: Salinity (unsigned 16-bit, direct)
    decoded.salinity = (bytes[6] << 8) | bytes[7];

    // Register 4: Nitrogen (unsigned 16-bit, mg/kg)
    decoded.nitrogen = (bytes[8] << 8) | bytes[9];

    // Register 5: Phosphorus (unsigned 16-bit, mg/kg)
    decoded.phosphorus = (bytes[10] << 8) | bytes[11];

    // Register 6: Potassium (unsigned 16-bit, mg/kg)
    decoded.potassium = (bytes[12] << 8) | bytes[13];

    // Register 7: pH (unsigned 16-bit, ÷10)
    decoded.ph = ((bytes[14] << 8) | bytes[15]) / 10.0;

    // Sanity checks
    if (decoded.temperature < -40 || decoded.temperature > 80) {
        warnings.push('Temperature out of range: ' + decoded.temperature + '°C');
    }
    if (decoded.moisture < 0 || decoded.moisture > 100) {
        warnings.push('Moisture out of range: ' + decoded.moisture + '%');
    }
    if (decoded.ph < 0 || decoded.ph > 14) {
        warnings.push('pH out of range: ' + decoded.ph);
    }

    var result = { data: decoded };
    if (warnings.length > 0) {
        result.warnings = warnings;
    }
    return result;
}

// For ChirpStack v3 compatibility
function Decode(fPort, bytes, variables) {
    var result = decodeUplink({ bytes: bytes });
    return result.data;
}
