# Astale · Predictive model documentation

Astale's Super-Intelligence is **our own predictive model**, trained on NASA data. It runs entirely in the browser (`src/js/ml/`, `src/js/panel/model-block.js`) and is live at **https://astale.com → Model**: no server, no paid API, and the same numbers every time (fixed seeds).

## 1. What it predicts

The model works on a fuel droplet burning in microgravity and answers two questions:

| Task | Type | Target | Why it matters for fire safety |
|---|---|---|---|
| **How fast does it burn?** | Regression | Burning-rate constant **K** of the d² law (mm²/s) | Sets how fast a fire consumes fuel; feeds the Fire Twin's spread speed |
| **Does the flame go out by itself?** | Classification | `Extinction` (yes) vs. `Disruption` or `Completion` (no) | Tells when an inert atmosphere (CO₂, helium) is enough to put a fire out, which is the principle behind the ISS CO₂ extinguishers |

## 2. Data

- **Source:** NASA Physical Sciences Informatics, **FLEX** (Flame Extinguishment Experiment, PSI-69), CC0 licence. These are droplets burned on the International Space Station.
- **Rows:** 257 droplets of heptane and methanol. The tables are cleaned and unified in `scripts/export-model-data.mjs`, and published as `datasets/flex_gotas.csv`.
- **Six input variables:**

  | Variable | Range in the data |
  |---|---|
  | Fuel | heptane or methanol |
  | Oxygen fraction | 0.12–0.34 |
  | Pressure | 0.2–3 atm |
  | CO₂ fraction | 0–0.7 |
  | Helium fraction | 0–0.45 |
  | Initial droplet diameter | 1.1–4.7 mm |

- **Class balance:** 177 of the 257 flames went out by themselves (69 %). That 69 % is the score of always answering "yes", and the baseline the model has to beat.

## 3. Models

All models are written from scratch in JavaScript. XGBoost and CatBoost are **implementations of their published algorithms**, not the official libraries. Like those libraries, they split each feature into 32 histogram bins.

| Model | Key settings | Reference |
|---|---|---|
| **XGBoost** (algorithm) | Second-order gradient boosting with leaf-weight regularisation. Split gain = ½[G_L²/(H_L+λ) + G_R²/(H_R+λ) − G²/(H+λ)] − γ. Settings: 300 trees, depth 4, η = 0.05, λ = 1, 80 % row and column subsampling. | Chen & Guestrin, KDD 2016 |
| **CatBoost** (algorithm) | Boosting with **symmetric (oblivious) trees**, where every node of a level asks the same question. Settings: 300 trees, depth 4, η = 0.05, λ = 3. Full *ordered boosting* is not implemented. | Prokhorenkova et al., NeurIPS 2018 |
| **Random forest** | 120 CART trees on bootstrap samples, 60 % of the features tried at each split. | Breiman, 2001 |
| **Linear / logistic regression** | Ridge least squares for regression; L2-regularised logistic regression for classification. | — |
| **k-nearest neighbours** | k = 7, distance-weighted, on standardised features. | — |
| **Ensemble** (used to predict) | **Weighted mean: XGBoost 40 %, CatBoost 40 %, random forest 10 %, linear 10 %.** The team chose more weight on boosting. | — |

For classification, the boosting models use the logistic loss, with gradient p − y and Hessian p(1 − p).

## 4. Validation

- **Method:** 5-fold cross-validation with a fixed shuffle (seed 2026). Every droplet is predicted by a model that never saw it during training.
- **Regression metrics:** R² and mean absolute error.
- **Classification metrics:** accuracy and AUC, compared with the 69 % majority-class baseline.
- **Variable importance:** permutation importance on the held-out folds, i.e. how much the error grows when one variable is shuffled.

### Results (5-fold cross-validation, 257 droplets)

| Model | Burning rate R² | Burning rate MAE (mm²/s) | Goes out by itself: accuracy | AUC |
|---|---|---|---|---|
| **Weighted ensemble (40/40/10/10)**, used to predict | **0.70** | **0.049** | **84 %** | **0.89** |
| Linear / logistic | 0.70 | 0.048 | 83 % | 0.89 |
| CatBoost (algorithm) | 0.69 | 0.050 | 84 % | 0.89 |
| Random forest | 0.67 | 0.051 | 86 % | 0.88 |
| XGBoost (algorithm) | 0.67 | 0.052 | 84 % | 0.89 |
| k-nearest neighbours | 0.67 | 0.053 | 82 % | 0.88 |
| *Equal-weight ensemble (25 % each), for comparison* | *0.71* | *0.047* | *86 %* | *0.89* |

**How to read it:**
- The weighted ensemble used to predict explains 70 % of the variation in burning rate on droplets it never saw. It gets 84 % of the extinctions right, 15 points above the baseline, with AUC 0.89.
- Giving boosting more weight costs a little against equal weights (R² 0.71, 86 %). Linear regression and the random forest are strong on this small dataset. We report this rather than hide it.
- **Oxygen** is by far the most important variable, followed by droplet size. This matches combustion physics.
- With only 257 droplets, complex models barely beat linear regression. We report that honestly rather than hide it.

## 5. How it is used in Astale

1. **Model tab:** train and compare the models live, see which variables matter, and predict for any fuel, oxygen, pressure, CO₂, helium and droplet size. Every prediction shows a ± band (the spread across the forest's 120 trees) and is flagged when it falls outside the tested ranges.
2. **Fire Twin:** a simpler fit to the same FLEX data, K = 0.013 + 1.842·O₂ + 0.170·p (±0.105 mm²/s), adjusts how fast a fire grows with oxygen and pressure. Separately, a logistic regression trained on 82 BASS-II observations gives the probability that a flame keeps burning (±1.4 O₂ points).
3. **Ask:** an optional assistant (Claude) that answers only from the data on the page. It is not part of the predictive model.

## 6. Limits

- The training data are droplets of two liquid fuels in microgravity, not fabrics or plastics. The Fire Twin covers those with BASS-II and Saffire.
- The training data contain no partial gravity (Moon, Mars). Those cases are extrapolated and flagged.
- The XGBoost and CatBoost implementations follow the papers but are not the official libraries, so results may differ slightly from them.
- Still to do: validating CO growth in a crewed cabin against NASA's Saffire CFD model (Niehaus 2026), and a scientific review by José Luis Endrino and Prof. Saurav Goel.

## 7. Reproduce

1. Open https://astale.com, go to the **Model** tab and wait about 10 seconds while it trains.
2. Or run the same code in Node.js: `src/js/ml/index.js` exports `MODELS` and `crossValidate`. Load `datasets/flex_gotas.csv`, keep the rows with K and pressure > 0, and use features `[fuel==heptane, o2, p, co2, he, d0]`.
