<script lang="ts">
  // Short boot sequence shown once when LSOS opens. Decorative only: the app is already rendered
  // underneath, a click or key press skips it, and it is left out for reduced motion.
  const LINES = ['Establishing secure connection', 'Loading local data', 'Access granted']
  const STEP_MS = 160
  const HOLD_MS = 250

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  let shown = $state(0)
  let leaving = $state(false)
  let done = $state(reducedMotion)

  $effect(() => {
    if (done) return
    const timers = LINES.map((_, i) => setTimeout(() => (shown = i + 1), STEP_MS * (i + 1)))
    timers.push(setTimeout(() => (leaving = true), STEP_MS * LINES.length + HOLD_MS))
    const skip = () => (leaving = true)
    window.addEventListener('keydown', skip, { once: true })
    window.addEventListener('pointerdown', skip, { once: true })
    return () => {
      timers.forEach(clearTimeout)
      window.removeEventListener('keydown', skip)
      window.removeEventListener('pointerdown', skip)
    }
  })
</script>

{#if !done}
  <div
    class="boot"
    class:leaving
    aria-hidden="true"
    ontransitionend={() => leaving && (done = true)}
  >
    <div class="screen">
      <p class="title">Los Santos <em>Operating</em> System</p>
      <div class="bar"><div class="fill" style:width="{(shown / LINES.length) * 100}%"></div></div>
      <ul>
        {#each LINES.slice(0, shown) as line, i (line)}
          {@const finished = i < shown - 1 || shown === LINES.length}
          <li>
            &gt; {line}{finished ? '' : '...'}
            {#if finished && i < LINES.length - 1}<span class="ok">OK</span>{/if}
          </li>
        {/each}
      </ul>
    </div>
  </div>
{/if}

<style>
  .boot {
    align-items: center;
    background: var(--bg);
    display: flex;
    inset: 0;
    justify-content: center;
    padding: var(--space-4);
    position: fixed;
    transition: opacity 0.3s;
    z-index: 90;
  }

  .leaving {
    opacity: 0;
    pointer-events: none;
  }

  .screen {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    width: min(100%, 32rem);
  }

  .title {
    font-family: var(--font-display);
    font-size: var(--text-xl);
    letter-spacing: var(--tracking-wide);
    margin: 0;
    text-align: center;
    text-transform: uppercase;
  }

  .title em {
    color: var(--accent-text);
    font-style: normal;
  }

  .bar {
    background: var(--track);
    border-radius: var(--radius);
    height: var(--bar-height);
    overflow: hidden;
  }

  .fill {
    background: var(--accent);
    height: 100%;
    transition: width 0.15s;
  }

  ul {
    color: var(--muted);
    font-family: var(--font-display);
    font-size: var(--text-sm);
    letter-spacing: var(--tracking);
    list-style: none;
    margin: 0;
    min-height: 5em;
    padding: 0;
    text-transform: uppercase;
  }

  li:last-child {
    color: var(--fg);
  }

  .ok {
    color: var(--accent-text);
    margin-left: var(--space-2);
  }
</style>
