// ─────────────────────────────────────────────────────────────────────────────
// random.js · Generador de números aleatorios "con semilla"
//
// Los modelos (bosque aleatorio, boosting) necesitan azar: para elegir filas, variables…
// Pero queremos que la web dé SIEMPRE los mismos números. Por eso no usamos Math.random(),
// sino un generador con semilla: misma semilla → misma secuencia de números.
// El algoritmo se llama mulberry32 (es un generador pequeño y conocido).
// ─────────────────────────────────────────────────────────────────────────────

// Devuelve una función que, cada vez que la llamas, da un número entre 0 y 1.
export function rng(semilla = 42) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Baraja una lista IN SITU (Fisher-Yates) usando nuestro azar con semilla.
export function barajar(lista, azar) {
  for (let i = lista.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [lista[i], lista[j]] = [lista[j], lista[i]];
  }
  return lista;
}
