// ─────────────────────────────────────────────────────────────────────────────
// boosting.js · Gradient boosting: los algoritmos de XGBoost y CatBoost escritos en JavaScript
//
// IDEA DEL BOOSTING: en vez de un árbol grande, se construyen muchos árboles PEQUEÑOS uno detrás de otro.
// Cada árbol nuevo intenta corregir los errores que todavía comete la suma de los anteriores.
// La predicción final = valor inicial + η · (árbol 1 + árbol 2 + … + árbol N)
// (η, "eta", es la tasa de aprendizaje: cuánto hacemos caso a cada árbol; pequeña = más prudente).
//
// ¿Cómo sabe cada árbol qué corregir? Con dos números por cada fila:
//   g = gradiente → hacia dónde y cuánto se equivoca la predicción actual
//   h = hessiano  → cómo de "curva" es el error (da más o menos confianza)
// Por eso se llama "de segundo orden".
//
// · XGBoost (Chen y Guestrin, KDD 2016): árboles normales. Un corte tiene "ganancia":
//       ½·[ G_izq²/(H_izq+λ) + G_der²/(H_der+λ) − G²/(H+λ) ] − γ
//   y una hoja vale  −G/(H+λ).   λ y γ frenan el sobreajuste (que el modelo se aprenda los datos de memoria).
// · CatBoost (Prokhorenkova et al., NeurIPS 2018): árboles SIMÉTRICOS ("oblivious"): todos los nodos de un
//   mismo nivel hacen la MISMA pregunta. Son más sencillos y muy estables cuando hay pocos datos.
//   (Aquí no está el "ordered boosting" completo; así se dice en la documentación.)
//
// NO son las librerías oficiales: son nuestras implementaciones de los algoritmos publicados.
// ─────────────────────────────────────────────────────────────────────────────
import { rng } from './random.js';

// ── Paso previo: agrupar cada variable en "tramos" (histograma) ──────────────────────────────
// En vez de probar todos los valores posibles como umbral, se agrupan en 32 tramos.
// Es lo que hacen las librerías oficiales, y lo hace mucho más rápido sin perder casi precisión.
// Devuelve:  cortes (los límites de cada tramo) y  tramoDe(x) (convierte una fila en números de tramo).
function crearTramos(X, nTramos = 32) {
  const nVariables = X[0].length;
  const cortes = [];
  for (let variable = 0; variable < nVariables; variable++) {
    const valores = [...new Set(X.map((fila) => fila[variable]))].sort((a, b) => a - b);
    const lista = [];
    if (valores.length <= nTramos) {
      // pocos valores distintos: un corte entre cada par de valores consecutivos
      for (let i = 0; i < valores.length - 1; i++) lista.push((valores[i] + valores[i + 1]) / 2);
    } else {
      // muchos valores: cortes repartidos de forma que cada tramo tenga más o menos las mismas filas
      for (let k = 1; k < nTramos; k++) {
        const q = valores[Math.floor((k * valores.length) / nTramos)];
        const p = valores[Math.floor((k * valores.length) / nTramos) - 1];
        lista.push((p + q) / 2);
      }
    }
    cortes.push([...new Set(lista)]);
  }
  // Búsqueda binaria: ¿en qué tramo cae este valor?
  const tramoDe = (fila) =>
    fila.map((valor, variable) => {
      const c = cortes[variable];
      let bajo = 0;
      let alto = c.length;
      while (bajo < alto) {
        const medio = (bajo + alto) >> 1;
        if (valor > c[medio]) bajo = medio + 1;
        else alto = medio;
      }
      return bajo;
    });
  return { cortes, tramoDe };
}

// ── La "pérdida": cómo se mide el error y qué valor inicial se usa ───────────────────────────
//   · Regresión (predecir K): error cuadrático → g = (predicción − real), h = 1.
//   · Clasificación (¿se apaga?): pérdida logística → la predicción F se convierte en probabilidad
//     con p = 1/(1+e^−F); g = p − real, h = p·(1−p).
function crearPerdida(tarea) {
  if (tarea === 'cls') {
    return {
      inicial: (y) => {
        const p = Math.min(0.99, Math.max(0.01, y.reduce((a, b) => a + b, 0) / y.length));
        return Math.log(p / (1 - p));
      },
      gradienteYHessiano: (F, real) => {
        const p = 1 / (1 + Math.exp(-F));
        return [p - real, Math.max(1e-6, p * (1 - p))];
      },
      salida: (F) => 1 / (1 + Math.exp(-F)),
    };
  }
  return {
    inicial: (y) => y.reduce((a, b) => a + b, 0) / y.length,
    gradienteYHessiano: (F, real) => [F - real, 1],
    salida: (F) => F,
  };
}

