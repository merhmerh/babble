![Logo](assets/logo_full.svg)

1 on 1 Chat App.<br>
Designed for love birds 🦆.

_in beta_

✅ Core Function <br>
✅ Attachments (images, video, files) <br>
✅ Read status <br>
⬜ Sticker Library <br>
⬜ Image Gallery <br>
⬜ File Gallery <br>

## Features

-   🐣 Customizable UI
-   🖼️ Send image, video and files
-   🐱 Animated Sticker support (GIF)
-   🌐 Self Hosted with firebase. No server required
-   ⚛️ Cross Platform with Electron

## RUN

### Requirement

```
npm install
```

Setup .env with firebase config

To enable, save password feature, generate >16 Bytes SECRET and store in .env file.

#### To run in dev mode

```node
npm run dev
```

#### To build App

Electron-Builder

```node
npm run dist
```

## Firebase

#### Firebase configuration

`Authetication`

1. Add both user manually with Email and Password.

`Cloud Firestore`

1. Create users collection
2. add document id: `USER UID` for both user
3. add document id: `chatroom`
4. in chatroom doc, add users (type: array), then add both user UID.
5. Update Firestore Rules.

`Cloud Storage`

1. Update Cloud Storage Rules

Other collections or documents will be self populated by the app.

## Tech Stack

**Client:** Javascript, SCSS, Electron, Firebase.

## Authors

-   [@merhmerh](https://www.github.com/merhmerh)

## TO DO

1. Mobile App (React Native)
2. BOT to automate task.
