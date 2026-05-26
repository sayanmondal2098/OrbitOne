# OrbitOne

A productivity app built with Expo and React Native featuring a comprehensive home screen dashboard.

## Features

### Home Screen Widgets

- **Today Tasks** - View and manage top priority tasks with overdue indicators
- **Calendar Peek** - Quick view of upcoming events
- **Weather Card** - Current weather and 6-hour forecast with alerts
- **Habits Summary** - Track daily habits with streak counts
- **News Headlines** - Top news from selected topics
- **Floating Action Button** - Quick access to add tasks, notes, and events

## Getting Started

### Prerequisites

- Node.js (v14 or newer)
- npm or yarn
- Expo Go app (for mobile testing)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Run on your device:
   - Scan the QR code with Expo Go (Android) or Camera app (iOS)
   - Or press `a` for Android emulator
   - Or press `i` for iOS simulator

## Project Structure

```
OrbitOne/
├── App.tsx           # Main app component with home screen
├── app.json          # Expo configuration
├── package.json      # Dependencies
├── tsconfig.json     # TypeScript configuration
└── assets/           # Image assets (icons, splash screen)
```

## Asset Placeholders

The following asset files are referenced but need to be created:
- `assets/icon.png` - App icon (1024x1024)
- `assets/splash.png` - Splash screen
- `assets/adaptive-icon.png` - Android adaptive icon
- `assets/favicon.png` - Web favicon

For development, you can use placeholder images or the app will use defaults.

## Scripts

- `npm start` - Start the Expo development server
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS simulator (macOS only)
- `npm run web` - Run in web browser

## Tech Stack

- **Expo** - React Native framework
- **TypeScript** - Type safety
- **React Native** - Mobile UI framework

## Next Steps

- Add navigation (React Navigation)
- Implement data persistence (AsyncStorage/SQLite)
- Connect to weather API
- Add news feed API integration
- Implement task management logic
- Add authentication

## License

Private project
