<!--
  The liftboard logo, drawn inline rather than as an <img>: an SVG image can't use the
  page's web font, but inline SVG text can. The word takes the page's text colour, so one
  drawing works in light and dark mode. Geometry matches public/brand/logo-*.svg.

  `mark` drops the word and keeps the square icon, for tight spaces like a phone header.
  Size is set by height so the full logo and the mark line up when swapped.
-->
<script lang="ts">
  let { height = 48, mark = false }: { height?: number; mark?: boolean } = $props()

  const viewWidth = $derived(mark ? 72 : 300)
</script>

<svg
  viewBox="0 0 {viewWidth} 72"
  width={(height * viewWidth) / 72}
  {height}
  role="img"
  aria-label="liftboard"
>
  <rect x="4" y="4" width="64" height="64" rx="15" />
  <path
    d="M18 49 L30 39 L39 44 L52 26"
    fill="none"
    stroke="#D4FF3F"
    stroke-width="6"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
  <circle cx="52" cy="26" r="5" fill="#D4FF3F" />
  {#if !mark}
    <text x="84" y="48">liftboard</text>
  {/if}
</svg>

<style>
  svg {
    display: block;
    max-width: 100%;
    height: auto;
  }

  rect {
    fill: #0e0f12;
  }

  /* The tile is the same near-black as the dark page, so a hairline keeps its shape visible. */
  @media (prefers-color-scheme: dark) {
    rect {
      stroke: rgb(255 255 255 / 0.14);
      stroke-width: 2;
    }
  }

  text {
    font-family: inherit;
    font-size: 34px;
    font-weight: 600;
    letter-spacing: -1.2px;
    fill: currentColor;
  }
</style>
