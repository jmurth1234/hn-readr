# hn-readr

A fast, read-only Hacker News reader for iOS and Android, built with React Native and Expo.

## Features

- **Multiple feeds** — Browse Top, New, Best, and Ask HN stories
- **Full-text search** — Find stories and comments powered by Algolia
- **Threaded comments** — Collapsible comment trees with depth indicators
- **Tablet support** — Split-view layout on iPad and Android tablets
- **Dark mode** — Automatic light/dark theme based on system settings
- **In-app browser** — Open links without leaving the app
- **Pull to refresh** and infinite scroll on all feeds

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Yarn](https://yarnpkg.com/)
- For iOS: macOS with Xcode
- For Android: Android Studio with an emulator or physical device

### Install

```sh
yarn install
```

### Run

```sh
# Start the Expo dev server
yarn start

# Run on a specific platform
yarn ios
yarn android
yarn web
```

Scan the QR code with [Expo Go](https://expo.dev/go) to run on a physical device.

### Test

```sh
yarn test
yarn test:watch
yarn test:coverage
```

### Lint & Format

```sh
yarn lint
yarn format
yarn format:check
```

## Tech Stack

- [React Native](https://reactnative.dev/) + [Expo](https://expo.dev/) (SDK 54, New Architecture)
- [Expo Router](https://docs.expo.dev/router/introduction/) for file-based navigation
- [TypeScript](https://www.typescriptlang.org/) with strict mode
- [Hacker News API](https://github.com/HackerNews/API) (Firebase) + [Algolia HN Search](https://hn.algolia.com/api) for search

## License

MIT
