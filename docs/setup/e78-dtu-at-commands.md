# E78-DTU(900LN22) — AT Command Quick Reference (Chip 6601)

> ⚠️ **This is for the E78-DTU(900LN22) with chip 6601** — NOT the E78-900TBL-01A dev board (ASR6505)
> The user's actual board is E78-900TBL-01A → see `e78-900tbl-at-commands.md` instead
> 
> For SmartFarm DakLak: connecting soil sensor to E870 LoRaWAN gateway

## Connection

Connect E78-DTU to PC via RS485-to-USB adapter (or UART debug port).
Terminal settings: **9600 baud, 8N1**

## LoRaWAN Configuration (OTAA)

```
AT+MODE=LORAWAN              // Set LoRaWAN mode
AT+JOIN=OTAA                 // OTAA join mode
AT+DEVEUI=XXXXXXXXXXXXXXXX   // Device EUI (16 hex, from ChirpStack)
AT+APPEUI=XXXXXXXXXXXXXXXX   // Application EUI (16 hex)
AT+APPKEY=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX  // App Key (32 hex)
AT+CLASS=A                   // Class A (battery-friendly)
AT+DR=2                      // Data Rate (AS923 DR2 = SF10/125kHz)
AT+BAND=7                    // Frequency band (AS923)
AT+PORT=2                    // Uplink port
AT+TXC=2                     // Confirmed uplink retries
```

## Modbus Polling Configuration

```
AT+MODBUS=1                  // Enable Modbus passthrough
AT+MBADDR=0x02               // Sensor slave address (default 0x02)
AT+MBFUNC=0x03               // Function code: Read Holding Registers
AT+MBREG=0x0000              // Start register address
AT+MBLEN=8                   // Number of registers to read
AT+MBINTV=300                // Poll interval in seconds (300 = 5 min)
```

## Join & Verify

```
AT+JOIN=1                    // Start join process
AT+JOIN?                     // Check join status
AT+DEVEUI?                   // Verify DevEUI
AT+RSSI?                     // Check signal strength after join
AT+SNR?                      // Check signal-to-noise ratio
```

## Status Commands

```
AT+MODE?                     // Current mode
AT+JOIN?                     // Join status
AT+DR?                       // Current data rate
AT+BAND?                     // Frequency band
AT+RSSI?                     // RSSI (dBm)
AT+SNR?                      // SNR (dB)
AT+MODBUS?                   // Modbus polling status
```

## Troubleshooting

| Issue | Command | Expected |
|-------|---------|----------|
| Can't join | `AT+JOIN?` | Should show "joined" after a few seconds |
| No data | `AT+MODBUS?` | Should show enabled=1, interval=300 |
| Weak signal | `AT+RSSI?` | Should be > -120 dBm |
| Wrong region | `AT+BAND?` | Should be 7 (AS923) |

## Register in ChirpStack

1. Open ChirpStack → Applications → SmartFarm → Devices → Create
2. Enter DevEUI from `AT+DEVEUI?`
3. Set Device Profile: `Soil-Sensor-v1`
4. Set AppKey (must match `AT+APPKEY`)
5. Wait for join → Status = "Active"

## Sensor Data Format (16 bytes)

| Byte | Register | Parameter | Unit | Resolution |
|------|----------|-----------|------|------------|
| 0-1 | 0x0000 | Temperature | °C | signed, ÷10 |
| 2-3 | 0x0001 | Moisture | %VWC | unsigned, ÷10 |
| 4-5 | 0x0002 | EC | µS/cm | unsigned, direct |
| 6-7 | 0x0003 | Salinity | ppm | unsigned, direct |
| 8-9 | 0x0004 | Nitrogen N | mg/kg | unsigned, direct |
| 10-11 | 0x0005 | Phosphorus P | mg/kg | unsigned, direct |
| 12-13 | 0x0006 | Potassium K | mg/kg | unsigned, direct |
| 14-15 | 0x0007 | pH | — | unsigned, ÷10 |
