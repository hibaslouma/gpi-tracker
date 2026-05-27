import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score, classification_report
import shap
import joblib


# ---------------------------------------------------
# 1) Generate synthetic payments (virtual dataset)
# ---------------------------------------------------

def generate_synthetic_payments(n_samples=5000, random_state=42):
    rng = np.random.default_rng(random_state)

    currencies = ["EUR", "USD", "GBP", "CHF", "JPY", "NGN", "RUB"]
    countries = ["FR", "DE", "ES", "IT", "GB", "US", "RU", "NG", "IR"]
    high_risk_countries = {"RU", "NG", "IR"}
    high_risk_currencies = {"NGN", "RUB"}

    data = []

    for _ in range(n_samples):
        # Base country (pays)
        country = rng.choice(countries, p=[0.15, 0.15, 0.1, 0.1, 0.15, 0.15, 0.07, 0.07, 0.06])

        # Amount: log-uniform between 10 and 1,000,000
        log_amount = rng.uniform(1, 6)
        amount = 10 ** log_amount

        # Currency
        currency = rng.choice(currencies, p=[0.4, 0.25, 0.1, 0.05, 0.05, 0.08, 0.07])

        # UETR valid (most valid)
        uetr_valid = rng.random() < 0.95

        # IBAN country: usually matches pays, sometimes not
        if rng.random() < 0.85:
            iban_country = country
        else:
            iban_country = rng.choice(countries)

        # BIC country: usually matches pays, sometimes not
        if rng.random() < 0.88:
            bic_country = country
        else:
            bic_country = rng.choice(countries)

        # IBAN/BIC validity (most valid)
        iban_valid = rng.random() < 0.97
        bic_valid = rng.random() < 0.97

        # Mismatches
        iban_country_mismatch = int(iban_country != country)
        bic_country_mismatch = int(bic_country != country)

        # ----- Synthetic "true" rejection probability (rule-based) -----
        z = -4.0  # base log-odds (low base rejection)

        # Amount risk (bigger => higher risk)
        z += 0.7 * (np.log10(amount) - 3.0)  # center around 10^3

        # Country risk
        if country in high_risk_countries:
            z += 1.2

        # Currency risk
        if currency in high_risk_currencies:
            z += 0.7
        elif currency in {"EUR", "USD", "GBP", "CHF"}:
            z += 0.0
        else:
            z += 0.2

        # UETR / IBAN / BIC validity
        if not uetr_valid:
            z += 1.0
        if not iban_valid:
            z += 0.8
        if not bic_valid:
            z += 0.8

        # Mismatches IBAN/BIC vs pays
        z += 0.9 * iban_country_mismatch
        z += 0.9 * bic_country_mismatch

        # Convert log-odds to probability and sample label
        p_reject = 1.0 / (1.0 + np.exp(-z))
        rejected = rng.random() < p_reject

        data.append({
            "amount": amount,
            "currency": currency,
            "country": country,
            "iban_country": iban_country,
            "bic_country": bic_country,
            "uetr_valid": int(uetr_valid),
            "iban_valid": int(iban_valid),
            "bic_valid": int(bic_valid),
            "iban_country_mismatch": iban_country_mismatch,
            "bic_country_mismatch": bic_country_mismatch,
            "rejected": int(rejected),
        })

    df = pd.DataFrame(data)
    return df


# ---------------------------------------------------
# 2) Train model on synthetic data
# ---------------------------------------------------

def train_model(df: pd.DataFrame):
    y = df["rejected"]
    X = df.drop(columns=["rejected"])

    numeric_features = [
        "amount",
        "uetr_valid",
        "iban_valid",
        "bic_valid",
        "iban_country_mismatch",
        "bic_country_mismatch",
    ]

    categorical_features = [
        "currency",
        "country",
        "iban_country",
        "bic_country",
    ]

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), numeric_features),
            ("cat", OneHotEncoder(handle_unknown="ignore"), categorical_features),
        ]
    )

    clf = LogisticRegression(max_iter=5000, class_weight="balanced")

    model = Pipeline(steps=[
        ("preprocess", preprocessor),
        ("clf", clf),
    ])

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )

    model.fit(X_train, y_train)

    proba_test = model.predict_proba(X_test)[:, 1]
    auc = roc_auc_score(y_test, proba_test)
    print(f"AUC on synthetic test set: {auc:.3f}")
    print(classification_report(y_test, proba_test > 0.5))

    return model, X_train, X_test, y_train, y_test


# ---------------------------------------------------
# 3) Build SHAP explainer (not saved, used in-memory)
# ---------------------------------------------------

def build_shap_explainer(model: Pipeline, X_train: pd.DataFrame, nsamples_background: int = 200):
    # Sample background for SHAP
    if len(X_train) > nsamples_background:
        background = X_train.sample(nsamples_background, random_state=42)
    else:
        background = X_train

    feature_names = list(X_train.columns)

    def f(X_array):
        X_df = pd.DataFrame(X_array, columns=feature_names)
        return model.predict_proba(X_df)[:, 1]

    explainer = shap.KernelExplainer(f, background, link="logit")
    return explainer


# ---------------------------------------------------
# 4) Predict & explain one example with SHAP
# ---------------------------------------------------

def predict_and_explain_one(model: Pipeline,
                            explainer: shap.KernelExplainer,
                            example: dict,
                            feature_names):
    x = pd.DataFrame([example], columns=feature_names)
    proba = float(model.predict_proba(x)[0, 1])
    print(f"\nPredicted rejection probability: {proba:.3f} ({proba * 100:.2f} %)")

    shap_values = explainer.shap_values(x)[0]  # first (and only) sample
    contributions = dict(zip(feature_names, shap_values))

    print("\nSHAP feature contributions (log-odds scale):")
    for k, v in contributions.items():
        print(f"  {k:25s}: {v:+.4f}")

    return proba, contributions


# ---------------------------------------------------
# Main script
# ---------------------------------------------------

if __name__ == "__main__":
    # 1) Generate virtual dataset
    df = generate_synthetic_payments(n_samples=5000)
    print("Synthetic dataset sample:")
    print(df.head())

    # 2) Train model
    model, X_train, X_test, y_train, y_test = train_model(df)

    # 3) Save model
    joblib.dump(model, "refusal_model.joblib")
    print("\nSaved trained model to refusal_model.joblib")

    # 4) Build SHAP explainer in memory
    print("\nBuilding SHAP explainer (this may take a bit)...")
    explainer = build_shap_explainer(model, X_train)
    print("SHAP explainer built in memory.")

    # 5) Example payment to explain
    example_payment = {
        "amount": 250000.0,
        "currency": "USD",
        "country": "FR",
        "iban_country": "FR",
        "bic_country": "DE",           # mismatch => extra risk
        "uetr_valid": 1,
        "iban_valid": 1,
        "bic_valid": 1,
        "iban_country_mismatch": int("FR" != "FR"),   # 0
        "bic_country_mismatch": int("DE" != "FR"),    # 1
    }

    print("\nExplaining example payment:")
    print(example_payment)

    predict_and_explain_one(
        model,
        explainer,
        example_payment,
        feature_names=X_train.columns,
    )