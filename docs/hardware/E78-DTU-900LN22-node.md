# E78-DTU(900LN22) - LoRaWAN Node Data Transceiver

> Source: https://www.cdebyte.com/products/E78-DTU(900LN22)
> Status: ✅ Đã có trong bộ hardware

## Overview

The E78-DTU(900LN22) is a **standard LoRaWAN node data transceiver** designed and produced by Ebyte (Chengdu). It bridges RS485 sensors to a LoRaWAN network, designed for industrial IoT and precision agriculture applications.

**This is the LoRaWAN-compatible node that pairs with the E870-L915LG12 gateway.**

## Key Specifications

| Parameter | Value |
|-----------|-------|
| **Chip** | 6601 (ARM Cortex-M4) |
| **Protocol** | LoRaWAN 1.0.3 |
| **Frequency** | 868/915 MHz (AS923 compatible) |
| **TX Power** | 22 dBm (0.16W) |
| **Range** | ~3 km (line of sight) |
| **Interface** | RS485 + UART |
| **Join Mode** | OTAA / ABP |
| **Size** | 100 × 84 × 25 mm |
| **Weight** | 120g |

## Why E78 + E870 Works

```
E78-DTU(900LN22)                     E870-L915LG12
┌──────────────────┐                 ┌──────────────────┐
│ LoRaWAN 1.0.3    │  AS923 band     │ LoRaWAN          │
│ OTAA/ABP join    │ ◀══════════════▶│ SX1302 concentrator│
│ AES-128 encrypt  │  Uplink/DL      │ Packet forwarder  │
│ RS485 Modbus     │                 │ Ethernet/WiFi     │
└──────────────────┘                 └──────────────────┘
         ✅ CÙNG PROTOCOL — TƯƠNG THÍCH
```

## AT Command Configuration

### LoRaWAN Setup

```
AT+MODE=LORAWAN           // Set LoRaWAN mode
AT+JOIN=OTAA              // OTAA join mode
AT+DEVEUI=xxxxxxxx        // Device EUI (from ChirpStack)
AT+APPEUI=xxxxxxxx        // Application EUI
AT+APPKEY=xxxxxxxxxxxxxxxx // App Key (32 hex chars)
AT+CLASS=A                // Class A (battery friendly)
AT+DR=2                   // Data Rate (AS923 DR2 = SF10/125kHz)
AT+PORT=2                 // Uplink port number
AT+TXC=2                  // Retry count
AT+JOIN=1                 // Start joining network
```

### Modbus Polling (Auto-read sensor)

```
AT+MODBUS=1               // Enable Modbus polling
AT+MBADDR=0x02            // Sensor slave address
AT+MBFUNC=0x03            // Function: Read Holding Registers
AT+MBREG=0x0000           // Start register address
AT+MBLEN=8                // Number of registers to read
AT+MBINTV=300             // Poll interval (seconds)
```

### Query Current Config

```
AT+DEVEUI?                // Get Device EUI
AT+JOIN?                  // Get join status
AT+RSSI?                  // Get last RSSI
AT+SNR?                   // Get last SNR
```

## Wiring to Soil Sensor

```
E78-DTU(900LN22)              Soil Multi-Parameter Sensor
┌──────────────────┐          ┌──────────────────┐
│ RS485 Terminal   │          │ Cable            │
│                  │  RS485   │                  │
│  A (+) ──────────┼── A ────┼── A (yellow)     │
│  B (-) ──────────┼── B ────┼── B (blue)       │
│  GND ────────────┼── GND ──┼── GND (black)    │
│  VCC ────────────┼── 12V ──┼── VCC (red)      │
│                  │          │                  │
│ LoRa Antenna     │          │ Probes → Soil    │
│  ┌───┐           │          │                  │
│  │915│           │          │                  │
│  └───┘           │          │                  │
└──────────────────┘          └──────────────────┘
```

## Sensor Register Map (Quick Reference)

| Register | Content | Format | Unit |
|----------|---------|--------|------|
| 0 | Temperature | signed, ÷10 | °C |
| 1 | Moisture | unsigned, ÷10 | % VWC |
| 2 | EC | unsigned, direct | µS/cm |
| 3 | Salinity | unsigned, direct | — |
| 4 | Nitrogen (N) | unsigned, direct | mg/kg |
| 5 | Phosphorus (P) | unsigned, direct | mg/kg |
| 6 | Potassium (K) | unsigned, direct | mg/kg |
| 7 | pH | unsigned, ÷10 | pH |

## PDF Datasheet

Download: https://www.cdebyte.com/downpdf/283

## Purchase

https://detail.tmall.com/item.htm?id=597799343037
