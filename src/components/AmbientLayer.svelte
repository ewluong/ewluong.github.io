<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  let pinging = false;
  let pingTimeout: ReturnType<typeof setTimeout>;

  function schedulePing() {
    const delay = 30000 + Math.random() * 30000; // 30-60s
    pingTimeout = setTimeout(() => {
      pinging = true;
      setTimeout(() => {
        pinging = false;
        schedulePing();
      }, 150);
    }, delay);
  }

  onMount(() => {
    schedulePing();
  });

  onDestroy(() => {
    clearTimeout(pingTimeout);
  });
</script>

<div class="ambient-layer">
  <div class="grid-overlay" class:pinging></div>
  <div class="vignette"></div>
</div>

<style>
  .ambient-layer {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: var(--z-ambient);
  }

  .grid-overlay {
    position: absolute;
    inset: 0;
    background-image:
      repeating-linear-gradient(
        0deg,
        transparent,
        transparent 59px,
        rgba(212, 160, 68, 0.015) 59px,
        rgba(212, 160, 68, 0.015) 60px
      ),
      repeating-linear-gradient(
        90deg,
        transparent,
        transparent 59px,
        rgba(212, 160, 68, 0.015) 59px,
        rgba(212, 160, 68, 0.015) 60px
      );
    mask-image: radial-gradient(ellipse at center, rgba(0,0,0,0.6) 20%, rgba(0,0,0,0.1) 70%, transparent 100%);
    -webkit-mask-image: radial-gradient(ellipse at center, rgba(0,0,0,0.6) 20%, rgba(0,0,0,0.1) 70%, transparent 100%);
    transition: opacity 150ms;
  }

  .grid-overlay.pinging {
    background-image:
      repeating-linear-gradient(
        0deg,
        transparent,
        transparent 59px,
        rgba(212, 160, 68, 0.06) 59px,
        rgba(212, 160, 68, 0.06) 60px
      ),
      repeating-linear-gradient(
        90deg,
        transparent,
        transparent 59px,
        rgba(212, 160, 68, 0.06) 59px,
        rgba(212, 160, 68, 0.06) 60px
      );
  }

  .vignette {
    position: absolute;
    inset: 0;
    background: radial-gradient(
      ellipse at center,
      transparent 40%,
      rgba(0, 0, 0, 0.35) 100%
    );
  }

  @media (prefers-reduced-motion: reduce) {
    .grid-overlay.pinging {
      background-image:
        repeating-linear-gradient(
          0deg,
          transparent,
          transparent 59px,
          rgba(212, 160, 68, 0.015) 59px,
          rgba(212, 160, 68, 0.015) 60px
        ),
        repeating-linear-gradient(
          90deg,
          transparent,
          transparent 59px,
          rgba(212, 160, 68, 0.015) 59px,
          rgba(212, 160, 68, 0.015) 60px
        );
    }
  }
</style>
