"""
========================================================================
  API FLASK — Module IA GPI Tracker
  Endpoint REST pour l'intégration Spring Boot
  Commande : python api.py
  Port      : 5000
========================================================================
"""

from flask import Flask, request, jsonify
import pandas as pd
import numpy as np
import joblib
import os
import traceback
from datetime import datetime

app = Flask(__name__)

# =====================================================================
# CONFIGURATION
# =====================================================================

MODEL_DIR = os.path.dirname(os.path.abspath(__file__))

VALID_COUNTRIES = {
    'FR','DE','ES','IT','BE','NL','AT','PT',
    'GB','CH','DZ','MA','TN','EG','TR',
    'US','CA','JP','CN','AU'
}
EMBARGO = {'KP','IR','SY','CU','VE','SD'}
VALID_CURR = {
    'EUR','GBP','CHF','DZD','MAD','TND',
    'EGP','TRY','USD','CAD','JPY','CNY','AUD'
}
VALID_MSG = {'pacs.008', 'pacs.009'}
EUROZONE  = {'FR','DE','ES','IT','BE','NL','AT','PT'}


# =====================================================================
# CHARGEMENT DES MODÈLES (au démarrage)
# =====================================================================

print("[INFO] Chargement des modèles ML...")
try:
    model_status  = joblib.load(os.path.join(MODEL_DIR, 'model_status.pkl'))
    model_reason  = joblib.load(os.path.join(MODEL_DIR, 'model_reason.pkl'))
    label_encoder = joblib.load(os.path.join(MODEL_DIR, 'label_encoder.pkl'))
    print("✅ Modèles chargés avec succès.")
except FileNotFoundError as e:
    print(f"⚠️  Modèles non trouvés : {e}")
    print("   → Lance d'abord : python train_model.py")
    model_status = model_reason = label_encoder = None


# =====================================================================
# FEATURE ENGINEERING (identique à train_model.py)
# =====================================================================

def extract_features(row: dict) -> pd.DataFrame:
    """
    Calcule les features ML depuis les champs SWIFT bruts.
    Doit être identique à la fonction dans train_model.py.
    """
    df = pd.DataFrame([row])
    X  = pd.DataFrame()

    # Longueurs
    X['sender_iban_len']   = df['sender_iban'].str.len()
    X['receiver_iban_len'] = df['receiver_iban'].str.len()
    X['sender_bic_len']    = df['sender_bic'].str.len()
    X['receiver_bic_len']  = df['receiver_bic'].str.len()

    # IBAN pays
    X['sender_iban_country_known'] = df['sender_iban'].str[:2].apply(
        lambda c: int(c in VALID_COUNTRIES))
    X['receiver_iban_country_known'] = df['receiver_iban'].str[:2].apply(
        lambda c: int(c in VALID_COUNTRIES))

    # IBAN corps numérique
    X['sender_iban_body_numeric'] = df['sender_iban'].apply(
        lambda s: int(s[4:].isdigit()) if len(s) > 4 else 0)
    X['receiver_iban_body_numeric'] = df['receiver_iban'].apply(
        lambda s: int(s[4:].isdigit()) if len(s) > 4 else 0)

    # IBAN longueur standard
    X['sender_iban_len_ok']   = X['sender_iban_len'].between(15, 34).astype(int)
    X['receiver_iban_len_ok'] = X['receiver_iban_len'].between(15, 34).astype(int)

    # BIC structure
    def bic_ok(b):
        if not isinstance(b, str): return 0
        return int(len(b) in (8,11) and b[:4].isalpha() and b[:4].isupper())
    X['sender_bic_struct_ok']   = df['sender_bic'].apply(bic_ok)
    X['receiver_bic_struct_ok'] = df['receiver_bic'].apply(bic_ok)

    # BIC pays
    X['sender_bic_country_known'] = df['sender_bic'].apply(
        lambda b: int(b[4:6] in VALID_COUNTRIES) if len(b) >= 6 else 0)
    X['receiver_bic_country_known'] = df['receiver_bic'].apply(
        lambda b: int(b[4:6] in VALID_COUNTRIES) if len(b) >= 6 else 0)

    # BIC embargo
    X['receiver_bic_embargo'] = df['receiver_bic'].apply(
        lambda b: int(b[4:6] in EMBARGO) if len(b) >= 6 else 0)
    X['sender_bic_embargo'] = df['sender_bic'].apply(
        lambda b: int(b[4:6] in EMBARGO) if len(b) >= 6 else 0)

    # Deux BIC invalides
    X['both_bic_invalid'] = (
        (X['sender_bic_struct_ok'] == 0) &
        (X['receiver_bic_struct_ok'] == 0)).astype(int)

    # Cohérence pays IBAN/BIC
    X['sender_country_match'] = (
        df['sender_iban'].str[:2] == df['sender_bic'].str[4:6]).astype(int)
    X['receiver_country_match'] = (
        df['receiver_iban'].str[:2] == df['receiver_bic'].str[4:6]).astype(int)

    # Montant
    X['amount']     = df['amount']
    X['amount_log'] = np.log1p(df['amount'])

    def count_dec(v):
        s = str(v)
        return len(s.split('.')[1].rstrip('0')) if '.' in s else 0
    X['amount_decimal_places'] = df['amount'].apply(count_dec)
    X['amount_has_3_dec']      = (X['amount_decimal_places'] == 3).astype(int)

    X['amount_quasi_nul']       = (df['amount'] < 0.5).astype(int)
    X['amount_normal']          = df['amount'].between(0.5, 100_000).astype(int)
    X['amount_eleve']           = df['amount'].between(100_001, 449_999).astype(int)
    X['amount_zone_grise']      = df['amount'].between(450_000, 500_000).astype(int)
    X['amount_depasse_plafond'] = (df['amount'] > 500_000).astype(int)

    # Devise
    X['currency_known'] = df['currency'].apply(lambda c: int(c in VALID_CURR))
    for cur in ['EUR','USD','GBP','CHF','TND','MAD','DZD','JPY','CAD','CNY','AUD']:
        X[f'currency_{cur}'] = (df['currency'] == cur).astype(int)

    # msg_type
    X['msg_type_valid']   = df['msg_type'].apply(lambda m: int(m in VALID_MSG))
    X['msg_type_pacs008'] = (df['msg_type'] == 'pacs.008').astype(int)
    X['msg_type_pacs009'] = (df['msg_type'] == 'pacs.009').astype(int)

    return X


