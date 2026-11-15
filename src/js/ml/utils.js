// ─────────────────────────────────────────────────────────────────────────────
// utils.js · Dos herramientas matemáticas pequeñas que usan varios modelos
// ─────────────────────────────────────────────────────────────────────────────

// Estandarizar = poner todas las variables en la misma escala.
// Ejemplo: la presión va de 0,2 a 3 y el oxígeno de 0,12 a 0,34; si no las igualamos,
// la presión "pesaría" más solo por tener números más grandes.
// A cada valor se le resta la media de su columna y se divide por su desviación típica.
// Devuelve una función que convierte una fila x en su versión estandarizada.
export function crearEstandarizador(X) {
  const nVariables = X[0].length;
  const media = Array(nVariables).fill(0);
  const desviacion = Array(nVariables).fill(0);
  X.forEach((fila) => fila.forEach((valor, j) => (media[j] += valor / X.length)));
  X.forEach((fila) => fila.forEach((valor, j) => (desviacion[j] += (valor - media[j]) ** 2 / X.length)));
  for (let j = 0; j < nVariables; j++) desviacion[j] = Math.sqrt(desviacion[j]) || 1; // evita dividir entre 0
  return (fila) => fila.map((valor, j) => (valor - media[j]) / desviacion[j]);
}

// Resolver un sistema de ecuaciones lineales A·w = b (método de Gauss con pivote).
// La regresión lineal lo necesita para encontrar los pesos w que mejor ajustan los datos.
export function resolverSistema(A, b) {
  const n = b.length;
  const M = A.map((fila, i) => [...fila, b[i]]); // matriz ampliada [A | b]
  for (let i = 0; i < n; i++) {
    // 1) pivote: buscar la fila con el número más grande en esta columna (da más precisión)
    let p = i;
    for (let k = i + 1; k < n; k++) if (Math.abs(M[k][i]) > Math.abs(M[p][i])) p = k;
    [M[i], M[p]] = [M[p], M[i]];
    // 2) dividir la fila entre el pivote para que quede un 1
    const divisor = M[i][i] || 1e-12;
    for (let j = i; j <= n; j++) M[i][j] /= divisor;
    // 3) restar esa fila a las demás para dejar 0 en el resto de la columna
    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = M[k][i];
        for (let j = i; j <= n; j++) M[k][j] -= factor * M[i][j];
      }
    }
  }
  return M.map((fila) => fila[n]); // la última columna es la solución
}
