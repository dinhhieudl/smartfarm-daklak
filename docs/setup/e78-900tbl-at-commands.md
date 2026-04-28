# E78-900TBL-01A — AT Command Quick Reference (ASR6505)

> Dev board for SmartFarm DakLak: connecting soil sensor to E870 LoRaWAN gateway
> 
> ⚠️ **This is the ASR6505 dev board version** — different from E78-DTU(900LN22) which uses chip 6601

## Hardware

| Spec | Value |
|------|-------|
| Board | E78-900TBL-01A |
| Chip | ASR6505 (Cortex-M4 + SX1262) |
| Interface | USB (virtual COM port) |
| Size | 70 × 36 mm |
| Freq | 868/915 MHz (AS923 compatible) |
| TX Power | 22 dBm |
| LoRaWAN | 1.0.3 |

## Connection

1. Connect board to PC via USB cable
2. Install USB driver (CH340 or CP2102 — check your board's USB-UART chip)
3. Open serial terminal (PuTTY, minicom, etc.)
4. Settings: **115200 baud, 8N1** (try 9600 if 115200 doesn't work)
5. Send `AT` → should respond `OK`

## ASR6505 AT Command Set

### Basic Commands

```
AT                        // Test connection → OK
AT+VER?                   // Firmware version
AT+ID?                    // Show DevEUI, DevAddr
AT+MODE=TEST              // Set test mode (required before LoRaWAN config)
AT+MODE=LORAWAN           // Set LoRaWAN mode
```

### LoRaWAN Configuration (OTAA)

```
AT+JOIN=OTAA              // OTAA join mode
AT+DEVEUI=XXXXXXXXXXXXXXXX   // Device EUI (16 hex, from ChirpStack)
AT+APPEUI=XXXXXXXXXXXXXXXX   // Application EUI (16 hex)
AT+APPKEY=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX  // App Key (32 hex)
AT+CLASS=A                // Class A
AT+DR=2                   // Data Rate (AS923 DR2 = SF10/125kHz)
AT+CH=0,9232,0,5          // Channel 0: 923.2 MHz, DR0-DR5
AT+CH=1,9234,0,5          // Channel 1: 923.4 MHz, DR0-DR5
AT+POWER=22               // TX Power 22 dBm
```

### Join & Send

```
AT+JOIN=1                 // Start join
AT+JOIN?                  // Check join status
AT+SEND=2:Hello           // Send string on port 2
AT+SEND=2:020300000008440C  // Send hex on port 2
AT+CMSGHEX=020300000008440C // Confirmed hex message
```

### Status

```
AT+RSSI?                  // Last RSSI
AT+SNR?                   // Last SNR
AT+DR?                    // Current data rate
AT+JOIN?                  // Join status
```

## ⚠️ Important Differences from E78-DTU(6601)

| Feature | E78-DTU (6601) | E78-900TBL (ASR6505) |
|---------|----------------|----------------------|
| Modbus passthrough | ✅ AT+MODBUS=1 | ❌ Not built-in |
| RS485 | ✅ Integrated | ❌ Need external module |
| AT command prefix | `AT+` | `AT+` (similar but different subcommands) |
| Baud default | 9600 | 115200 |
| Config tool | EByte RF Setting Tool | Same + AT commands |

## Sensor Integration Options

Since the ASR6505 dev board does NOT have built-in Modbus polling, you need one of:

### Option A: Add external RS485 module
```
E78-900TBL ──── USB ──── PC/MCU
                              │
                         UART (TX/RX)
                              │
                         ┌────┴────┐
                         │ MAX485  │
                         │ module  │
                         └────┬────┘
                              │ RS485 (A/B)
                         Soil Sensor
```

### Option B: Use STM32 MCU as middleman
```
STM32F103 ──── UART2 (RS485) ──── Soil Sensor
    │
    │ UART1
    │
E78-900TBL (UART pins, not USB)
```
The STM32 reads Modbus → encodes 16 bytes → sends via UART to E78 board.

### Option C: Use a different node for production
Consider:
- **RAK3172** (~$12): Has built-in RS485 + Modbus, AT command, LoRaWAN
- **SenseCAP S2100** (~$35): IP66, RS485 built-in, production-ready
- Keep E78-900TBL for **testing/development only**

## Quick Test (No Sensor)

Test LoRaWAN join with E870 gateway:

```
AT+MODE=LORAWAN
AT+DEVEUI=AABBCCDDEEFF0011
AT+APPEUI=0000000000000000
AT+APPKEY=00112233445566778899AABBCCDDEEFF
AT+CLASS=A
AT+DR=2
AT+JOIN=1
// Wait 5-10 seconds
AT+JOIN?
// Should show "joined" or "Joining"
```

## ChirpStack Registration

Same as E78-DTU:
1. ChirpStack → Applications → SmartFarm → Devices → Create
2. DevEUI: from `AT+ID?`
3. Device Profile: `Soil-Sensor-v1`
4. AppKey: must match `AT+APPKEY`
