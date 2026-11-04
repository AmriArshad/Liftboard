<!--
  The liftboard wordmark, drawn inline rather than as an <img>: an SVG image can't use the
  page's web font, but inline SVG text can. The word takes the page's text colour, so one
  drawing works in light and dark mode. Geometry matches public/brand/logo-*.svg.
-->
<script lang="ts">
  let { width = 200 }: { width?: number } = $props()
</script>

<svg viewBox="0 0 300 72" {width} height={(width * 72) / 300} role="img" aria-label="liftboard">
  <rect x="4" y="4" width="64" height="64" rx="15" fill="#0E0F12" />
  <path
    d="M18 49 L30 39 L39 44 L52 26"
    fill="none"
    stroke="#D4FF3F"
    stroke-width="6"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
  <circle cx="52" cy="26" r="5" fill="#D4FF3F" />
  <text x="84" y="48">liftboard</text>
</svg>

<style>
  svg {
    display: block;
    max-width: 100%;
    height: auto;
  }

  text {
    font-family: inherit;
    font-size: 34px;
    font-weight: 600;
    letter-spacing: -1.2px;
    fill: currentColor;
  }
</style>
