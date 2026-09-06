<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData } from './$types';

  let { form }: { form: ActionData } = $props();
  let enviando = $state(false);
</script>

<svelte:head>
  <title>Entrar · fortunecity</title>
</svelte:head>

<div class="login-wrap">
  <div class="login-card">
    <div class="brand">
      <span class="brand-ico" aria-hidden="true">💵</span>
      <span class="brand-title">fortunecity</span>
    </div>

    <h1>Entrar</h1>
    <p class="sub">Escribe tu código de acceso.</p>

    <form
      method="POST"
      use:enhance={() => {
        enviando = true;
        return async ({ update }) => {
          await update();
          enviando = false;
        };
      }}
    >
      <!-- svelte-ignore a11y_autofocus -->
      <input
        type="text"
        name="codigo"
        placeholder="Código de acceso"
        autocomplete="off"
        autofocus
        disabled={enviando}
      />

      {#if form?.error}
        <p class="error">⚠️ {form.error}</p>
      {/if}

      <button type="submit" disabled={enviando}>{enviando ? 'Entrando…' : 'Entrar'}</button>
    </form>
  </div>
</div>

<style>
  .login-wrap {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    box-sizing: border-box;
  }

  .login-card {
    width: 100%;
    max-width: 340px;
    background: rgba(255, 255, 255, 0.012);
    backdrop-filter: blur(8px) saturate(110%);
    -webkit-backdrop-filter: blur(8px) saturate(110%);
    border: 1px solid #fff;
    border-radius: 16px;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.08),
      0 4px 16px rgba(0, 0, 0, 0.12);
    padding: 2rem 1.75rem;
    box-sizing: border-box;
    color: rgba(255, 255, 255, 0.95);
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-bottom: 1.5rem;
  }

  .brand-ico {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    flex-shrink: 0;
    font-size: 1.5rem;
    line-height: 1;
    filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.28));
  }

  .brand-title {
    font-size: 1.05rem;
    font-weight: 700;
    letter-spacing: 0.01em;
    color: rgba(255, 255, 255, 0.98);
  }

  h1 {
    margin: 0 0 0.35rem;
    font-size: 1.4rem;
    color: rgba(255, 255, 255, 0.98);
  }

  .sub {
    margin: 0 0 1.5rem;
    color: rgba(255, 255, 255, 0.65);
    font-size: 0.92rem;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }

  input {
    padding: 0.7rem 0.9rem;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.16);
    background: rgba(0, 0, 0, 0.18);
    color: #fff;
    font: inherit;
    font-size: 1rem;
    box-sizing: border-box;
  }

  input:focus {
    outline: none;
    border-color: rgba(134, 239, 172, 0.55);
  }

  input:disabled {
    opacity: 0.6;
  }

  button {
    padding: 0.75rem;
    border-radius: 10px;
    border: 1px solid rgba(134, 239, 172, 0.4);
    background: rgba(134, 239, 172, 0.14);
    color: #86efac;
    font: inherit;
    font-weight: 700;
    font-size: 0.95rem;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
  }

  button:hover:not(:disabled) {
    background: rgba(134, 239, 172, 0.24);
    color: #fff;
  }

  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .error {
    margin: 0;
    background: rgba(239, 68, 68, 0.16);
    border: 1px solid rgba(239, 68, 68, 0.4);
    color: #ff8585;
    border-radius: 10px;
    padding: 0.6rem 0.85rem;
    font-size: 0.88rem;
  }
</style>
