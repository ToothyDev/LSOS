<script lang="ts">
  // Oswald has no tabular figures, so `tabular-nums` does nothing: each digit gets a fixed-width
  // slot instead, and changing numbers (clocks, countdowns) no longer shift the layout.
  let { text }: { text: string } = $props()

  const chars = $derived([...text])
</script>

<span class="digits"
  ><span class="sr">{text}</span><span aria-hidden="true"
    >{#each chars as char, i (i)}<span class:d={char >= '0' && char <= '9'}>{char}</span
      >{/each}</span
  ></span
>

<style>
  .digits {
    letter-spacing: 0;
    white-space: nowrap;
  }

  .sr {
    clip-path: inset(50%);
    height: 1px;
    overflow: hidden;
    position: absolute;
    width: 1px;
  }

  /* Widest Oswald digit is about 0.53em. */
  .d {
    display: inline-block;
    text-align: center;
    width: 0.6em;
  }
</style>
