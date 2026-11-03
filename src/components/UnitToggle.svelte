<!-- kg / lb switch. Two radio buttons styled as a segmented control, so keyboards and screen readers get native behaviour. -->
<script lang="ts">
  import type { Unit } from '../lib/parse/types'
  import { unitPreference } from '../lib/store/units.svelte'

  let { unit }: { unit: Unit } = $props()

  const UNITS: Unit[] = ['kg', 'lb']
</script>

<fieldset>
  <legend>Units</legend>
  {#each UNITS as option (option)}
    <label class:active={unit === option}>
      <input
        type="radio"
        name="unit"
        value={option}
        checked={unit === option}
        onchange={() => unitPreference.set(option)}
      />
      {option}
    </label>
  {/each}
</fieldset>

<style>
  fieldset {
    display: inline-flex;
    gap: 2px;
    margin: 0;
    padding: 2px;
    border: 1px solid color-mix(in srgb, var(--text) 15%, transparent);
    border-radius: 8px;
  }

  /* The visible options say what this is; the legend is for screen readers only. */
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
    cursor: pointer;
    opacity: 0.6;
  }

  label.active {
    opacity: 1;
    color: var(--on-accent);
    background: var(--accent);
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
