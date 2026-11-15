// ─────────────────────────────────────────────────────────────────────────────
// validation.js · ¿Cómo sabemos si el modelo es bueno? Métricas y validación cruzada
//
// Un modelo siempre acierta con los datos con los que se entrenó (los ha "memorizado").
// Lo que importa es cómo predice gotas que NO ha visto. Para medirlo usamos validación cruzada:
//   1. Se barajan las 257 gotas (con semilla fija, para que salga siempre igual).
//   2. Se reparten en 5 bloques.
//   3. Para cada bloque: se entrena con los otros 4 y se predice el bloque que quedó fuera.
//   4. Así cada gota se predice con un modelo que nunca la vio, y se calculan las métricas.
// ─────────────────────────────────────────────────────────────────────────────
import { rng, barajar } from './random.js';
import { MODELS } from './models.js';

// Métricas según la tarea.
//   · 'reg' (predecir K):  R² (1 = perfecto, 0 = no mejora a predecir siempre la media) y
//                          error medio absoluto (MAE, en las mismas unidades que K: mm²/s).
//   · 'cls' (¿se apaga?):  aciertos, AUC y la línea base.
//        AUC = probabilidad de que una gota que SÍ se apaga reciba mejor puntuación que una que no
//              (0,5 = azar, 1 = perfecto).
//        línea base = % de aciertos si siempre dijéramos lo más frecuente (69 %): lo que hay que superar.
export function metrics(tarea, real, prediccion) {
  const n = real.length;
  if (tarea === 'reg') {
    const mae = real.reduce((suma, yi, i) => suma + Math.abs(yi - prediccion[i]), 0) / n;
    const media = real.reduce((a, b) => a + b, 0) / n;
    const r2 =
      1 -
      real.reduce((suma, yi, i) => suma + (yi - prediccion[i]) ** 2, 0) /
        real.reduce((suma, yi) => suma + (yi - media) ** 2, 0);
    return { mae, r2, score: r2 };
  }
  const aciertos = real.reduce((suma, yi, i) => suma + ((prediccion[i] >= 0.5 ? 1 : 0) === yi ? 1 : 0), 0) / n;
  // AUC: comparamos cada positivo con cada negativo (si empatan, vale medio punto)
  const positivos = prediccion.filter((_, i) => real[i] === 1);
  const negativos = prediccion.filter((_, i) => real[i] === 0);
  let puntos = 0;
  for (const a of positivos) for (const b of negativos) puntos += a > b ? 1 : a === b ? 0.5 : 0;
  const auc = positivos.length && negativos.length ? puntos / (positivos.length * negativos.length) : NaN;
  const base = Math.max(positivos.length, negativos.length) / n;
  // "score" sirve para ordenar los modelos: primero por aciertos (lo que se entiende) y el AUC desempata
  return { acc: aciertos, auc, base, score: aciertos + auc * 1e-3 };
}

// Validación cruzada en k bloques (k = 5) + importancia de cada variable.
// Devuelve { pred (la predicción "a ciegas" de cada gota), imp (importancia), …métricas }.
export function crossValidate(clave, X, y, tarea, k = 5) {
  const n = X.length;
  const azar = rng(2026); // semilla fija → siempre el mismo reparto
  const orden = barajar([...Array(n).keys()], azar);
  const pred = Array(n).fill(0);
  const imp = Array(X[0].length).fill(0);

  for (let bloque = 0; bloque < k; bloque++) {
    const prueba = orden.filter((_, i) => i % k === bloque); // el bloque que se queda fuera
    const entrenamiento = orden.filter((_, i) => i % k !== bloque);
    const modelo = MODELS[clave].fit(
      entrenamiento.map((i) => X[i]),
      entrenamiento.map((i) => y[i]),
      tarea,
    );
    prueba.forEach((i) => (pred[i] = modelo(X[i])));

    // IMPORTANCIA POR PERMUTACIÓN: ¿cuánto empeora el modelo si "rompemos" una variable?
    // Se baraja esa columna en el bloque de prueba (así deja de tener relación con el resultado)
    // y se mide cuánto crece el error. Si crece mucho, esa variable importaba mucho.
    const error = (P) =>
      prueba.reduce((suma, i, j) => suma + (tarea === 'reg' ? Math.abs(y[i] - P[j]) : (y[i] - P[j]) ** 2), 0) /
      prueba.length;
    const errorOriginal = error(prueba.map((i) => pred[i]));
    for (let columna = 0; columna < X[0].length; columna++) {
      const barajada = barajar(prueba.map((i) => X[i][columna]), azar);
      const errorBarajando = error(
        prueba.map((i, j) => modelo(X[i].map((valor, c) => (c === columna ? barajada[j] : valor)))),
      );
      imp[columna] += (errorBarajando - errorOriginal) / k;
    }
  }
  return { pred, imp, ...metrics(tarea, y, pred) };
}
