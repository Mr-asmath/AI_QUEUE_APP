<div align="center">

  <img src="https://readme-typing-svg.demolab.com?font=Segoe+UI&weight=800&size=28&duration=2600&pause=650&color=38BDF8&center=true&vCenter=true&width=820&lines=TV+Cast+%2F+External+Display+Mode;HDMI+%E2%80%A2+Smart+TV+URL+%E2%80%A2+Bluetooth+%2F+WiFi;Live+Queue+Display+for+Public+Screens" alt="TV Cast animated title" />

  <br />

  <img src="https://img.shields.io/badge/HDMI-Fullscreen-0EA5E9?style=for-the-badge" alt="HDMI" />
  <img src="https://img.shields.io/badge/Smart%20TV-URL-14B8A6?style=for-the-badge" alt="Smart TV URL" />
  <img src="https://img.shields.io/badge/Bluetooth%20%2F%20WiFi-Device%20Payload-7C3AED?style=for-the-badge" alt="Bluetooth WiFi" />
  <img src="https://img.shields.io/badge/Sync-3s%20Polling-22C55E?style=for-the-badge" alt="3 second sync" />

</div>

# TV Cast / External Display Mode

> Public queue screen for TVs, HDMI displays, smart browsers, Raspberry Pi, mini PCs, tablets, and custom queue hardware.

<details open>
<summary><strong>Display Modes</strong></summary>

- HDMI Display Mode
- Website URL Display Mode
- Bluetooth / WiFi Display Mode

</details>

## Local setup

1. Start the backend and frontend as usual.
2. Sign in as a queue operator, industry admin, or main admin.
3. Open Profile.
4. Select TV Cast.

## HDMI Display Mode

1. Connect the TV with HDMI.
2. Click Open HDMI Display Mode.
3. Move the new browser tab/window to the TV screen.
4. Click Full Screen on the TV display page.

## Website URL Display Mode

1. Open Profile > TV Cast.
2. Copy the generated Display URL.
3. Open the URL on a smart TV browser, Android TV, Fire TV, Raspberry Pi, mini PC, laptop, or tablet.
4. Use the QR code to open the same URL from another device.

Example:

```text
/tv-display/:branchId/:counterId
```

## Bluetooth / WiFi Display Mode

1. Open Profile > TV Cast.
2. Click Bluetooth / WiFi Connect.
3. Use Scan Devices when Web Bluetooth is supported.
4. For WiFi/local hardware, enter the receiver endpoint, for example:

```text
http://192.168.1.50/queue
```

The app sends queue data only:

```json
{
  "currentToken": "A102",
  "nextToken": "A103",
  "counter": "03",
  "serviceProvider": "Dr. Kumar",
  "status": "Serving",
  "message": "Token A102 please proceed to Counter 03"
}
```

If Bluetooth is unsupported, use HDMI Display Mode or Website URL Display.
