// ─────────────────────────────────────────────────────────────────────────────
// tree.js · Árbol de decisión (tipo CART) — la pieza base del bosque aleatorio
//
// Un árbol de decisión es una cadena de preguntas de sí/no sobre los datos:
//     "¿oxígeno ≤ 0,21?" → sí → "¿presión ≤ 1 atm?" → … → hoja con una predicción
// Para construirlo, en cada nodo probamos todas las preguntas posibles (variable + umbral)
// y nos quedamos con la que deja los dos grupos resultantes lo más "parecidos por dentro" posible
// (menor error cuadrático). Y repetimos dentro de cada grupo.
//
// Para CLASIFICAR (¿se apaga la llama? sí/no) se entrena igual con 0 y 1,
// y la hoja devuelve la media, que se lee como una probabilidad.
//
// Un nodo del árbol es un objeto:
//   · hoja:  { valor }                          → la predicción
//   · corte: { variable, umbral, izq, der }     → si x[variable] ≤ umbral va a la izquierda
// ─────────────────────────────────────────────────────────────────────────────
import { barajar } from './random.js';

/*
  X        → tabla de datos (una fila por gota, una columna por variable)
  y        → lo que queremos predecir (una cifra por fila)
  filas    → qué filas de X usa este nodo (índices)
  opciones → { profundidadMax, hojaMinima, variablesPorCorte }
  azar     → generador con semilla (para elegir qué variables se prueban)
*/
export function construirArbol(X, y, filas, opciones, azar, profundidad = 0) {
  const n = filas.length;
  let suma = 0;
  for (const i of filas) suma += y[i];
  const media = suma / n;

  // ¿Paramos? Si ya es muy profundo o quedan pocas filas, esto es una hoja.
  if (profundidad >= opciones.profundidadMax || n < 2 * opciones.hojaMinima) return { valor: media };

  // Qué variables probamos en este nodo. En el bosque aleatorio solo se prueba un subconjunto
  // al azar (variablesPorCorte): así cada árbol es distinto y el promedio es más robusto.
  const nVariables = X[0].length;
  let variables = [...Array(nVariables).keys()];
  if (opciones.variablesPorCorte && opciones.variablesPorCorte < nVariables) {
    barajar(variables, azar);
    variables = variables.slice(0, opciones.variablesPorCorte);
  }

  // Sumas que necesitamos para calcular el error de cada corte sin recorrer los datos mil veces
  let sumaCuadrados = 0;
  for (const i of filas) sumaCuadrados += y[i] * y[i];
  const errorSinCortar = sumaCuadrados - (suma * suma) / n;

  // Buscamos el mejor corte: el que minimiza el error (SSE) de las dos mitades
  let mejor = null;
  for (const variable of variables) {
    // ordenamos las filas por esta variable y vamos moviendo el corte de izquierda a derecha
    const ordenadas = filas.slice().sort((a, b) => X[a][variable] - X[b][variable]);
    let sumaIzq = 0;
    let sumaCuadradosIzq = 0;
    for (let k = 0; k < n - 1; k++) {
      const valorY = y[ordenadas[k]];
      sumaIzq += valorY;
      sumaCuadradosIzq += valorY * valorY;
      const nIzq = k + 1;
      const nDer = n - nIzq;
      if (nIzq < opciones.hojaMinima || nDer < opciones.hojaMinima) continue; // hojas demasiado pequeñas
      const actual = X[ordenadas[k]][variable];
      const siguiente = X[ordenadas[k + 1]][variable];
      if (actual === siguiente) continue; // no se puede cortar entre dos valores iguales
      const sumaDer = suma - sumaIzq;
      const sumaCuadradosDer = sumaCuadrados - sumaCuadradosIzq;
      const error =
        (sumaCuadradosIzq - (sumaIzq * sumaIzq) / nIzq) + (sumaCuadradosDer - (sumaDer * sumaDer) / nDer);
      if (!mejor || error < mejor.error) {
        mejor = { error, variable, umbral: (actual + siguiente) / 2, k, ordenadas };
      }
    }
  }

  // Si ningún corte mejora el error, esto es una hoja
  if (!mejor || mejor.error >= errorSinCortar - 1e-12) return { valor: media };

  // Repartimos las filas en dos grupos y construimos un árbol en cada uno (recursión)
  const filasIzq = mejor.ordenadas.slice(0, mejor.k + 1);
  const filasDer = mejor.ordenadas.slice(mejor.k + 1);
  return {
    variable: mejor.variable,
    umbral: mejor.umbral,
    izq: construirArbol(X, y, filasIzq, opciones, azar, profundidad + 1),
    der: construirArbol(X, y, filasDer, opciones, azar, profundidad + 1),
  };
}

// Predecir con un árbol: bajar por las preguntas hasta llegar a una hoja.
export function predecirArbol(arbol, x) {
  let nodo = arbol;
  while (nodo.variable !== undefined) nodo = x[nodo.variable] <= nodo.umbral ? nodo.izq : nodo.der;
  return nodo.valor;
}