# =====================================================================
# EXPLICATION SHAP (optionnelle)
# =====================================================================

def get_shap_explanation(features: pd.DataFrame) -> list:
    """Retourne les top-5 features SHAP pour une transaction."""
    try:
        import shap
        explainer   = shap.TreeExplainer(model_status)
        shap_values = explainer.shap_values(features)
        impacts     = dict(zip(features.columns, shap_values[0]))
        top5 = sorted(impacts.items(), key=lambda x: abs(x[1]), reverse=True)[:5]
        return [
            {
                "feature": feat,
                "value"  : float(features[feat].iloc[0]),
                "impact" : round(float(impact), 4),
                "direction": "→ RJCT" if impact > 0 else "→ ACCP"
            }
            for feat, impact in top5
        ]
    except Exception:
        return []


# =====================================================================
# VALIDATION DES INPUTS
# =====================================================================

REQUIRED_FIELDS = [
    'sender_iban', 'receiver_iban',
    'sender_bic',  'receiver_bic',
    'amount', 'currency', 'msg_type'
]

def validate_input(data: dict) -> list:
    """Retourne la liste des erreurs de validation."""
    errors = []
    for field in REQUIRED_FIELDS:
        if field not in data or data[field] is None or str(data[field]).strip() == '':
            errors.append(f"Champ manquant ou vide : '{field}'")

    if 'amount' in data:
        try:
            amt = float(data['amount'])
            if amt < 0:
                errors.append("Le montant ne peut pas être négatif.")
        except (ValueError, TypeError):
            errors.append("Le champ 'amount' doit être un nombre.")

    return errors


# =====================================================================
# ENDPOINTS
# =====================================================================

# ── Health check ──────────────────────────────────────────────────────
@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status"       : "OK",
        "service"      : "GPI Tracker AI Module",
        "version"      : "1.0.0",
        "models_loaded": model_status is not None,
        "timestamp"    : datetime.now().isoformat()
    }), 200


