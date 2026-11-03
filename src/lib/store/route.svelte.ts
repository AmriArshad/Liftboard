// Which screen is showing, kept in the URL hash (#/exercises/Squat%20(Barbell)) so the back
// button, refresh and shared links work. The hash never reaches a server, so nothing here
// sends workout data anywhere.

export type Route = { view: 'overview' } | { view: 'exercises'; exercise: string | null }

function parse(hash: string): Route {
  const [view, exercise] = hash.replace(/^#\/?/, '').split('/')
  if (view === 'exercises') {
    return { view, exercise: exercise ? decodeURIComponent(exercise) : null }
  }
  return { view: 'overview' }
}

/** The link for a route, for use in <a href>. */
export function href(route: Route): string {
  if (route.view === 'overview') return '#/'
  return route.exercise ? `#/exercises/${encodeURIComponent(route.exercise)}` : '#/exercises'
}

let current = $state<Route>(parse(location.hash))

// Clicking a link changes the hash; this keeps `route.current` in step with it.
addEventListener('hashchange', () => {
  current = parse(location.hash)
})

export const route = {
  get current() {
    return current
  },
}