// ── Árbol de XGBoost ─────────────────────────────────────────────────────────────────────────
// B = datos ya convertidos a tramos; g, h = gradiente y hessiano de cada fila; filas = las que usa este nodo.
// Nodo: hoja { valor }  o  corte { variable, tramo, izq, der } (va a la izquierda si su tramo ≤ el del corte).
function arbolXgb(B, g, h, filas, o, azar, profundidad = 0) {
  let G = 0;
  let H = 0;
  for (const i of filas) { G += g[i]; H += h[i]; }
  const hoja = { valor: -G / (H + o.lambda) };
  if (profundidad >= o.profundidadMax || filas.length < 2 * o.hojaMinima) return hoja;

  // Submuestreo de columnas: cada árbol solo mira ~80 % de las variables (más variedad, menos sobreajuste)
  const nVariables = B[0].length;
  const variables = [...Array(nVariables).keys()].filter(() => azar() < o.submuestraColumnas);
  if (!variables.length) variables.push(Math.floor(azar() * nVariables));

  let mejor = null;
  const padre = (G * G) / (H + o.lambda);
  for (const variable of variables) {
    // Sumamos g, h y nº de filas por tramo; así evaluar cada corte posible cuesta muy poco
    const nTramos = o.tramosPorVariable[variable] + 1;
    const sumaG = new Float64Array(nTramos);
    const sumaH = new Float64Array(nTramos);
    const cuenta = new Int32Array(nTramos);
    for (const i of filas) {
      const t = B[i][variable];
      sumaG[t] += g[i]; sumaH[t] += h[i]; cuenta[t]++;
    }
    // Probamos un corte tras cada tramo, acumulando lo que queda a la izquierda
    let gIzq = 0, hIzq = 0, nIzq = 0;
    for (let t = 0; t < nTramos - 1; t++) {
      gIzq += sumaG[t]; hIzq += sumaH[t]; nIzq += cuenta[t];
      const nDer = filas.length - nIzq;
      if (nIzq < o.hojaMinima || nDer < o.hojaMinima) continue;
      const ganancia =
        0.5 * ((gIzq * gIzq) / (hIzq + o.lambda) + (G - gIzq) ** 2 / (H - hIzq + o.lambda) - padre) - o.gamma;
      if (ganancia > 0 && (!mejor || ganancia > mejor.ganancia)) mejor = { ganancia, variable, tramo: t };
    }
  }
  if (!mejor) return hoja; // ningún corte compensa → hoja

  const filasIzq = filas.filter((i) => B[i][mejor.variable] <= mejor.tramo);
  const filasDer = filas.filter((i) => B[i][mejor.variable] > mejor.tramo);
  return {
    variable: mejor.variable,
    tramo: mejor.tramo,
    izq: arbolXgb(B, g, h, filasIzq, o, azar, profundidad + 1),
    der: arbolXgb(B, g, h, filasDer, o, azar, profundidad + 1),
  };
}

function predecirXgb(arbol, filaEnTramos) {
  let nodo = arbol;
  while (nodo.variable !== undefined) nodo = filaEnTramos[nodo.variable] <= nodo.tramo ? nodo.izq : nodo.der;
  return nodo.valor;
}

