<!--
  A segmented control: native radio buttons styled as one row of options, so keyboards and
  screen readers get standard radio-group behaviour for free.
-->
<!-- `generics` makes the component typed by its values, like a generic function in TS. -->
<script lang="ts" generics="T extends string">
  let {
    legend,
    options,
    value,
    onchange,
  }: {
    /** Read by screen readers; the options say what this is visually. */
    legend: string
    /** `name` is read by screen readers when the visible label is abbreviated ("12W"). */
    options: { value: T; label: string; name?: string }[]
    value: T
    onchange: (value: T) => void
  } = $props()

  // Radio groups need a shared name; one per control on the page.
  const name = `segmented-${Math.random().toString(36).slice(2)}`
</script>

<fieldset>
  <legend>{legend}</legend>
  {#each options as option (option.value)}
    <label class:active={value === option.value}>
      <input
        type="radio"
        {name}
        value={option.value}
        checked={value === option.value}
        aria-label={option.name}
        onchange={() => onchange(option.value)}
      />
      {option.label}
    </label>
  {/each}
</fieldset>

<style>
  fieldset {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 2px;
    margin: 0;
    padding: 2px;
    border: 1px solid color-mix(in srgb, var(--text) 15%, transparent);
    border-radius: 8px;
  }

  legend {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }

  label {
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    white-space: nowrap;
    cursor: pointer;
    opacity: 0.6;
  }

  label:hover {
    opacity: 1;
  }

  /* Neutral rather than lime: the accent is kept for navigation and highlights. */
  label.active {
    opacity: 1;
    color: var(--bg);
    background: var(--text);
  }

  label:focus-within {
    outline: 2px solid var(--text);
    outline-offset: 1px;
  }

  input {
    position: absolute;
    opacity: 0;
    width: 1px;
    height: 1px;
  }
</style>
