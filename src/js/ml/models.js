// ─────────────────────────────────────────────────────────────────────────────
// models.js · Los modelos que comparamos y el ensemble que realmente predice
//
// Todos tienen la misma forma:   MODELS.nombre.fit(X, y, tarea)  →  devuelve una función  predecir(x)
//   X     = tabla de datos (una fila por gota: combustible, O₂, presión, CO₂, helio, tamaño)
//   y     = lo que queremos predecir (una cifra por fila)
//   tarea = 'reg'  → predecir un número (la velocidad de combustión K)
//           'cls'  → predecir una probabilidad 0–1 (¿se apaga la llama sola?)
// ─────────────────────────────────────────────────────────────────────────────
import { rng } from './random.js';
import { crearEstandarizador, resolverSistema } from './utils.js';
import { construirArbol, predecirArbol } from './tree.js';
import { entrenarBoosting } from './boosting.js';

export const MODELS = {
  // ── 1. Regresión lineal (para números) / logística (para probabilidades) ───────────────────
  // El modelo más simple: una suma ponderada de las variables. Sirve de referencia:
  // si un modelo complicado no la supera, la complicación no aporta nada.
  linear: {
    name: { es: 'Regresión lineal / logística', en: 'Linear / logistic regression' },
    fit(X, y, tarea) {
      const estandarizar = crearEstandarizador(X);
      const Z = X.map(estandarizar);
      const nPesos = Z[0].length + 1; // una variable más: el término independiente (el "1")

      if (tarea === 'reg') {
        // Mínimos cuadrados: buscamos los pesos w que minimizan el error. Se resuelve un sistema de
        // ecuaciones (A·w = b), con una pizca de "ridge" (1e-3) que evita pesos disparatados.
        const A = Array.from({ length: nPesos }, () => Array(nPesos).fill(0));
        const b = Array(nPesos).fill(0);
        Z.forEach((fila, i) => {
          const v = [1, ...fila];
          for (let p = 0; p < nPesos; p++) {
            b[p] += v[p] * y[i];
            for (let q = 0; q < nPesos; q++) A[p][q] += v[p] * v[q];
          }
        });
        for (let p = 1; p < nPesos; p++) A[p][p] += 1e-3;
        const w = resolverSistema(A, b);
        return (x) => {
          const v = [1, ...estandarizar(x)];
          return v.reduce((suma, valor, i) => suma + valor * w[i], 0);
        };
      }

      // Regresión logística: la salida de la suma ponderada pasa por la curva 1/(1+e^−z),
      // que la convierte en una probabilidad entre 0 y 1. Se ajusta por descenso de gradiente:
      // 600 pasos pequeños (0,5) en la dirección que reduce el error.
      const w = Array(nPesos).fill(0);
      for (let paso = 0; paso < 600; paso++) {
        const gradiente = Array(nPesos).fill(0);
        Z.forEach((fila, i) => {
          const v = [1, ...fila];
          const p = 1 / (1 + Math.exp(-v.reduce((suma, valor, k) => suma + valor * w[k], 0)));
          v.forEach((valor, k) => (gradiente[k] += (p - y[i]) * valor));
        });
        for (let k = 0; k < nPesos; k++) w[k] -= 0.5 * (gradiente[k] / Z.length + (k ? 0.01 * w[k] : 0));
      }
      return (x) => {
        const v = [1, ...estandarizar(x)];
        return 1 / (1 + Math.exp(-v.reduce((suma, valor, i) => suma + valor * w[i], 0)));
      };
    },
  },

  // ── 2. Bosque aleatorio (Breiman, 2001) ────────────────────────────────────────────────────
  // 120 árboles de decisión, cada uno entrenado con una muestra al azar (con repetición) de las gotas
  // y probando solo el 60 % de las variables en cada corte. La predicción es el promedio de los 120.
  forest: {
    name: { es: 'Bosque aleatorio (120 árboles)', en: 'Random forest (120 trees)' },
    fit(X, y, tarea, semilla = 7) {
      const azar = rng(semilla);
      const n = X.length;
      const variablesPorCorte = Math.max(2, Math.round(X[0].length * 0.6));
      const arboles = [];
      for (let t = 0; t < 120; t++) {
        // muestra "bootstrap": n filas elegidas al azar, pudiendo repetirse
        const filas = Array.from({ length: n }, () => Math.floor(azar() * n));
        arboles.push(construirArbol(X, y, filas, { profundidadMax: 12, hojaMinima: 2, variablesPorCorte }, azar));
      }
      const predecir = (x) => arboles.reduce((suma, arbol) => suma + predecirArbol(arbol, x), 0) / arboles.length;
      // "spread" = cuánto discrepan los 120 árboles entre sí. Es la banda ± que enseña la web:
      // si los árboles no se ponen de acuerdo, la predicción es poco fiable.
      predecir.spread = (x) => {
        const valores = arboles.map((arbol) => predecirArbol(arbol, x));
        const media = valores.reduce((a, b) => a + b, 0) / valores.length;
        return Math.sqrt(valores.reduce((suma, v) => suma + (v - media) ** 2, 0) / valores.length);
      };
      return predecir;
    },
  },

  // ── 3. XGBoost (algoritmo): 300 árboles de profundidad 4, η = 0,05, λ = 1 ───────────────────
  xgb: {
    name: { es: 'XGBoost (algoritmo, 300 árboles)', en: 'XGBoost (algorithm, 300 trees)' },
    fit: (X, y, tarea) =>
      entrenarBoosting(X, y, tarea, 'xgb', {
        rondas: 300, eta: 0.05, profundidadMax: 4, hojaMinima: 3, lambda: 1, gamma: 0,
        submuestra: 0.8, submuestraColumnas: 0.8, semilla: 3,
      }),
  },

  // ── 4. CatBoost (algoritmo): 300 árboles simétricos de profundidad 4, η = 0,05, λ = 3 ───────
  cat: {
    name: { es: 'CatBoost (algoritmo, árboles simétricos)', en: 'CatBoost (algorithm, symmetric trees)' },
    fit: (X, y, tarea) =>
      entrenarBoosting(X, y, tarea, 'cat', {
        rondas: 300, eta: 0.05, profundidad: 4, lambda: 3, submuestra: 0.85, semilla: 9,
      }),
  },

  // ── 5. ENSEMBLE: el que de verdad predice en la web ────────────────────────────────────────
  // Media ponderada de varios modelos: XGBoost 40 % + CatBoost 40 % + bosque 10 % + lineal 10 %.
  // Idea: los errores de modelos distintos no coinciden, y al promediarlos se compensan.
  // Los pesos los eligió el equipo (más peso al boosting). Con pesos iguales salía R² 0,71 y 86 %;
  // con estos, 0,70 y 84 %. Está dicho en la documentación (docs/MODEL.md).
  ensemble: {
    name: {
      es: 'Ensemble ponderado: XGBoost 40 % + CatBoost 40 % + bosque 10 % + lineal 10 %',
      en: 'Weighted ensemble: XGBoost 40 % + CatBoost 40 % + forest 10 % + linear 10 %',
    },
    weights: { xgb: 0.4, cat: 0.4, forest: 0.1, linear: 0.1 },
    fit(X, y, tarea) {
      const pesos = MODELS.ensemble.weights;
      const nombres = Object.keys(pesos);
      const modelos = nombres.map((nombre) => MODELS[nombre].fit(X, y, tarea));
      return (x) => modelos.reduce((suma, modelo, i) => suma + pesos[nombres[i]] * modelo(x), 0);
    },
  },

  // ── 6. Vecinos más cercanos (k = 7): solo de referencia ────────────────────────────────────
  // Para predecir una gota nueva, busca las 7 gotas más parecidas y promedia su resultado,
  // dando más peso a las más cercanas.
  knn: {
    name: { es: 'Vecinos más cercanos (k = 7)', en: 'Nearest neighbours (k = 7)' },
    fit(X, y) {
      const estandarizar = crearEstandarizador(X);
      const Z = X.map(estandarizar);
      return (x) => {
        const consulta = estandarizar(x);
        const vecinos = Z.map((fila, i) => [Math.hypot(...fila.map((v, j) => v - consulta[j])), y[i]])
          .sort((a, b) => a[0] - b[0])
          .slice(0, 7);
        const pesos = vecinos.map(([distancia]) => 1 / (distancia + 0.05));
        return vecinos.reduce((suma, [, valor], i) => suma + pesos[i] * valor, 0) / pesos.reduce((a, b) => a + b, 0);
      };
    },
  },
};
