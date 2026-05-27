import joblib
import pandas as pd

# Load the trained model
model = joblib.load("refusal_model.joblib")

# IMPORTANT: feature names must match the training script
FEATURE_COLUMNS = [
    "amount",
    "currency",
    "country",
    "iban_country",
    "bic_country",
    "uetr_valid",
    "iban_valid",
    "bic_valid",
    "iban_country_mismatch",
    "bic_country_mismatch",
]

def predict(payment):
    """payment is a dict with all FEATURE_COLUMNS"""
    x = pd.DataFrame([payment], columns=FEATURE_COLUMNS)
    proba = float(model.predict_proba(x)[0, 1])
    return proba

def main():
    scenarios = [
        {
            "name": "Very low risk - small EUR, all consistent FR",
            "data": {
                "amount": 500.0,
                "currency": "EUR",
                "country": "FR",
                "iban_country": "FR",
                "bic_country": "FR",
                "uetr_valid": 1,
                "iban_valid": 1,
                "bic_valid": 1,
                "iban_country_mismatch": 0,
                "bic_country_mismatch": 0,
            }
        },
        {
            "name": "Medium risk - larger USD, BIC mismatch",
            "data": {
                "amount": 80000.0,
                "currency": "USD",
                "country": "FR",
                "iban_country": "FR",
                "bic_country": "DE",   # mismatch with FR
                "uetr_valid": 1,
                "iban_valid": 1,
                "bic_valid": 1,
                "iban_country_mismatch": 0,
                "bic_country_mismatch": 1,
            }
        },
        {
            "name": "High risk - huge NGN, high-risk country & invalid IBAN/BIC",
            "data": {
                "amount": 900000.0,
                "currency": "NGN",     # high-risk currency
                "country": "NG",       # high-risk country
                "iban_country": "NG",
                "bic_country": "NG",
                "uetr_valid": 0,       # invalid UETR
                "iban_valid": 0,       # invalid IBAN
                "bic_valid": 0,        # invalid BIC
                "iban_country_mismatch": 0,
                "bic_country_mismatch": 0,
            }
        },
    ]

    for s in scenarios:
        p = predict(s["data"])
        print(f"{s['name']}: {p:.3f}  ({p*100:.2f} %)")

if __name__ == "__main__":
    main()