# ── Prédiction principale ─────────────────────────────────────────────
@app.route('/predict', methods=['POST'])
def predict():
    """
    Prédit le statut d'une transaction SWIFT.

    Body JSON attendu :
    {
        "sender_iban"  : "FR7614508596748974032823",
        "receiver_iban": "DE89370400440532013000",
        "sender_bic"   : "BNPAFRPP",
        "receiver_bic" : "DEUTDEFF",
        "amount"       : 15000.00,
        "currency"     : "EUR",
        "msg_type"     : "pacs.008"
    }

    Réponse :
    {
        "status"        : "ACCP" | "RJCT",
        "reject_reason" : null | "AC01" | "AM02" | ...,
        "risk_score"    : 0.0342,
        "confidence"    : "96.6%",
        "shap_explanation": [...],
        "processing_time_ms": 12
    }
    """
    start = datetime.now()

    # Modèles chargés ?
    if model_status is None:
        return jsonify({
            "error": "Modèles non chargés. Lance d'abord python train_model.py"
        }), 503

    # Parse JSON
    try:
        data = request.get_json(force=True)
    except Exception:
        return jsonify({"error": "Body JSON invalide."}), 400

    # Validation
    errors = validate_input(data)
    if errors:
        return jsonify({"error": "Données invalides.", "details": errors}), 422

    try:
        # Feature engineering
        row = {
            'sender_iban'  : str(data['sender_iban']).strip(),
            'receiver_iban': str(data['receiver_iban']).strip(),
            'sender_bic'   : str(data['sender_bic']).strip(),
            'receiver_bic' : str(data['receiver_bic']).strip(),
            'amount'       : float(data['amount']),
            'currency'     : str(data['currency']).strip().upper(),
            'msg_type'     : str(data['msg_type']).strip(),
        }
        features = extract_features(row)

        # Prédiction statut
        proba        = model_status.predict_proba(features)[0]
        risk_score   = float(proba[1])
        status       = 'RJCT' if risk_score > 0.5 else 'ACCP'
        confidence   = f"{max(proba) * 100:.1f}%"

        # Motif de rejet (si RJCT)
        reject_reason = None
        if status == 'RJCT':
            reason_enc    = model_reason.predict(features)[0]
            decoded       = label_encoder.inverse_transform([reason_enc])[0]
            reject_reason = decoded if decoded != 'ACCP' else None

        # SHAP
        shap_expl = get_shap_explanation(features)

        # Temps de traitement
        ms = int((datetime.now() - start).total_seconds() * 1000)

        response = {
            "status"           : status,
            "reject_reason"    : reject_reason,
            "risk_score"       : round(risk_score, 4),
            "confidence"       : confidence,
            "shap_explanation" : shap_expl,
            "processing_time_ms": ms,
            "timestamp"        : datetime.now().isoformat()
        }
        return jsonify(response), 200

    except Exception as e:
        return jsonify({
            "error"  : "Erreur interne du serveur.",
            "details": str(e),
            "trace"  : traceback.format_exc()
        }), 500


# ── Prédiction batch (liste de transactions) ──────────────────────────
@app.route('/predict/batch', methods=['POST'])
def predict_batch():
    """
    Prédit le statut de plusieurs transactions en une seule requête.
    Body : { "transactions": [ {...}, {...}, ... ] }
    Limite : 100 transactions par appel.
    """
    if model_status is None:
        return jsonify({"error": "Modèles non chargés."}), 503

    try:
        data = request.get_json(force=True)
    except Exception:
        return jsonify({"error": "Body JSON invalide."}), 400

    transactions = data.get('transactions', [])
    if not isinstance(transactions, list) or len(transactions) == 0:
        return jsonify({"error": "'transactions' doit être une liste non vide."}), 422
    if len(transactions) > 100:
        return jsonify({"error": "Maximum 100 transactions par appel batch."}), 422

    results = []
    for i, tx in enumerate(transactions):
        errors = validate_input(tx)
        if errors:
            results.append({"index": i, "error": errors})
            continue

        try:
            row = {k: str(tx[k]).strip() if k != 'amount' else float(tx[k])
                   for k in REQUIRED_FIELDS}
            row['currency'] = row['currency'].upper()
            features   = extract_features(row)
            proba      = model_status.predict_proba(features)[0]
            risk_score = float(proba[1])
            status     = 'RJCT' if risk_score > 0.5 else 'ACCP'

            reject_reason = None
            if status == 'RJCT':
                reason_enc    = model_reason.predict(features)[0]
                decoded       = label_encoder.inverse_transform([reason_enc])[0]
                reject_reason = decoded if decoded != 'ACCP' else None

            results.append({
                "index"        : i,
                "status"       : status,
                "reject_reason": reject_reason,
                "risk_score"   : round(risk_score, 4),
                "confidence"   : f"{max(proba)*100:.1f}%",
            })
        except Exception as e:
            results.append({"index": i, "error": str(e)})

    return jsonify({
        "total"  : len(transactions),
        "results": results,
    }), 200


# ── Info modèle ───────────────────────────────────────────────────────
@app.route('/model/info', methods=['GET'])
def model_info():
    return jsonify({
        "model_status" : "XGBoostClassifier (binaire : ACCP/RJCT)",
        "model_reason" : "XGBoostClassifier (13 classes ISO 20022)",
        "reject_codes" : [
            "AC01","AC04","AC06","AC13",
            "AG01","AG02","AGNT",
            "AM01","AM02","AM04","AM09","FF01"
        ],
        "input_fields" : REQUIRED_FIELDS,
        "explainability": "SHAP TreeExplainer",
        "loaded"       : model_status is not None,
    }), 200


# =====================================================================
# LANCEMENT
# =====================================================================

if __name__ == '__main__':
    print("\n" + "="*55)
    print("  GPI Tracker — API Module IA")
    print("="*55)
    print("  URL     : http://localhost:5000")
    print("  Endpoints :")
    print("    GET  /health")
    print("    POST /predict")
    print("    POST /predict/batch")
    print("    GET  /model/info")
    print("="*55 + "\n")
    app.run(host='0.0.0.0', port=5000, debug=False)