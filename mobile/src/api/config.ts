import { Platform } from 'react-native';

// Same backend the web app talks to (server/). `localhost` resolves
// correctly in the Expo web preview (same machine as the server) and in an
// Android emulator via the 10.0.2.2 loopback alias; a physical device on the
// same network needs this swapped for the dev machine's LAN IP, since a
// phone cannot resolve "localhost" as the dev machine.
const DEV_HOST = Platform.select({ android: '10.0.2.2', default: 'localhost' });

export const API_BASE_URL = `http://${DEV_HOST}:5000/api/v1`;
