// Which screen is showing, kept in the URL hash (#/exercises/Squat%20(Barbell)) so the back
// button, refresh and shared links work. The hash never reaches a server, so nothing here
// sends workout data anywhere.

export type Route =
  { view: 'overview' } | { view: 'exercises'; exercise: string | null } | { view: 'progress' }

function parse(hash: string): Route {
  const [view, exercise] = hash.replace(/^#\/?/, '').split('/')
  if (view === 'exercises') {
    return { view, exercise: exercise ? decodeURIComponent(exercise) : null }
  }
  if (view === 'progress') return { view }
  return { view: 'overview' }
}

/** The link for a route, for use in <a href>. */
export function href(route: Route): string {
  if (route.view === 'exercises') {
    return route.exercise ? `#/exercises/${encodeURIComponent(route.exercise)}` : '#/exercises'
  }
  return route.view === 'progress' ? '#/progress' : '#/'
}

let current = $state<Route>(parse(location.hash))

// Clicking a link changes the hash; this keeps `route.current` in step with it.
addEventListener('hashchange', () => {
  const next = parse(location.hash)
  // A hash change is an in-page jump, so the browser keeps the scroll position. A new screen
  // (or a new exercise) should open at its top, like following a link to another page.
  const moved =
    next.view !== current.view ||
    (next.view === 'exercises' &&
      current.view === 'exercises' &&
      next.exercise !== current.exercise)
  current = next
  if (moved) scrollTo(0, 0)
})

export const route = {
  get current() {
    return current
  },
}
