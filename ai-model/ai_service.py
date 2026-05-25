from fastapi import FastAPI
from pydantic import BaseModel
import xml.etree.ElementTree as ET
import re
import joblib
import pandas as pd
import shap

# ==== Config / constants ====

MODEL_PATH = "refusal_model.joblib"

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

UUID_REGEX = re.compile(
    r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
)
IBAN_REGEX = re.compile(r"^[A-Z]{2}[0-9A-Z]{13,32}$")
BIC_REGEX = re.compile(r"^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$")


# ==== Helper functions for XML parsing ====

def strip_namespaces(root: ET.Element):
    for elem in root.iter():
        if "}" in elem.tag:
            elem.tag = elem.tag.split("}", 1)[1]
    return root


def text_or_none(elem):
    if elem is None or elem.text is None:
        return None
    return elem.text.strip()


def parse_pacs_xml_to_features(xml_content: str) -> dict:
    root = ET.fromstring(xml_content)
    strip_namespaces(root)

    # ----- Amount & currency -----
    amount = 0.0
    currency = "EUR"

    amt_el = root.find(".//InstdAmt")
    if amt_el is None:
        amt_el = root.find(".//IntrBkSttlmAmt")

    if amt_el is not None and amt_el.text:
        amt_text = amt_el.text.replace(",", ".").strip()
        try:
            amount = float(amt_text)
        except ValueError:
            amount = 0.0
        if "Ccy" in amt_el.attrib:
            currency = amt_el.attrib["Ccy"].strip().upper()

    # ----- UETR validity -----
    uetr_valid = 0
    uetr_el = root.find(".//UETR")
    if uetr_el is not None and uetr_el.text:
        uetr = uetr_el.text.strip()
        if UUID_REGEX.match(uetr):
            uetr_valid = 1

    # ----- Country (pays) -----
    dbtr_ctry_el = root.find(".//Dbtr/PstlAdr/Ctry")
    cdtr_ctry_el = root.find(".//Cdtr/PstlAdr/Ctry")

    country = text_or_none(dbtr_ctry_el) or text_or_none(cdtr_ctry_el) or "FR"
    country = country.upper()

    # ----- IBAN -----
    iban_valid = 0
    iban_country = country

    iban_el = root.find(".//DbtrAcct//IBAN")
    if iban_el is None:
        iban_el = root.find(".//CdtrAcct//IBAN")

    if iban_el is not None and iban_el.text:
        iban = iban_el.text.replace(" ", "").strip().upper()
        if IBAN_REGEX.match(iban):
            iban_valid = 1
        if len(iban) >= 2:
            iban_country = iban[:2]

    # ----- BIC -----
    bic_valid = 0
    bic_country = country

    bic_el = (
        root.find(".//DbtrAgt//BICFI")
        or root.find(".//DbtrAgt//BIC")
        or root.find(".//CdtrAgt//BICFI")
        or root.find(".//CdtrAgt//BIC")
    )

    if bic_el is not None and bic_el.text:
        bic = bic_el.text.strip().upper()
        if BIC_REGEX.match(bic):
            bic_valid = 1
        if len(bic) >= 6:
            bic_country = bic[4:6]

    # ----- Mismatches -----
    iban_country_mismatch = int(
        iban_country and country and iban_country != country
    )
    bic_country_mismatch = int(
        bic_country and country and bic_country != country
    )

    return {
        "amount": float(amount),
        "currency": currency,
        "country": country,
        "iban_country": iban_country,
        "bic_country": bic_country,
        "uetr_valid": int(uetr_valid),
        "iban_valid": int(iban_valid),
        "bic_valid": int(bic_valid),
        "iban_country_mismatch": int(iban_country_mismatch),
        "bic_country_mismatch": int(bic_country_mismatch),
    }


# ==== Load model and build SHAP explainer once ====

model = joblib.load(MODEL_PATH)

# Build a small background for SHAP
background = pd.DataFrame(
    [
        {
            "amount": 1000.0,
            "currency": "EUR",
            "country": "FR",
            "iban_country": "FR",
            "bic_country": "FR",
            "uetr_valid": 1,
            "iban_valid": 1,
            "bic_valid": 1,
            "iban_country_mismatch": 0,
            "bic_country_mismatch": 0,
        },
        {
            "amount": 500000.0,
            "currency": "USD",
            "country": "US",
            "iban_country": "US",
            "bic_country": "US",
            "uetr_valid": 1,
            "iban_valid": 1,
            "bic_valid": 1,
            "iban_country_mismatch": 0,
            "bic_country_mismatch": 0,
        },
        {
            "amount": 900000.0,
            "currency": "NGN",
            "country": "NG",
            "iban_country": "NG",
            "bic_country": "NG",
            "uetr_valid": 0,
            "iban_valid": 0,
            "bic_valid": 0,
            "iban_country_mismatch": 0,
            "bic_country_mismatch": 0,
        },
    ],
    columns=FEATURE_COLUMNS,
)


def f_shap(X):
    X_df = pd.DataFrame(X, columns=FEATURE_COLUMNS)
    return model.predict_proba(X_df)[:, 1]


explainer = shap.KernelExplainer(f_shap, background, link="logit")


# ==== FastAPI app ====

app = FastAPI()


class ScorePacsRequest(BaseModel):
    xml: str
    with_shap: bool = False


@app.post("/score-pacs")
def score_pacs(req: ScorePacsRequest):
    # 1) Parse XML -> features
    features = parse_pacs_xml_to_features(req.xml)

    # 2) Predict probability
    x = pd.DataFrame([features], columns=FEATURE_COLUMNS)
    proba = float(model.predict_proba(x)[0, 1])
    percentage = round(proba * 100.0, 2)

    # 3) Optional SHAP
    shap_contrib = None
    if req.with_shap:
        shap_values = explainer.shap_values(x)[0]
        shap_contrib = {
            name: float(val)
            for name, val in zip(FEATURE_COLUMNS, shap_values)
        }

    return {
        "probability": proba,
        "percentage": percentage,
        "features": features,
        "shap": shap_contrib,
    }