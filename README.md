# GUT-VNC

**Screen Sharing Classroom Application for Windows**

---

## English 🇬🇧

### Overview

GUT-VNC is a VNC-like screen sharing application designed for classroom environments. It enables teachers to broadcast their screen to students over a local network without requiring internet connectivity.

### Features

- 📺 **Screen Broadcasting** - Teachers can share their entire screen or a specific window
- 👥 **Student Reactions** - Students can send reactions (raise hand, thumbs up, question, confused)
- ✏️ **Live Annotations** - Teachers can draw on their screen with various tools
- 🔍 **LAN Discovery** - Automatic teacher discovery on the local network via mDNS
- ⚡ **Optimized for WiFi** - Adaptive bitrate for smooth streaming on low-quality networks
- 🔒 **Local Only** - No cloud services, all communication stays on the LAN

### System Requirements

- Windows 10/11
- Node.js 18+ (for development)
- Local network connection (WiFi or Ethernet)

### Installation

#### For Users

Download the latest installer from the [Releases](https://github.com/yourusername/gut-vnc/releases) page and run it on your Windows machine.

#### For Developers

```bash
# Clone the repository
git clone https://github.com/yourusername/gut-vnc.git
cd gut-vnc

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Create Windows installer
npm run dist
```

### Usage

#### For Teachers

1. Launch the application and select **"Nauczyciel"** (Teacher)
2. Click **"Rozpocznij Lekcję"** (Start Lesson) to begin broadcasting
3. Select the screen or window you want to share
4. Students will automatically discover your session on the network
5. Use the annotation toolbar to draw on your screen
6. Monitor student reactions in real-time
7. Use the controls to pause or blank the screen when needed

#### For Students

1. Launch the application and select **"Uczeń"** (Student)
2. The app will automatically find available teachers on the network
3. Click **"Dołącz"** (Join) to connect to a lesson
4. View the teacher's screen in real-time
5. Use the reaction buttons to communicate non-verbally

### Architecture

- **Electron** - Cross-platform desktop application framework
- **React** - UI framework for the interface
- **TypeScript** - Type-safe JavaScript
- **WebRTC** - Peer-to-peer video streaming
- **WebSocket** - Real-time signaling and reactions
- **mDNS/Bonjour** - Local network service discovery

---

## Polski 🇵🇱

### Przegląd

GUT-VNC to aplikacja do udostępniania ekranu w stylu VNC, zaprojektowana dla środowisk szkolnych. Umożliwia nauczycielom transmitowanie ekranu do uczniów przez sieć lokalną bez potrzeby połączenia internetowego.

### Funkcje

- 📺 **Transmitowanie Ekranu** - Nauczyciele mogą udostępniać cały ekran lub konkretne okno
- 👥 **Reakcje Uczniów** - Uczniowie mogą wysyłać reakcje (podniesienie ręki, kciuk w górę, pytanie, niezrozumienie)
- ✏️ **Adnotacje Na Żywo** - Nauczyciele mogą rysować na ekranie różnymi narzędziami
- 🔍 **Odkrywanie w LAN** - Automatyczne wykrywanie nauczyciela w sieci lokalnej przez mDNS
- ⚡ **Zoptymalizowane dla WiFi** - Adaptacyjna jakość dla płynnego strumieniowania na słabszych sieciach
- 🔒 **Tylko Lokalnie** - Brak usług chmurowych, cała komunikacja pozostaje w sieci LAN

### Wymagania Systemowe

- Windows 10/11
- Node.js 18+ (dla deweloperów)
- Połączenie sieciowe lokalne (WiFi lub Ethernet)

### Instalacja

#### Dla Użytkowników

Pobierz najnowszy instalator ze strony [Releases](https://github.com/yourusername/gut-vnc/releases) i uruchom go na swoim komputerze z Windows.

#### Dla Deweloperów

```bash
# Sklonuj repozytorium
git clone https://github.com/yourusername/gut-vnc.git
cd gut-vnc

# Zainstaluj zależności
npm install

# Uruchom w trybie deweloperskim
npm run dev

# Zbuduj wersję produkcyjną
npm run build

# Stwórz instalator Windows
npm run dist
```

### Użytkowanie

#### Dla Nauczycieli

1. Uruchom aplikację i wybierz **"Nauczyciel"**
2. Kliknij **"Rozpocznij Lekcję"**, aby rozpocząć transmitowanie
3. Wybierz ekran lub okno, które chcesz udostępnić
4. Uczniowie automatycznie wykryją Twoją sesję w sieci
5. Użyj paska narzędzi do adnotacji, aby rysować na ekranie
6. Monitoruj reakcje uczniów w czasie rzeczywistym
7. Użyj przycisków sterowania, aby wstrzymać lub wyczyścić ekran

#### Dla Uczniów

1. Uruchom aplikację i wybierz **"Uczeń"**
2. Aplikacja automatycznie znajdzie dostępnych nauczycieli w sieci
3. Kliknij **"Dołącz"**, aby połączyć się z lekcją
4. Oglądaj ekran nauczyciela w czasie rzeczywistym
5. Użyj przycisków reakcji, aby komunikować się niewerbalnie

### Architektura

- **Electron** - Framework do aplikacji desktopowych
- **React** - Framework UI dla interfejsu
- **TypeScript** - JavaScript z typowaniem
- **WebRTC** - Strumieniowanie wideo peer-to-peer
- **WebSocket** - Sygnalizacja i reakcje w czasie rzeczywistym
- **mDNS/Bonjour** - Odkrywanie usług w sieci lokalnej

---

## Contact / Kontakt

For issues and feature requests, please use the [GitHub Issues](https://github.com/yourusername/gut-vnc/issues) page.

Dla problemów i próśb o funkcje, użyj strony [GitHub Issues](https://github.com/yourusername/gut-vnc/issues).
