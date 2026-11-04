import { mount } from 'svelte'
// Geist, self-hosted: Vite bundles the font files, so no request leaves this origin.
// Browsers only download the alphabets a page uses (the @font-face unicode ranges).
import '@fontsource-variable/geist'
import './app.css'
import App from './App.svelte'

// Svelte 5 mounts a component imperatively, like React's createRoot().render().
const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app
