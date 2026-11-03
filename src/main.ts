import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'

// Svelte 5 mounts a component imperatively, like React's createRoot().render().
const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app