// ── Árbol de CatBoost (simétrico) ────────────────────────────────────────────────────────────
// En cada nivel se elige UNA pregunta (variable + tramo) que se aplica a TODAS las hojas del nivel.
// Con profundidad d hay 2^d hojas. "hojaDe[i]" dice en qué hoja está cada fila (un número en binario:
// cada bit es la respuesta sí/no a la pregunta de un nivel).
function arbolCatboost(B, g, h, filas, o) {
  const nVariables = B[0].length;
  const cortes = [];
  const hojaDe = new Int32Array(B.length);

  for (let nivel = 0; nivel < o.profundidad; nivel++) {
    const nHojas = 1 << nivel;
    let mejor = null;
    for (let variable = 0; variable < nVariables; variable++) {
      const nTramos = o.tramosPorVariable[variable] + 1;
      // sumas de g y h por (hoja, tramo)
      const sumaG = new Float64Array(nHojas * nTramos);
      const sumaH = new Float64Array(nHojas * nTramos);
      for (const i of filas) {
        const k = hojaDe[i] * nTramos + B[i][variable];
        sumaG[k] += g[i]; sumaH[k] += h[i];
      }
      // totales de cada hoja
      const gIzq = new Float64Array(nHojas), hIzq = new Float64Array(nHojas);
      const gTotal = new Float64Array(nHojas), hTotal = new Float64Array(nHojas);
      for (let hoja = 0; hoja < nHojas; hoja++) {
        for (let t = 0; t < nTramos; t++) {
          gTotal[hoja] += sumaG[hoja * nTramos + t];
          hTotal[hoja] += sumaH[hoja * nTramos + t];
        }
      }
      // la ganancia de un corte es la suma de lo que gana cada hoja al partirse con la MISMA pregunta
      for (let t = 0; t < nTramos - 1; t++) {
        let ganancia = 0;
        for (let hoja = 0; hoja < nHojas; hoja++) {
          gIzq[hoja] += sumaG[hoja * nTramos + t];
          hIzq[hoja] += sumaH[hoja * nTramos + t];
          ganancia +=
            gIzq[hoja] ** 2 / (hIzq[hoja] + o.lambda) +
            (gTotal[hoja] - gIzq[hoja]) ** 2 / (hTotal[hoja] - hIzq[hoja] + o.lambda) -
            gTotal[hoja] ** 2 / (hTotal[hoja] + o.lambda);
        }
        if (!mejor || ganancia > mejor.ganancia) mejor = { ganancia, variable, tramo: t };
      }
    }
    if (!mejor) break;
    cortes.push(mejor);
    for (const i of filas) hojaDe[i] = hojaDe[i] * 2 + (B[i][mejor.variable] > mejor.tramo ? 1 : 0);
  }

  // Valor de cada hoja: −G/(H+λ)
  const nHojasFinal = 1 << cortes.length;
  const G = new Float64Array(nHojasFinal);
  const H = new Float64Array(nHojasFinal);
  for (const i of filas) { G[hojaDe[i]] += g[i]; H[hojaDe[i]] += h[i]; }
  const valores = Array.from({ length: nHojasFinal }, (_, hoja) => -G[hoja] / (H[hoja] + o.lambda));
  return { cortes, valores };
}

function predecirCatboost(arbol, filaEnTramos) {
  let hoja = 0;
  for (const corte of arbol.cortes) hoja = hoja * 2 + (filaEnTramos[corte.variable] > corte.tramo ? 1 : 0);
  return arbol.valores[hoja];
}

// ── Entrenar un modelo de boosting ───────────────────────────────────────────────────────────
// tipo = 'xgb' o 'cat'.  Devuelve una función predecir(x).
export function entrenarBoosting(X, y, tarea, tipo, o) {
  const { cortes, tramoDe } = crearTramos(X);
  const B = X.map(tramoDe);
  const perdida = crearPerdida(tarea);
  const azar = rng(o.semilla || 5);
  const n = X.length;
  const opciones = { ...o, tramosPorVariable: cortes.map((c) => c.length) };
  const construir = tipo === 'xgb' ? arbolXgb : arbolCatboost;
  const predecirArbol = tipo === 'xgb' ? predecirXgb : predecirCatboost;

  // Empezamos con una predicción constante para todas las filas…
  const inicio = perdida.inicial(y);
  const F = Array(n).fill(inicio);
  const arboles = [];

  // …y en cada ronda añadimos un árbol que corrige el error que queda.
  for (let ronda = 0; ronda < o.rondas; ronda++) {
    const gh = y.map((real, i) => perdida.gradienteYHessiano(F[i], real));
    const g = gh.map((v) => v[0]);
    const h = gh.map((v) => v[1]);
    // cada árbol se entrena con una muestra al azar de las filas (submuestreo)
    const filas = [...Array(n).keys()].filter(() => azar() < o.submuestra);
    const arbol = tipo === 'xgb' ? construir(B, g, h, filas, opciones, azar) : construir(B, g, h, filas, opciones);
    arboles.push(arbol);
    for (let i = 0; i < n; i++) F[i] += o.eta * predecirArbol(arbol, B[i]);
  }

  // Predicción final para una fila nueva: inicio + η·Σ árboles (y se convierte en probabilidad si clasificamos)
  return (x) => {
    const enTramos = tramoDe(x);
    return perdida.salida(arboles.reduce((suma, arbol) => suma + o.eta * predecirArbol(arbol, enTramos), inicio));
  };
}
