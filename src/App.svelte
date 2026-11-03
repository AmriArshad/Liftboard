<main>
  <h1>
    <!-- <picture> swaps the wordmark to match the system colour scheme. -->
    <picture>
      <source srcset="/brand/logo-dark.svg" media="(prefers-color-scheme: dark)" />
      <img src="/brand/logo-light.svg" alt="liftboard" width="300" height="72" />
    </picture>
  </h1>
</main>

<style>
  /* Styles in a .svelte file are scoped to this component automatically. */
  main {
    display: grid;
    place-items: center;
    min-height: 100dvh;
    padding: 16px;
  }

  h1 {
    margin: 0;
  }

  img {
    display: block;
    max-width: 100%;
    height: auto;
  }
</style>
