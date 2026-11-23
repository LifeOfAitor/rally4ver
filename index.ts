import { registerRootComponent } from 'expo';

// Registers the background location task. Must be imported before the app
// renders so the OS can deliver location updates while the screen is off.
import './src/engine/tracking';
import App from './App';

registerRootComponent(App);
