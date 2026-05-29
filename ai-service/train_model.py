

import pandas as pd
import numpy as np
import re
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
import xgboost as xgb
import warnings
warnings.filterwarnings('ignore')
import joblib

# ── pip install xgboost scikit-learn pandas numpy shap ───────────────


# =====================================================================
# ÉTAPE 1 — Charger uniquement les champs bruts SWIFT
# =====================================================================

print("="*60)
print("  PIPELINE ML — GPI Tracker")
print("="*60)

df = pd.read_csv('generate_swift_dataset.csv')

# On garde SEULEMENT les colonnes brutes SWIFT + les cibles
RAW_COLS = ['sender_iban', 'receiver_iban',
            'sender_bic',  'receiver_bic',
            'amount', 'currency', 'msg_type',
            'status', 'reject_reason']

df = df[RAW_COLS].copy()
print(f"\n✅ Dataset chargé : {len(df):,} lignes")
print(f"   Colonnes brutes utilisées : {RAW_COLS[:-2]}")


# =====================================================================
# ÉTAPE 2 — Feature Engineering DEPUIS les champs bruts
#           (recalculé ici, pas importé du CSV)
# =====================================================================

print("\n[INFO] Feature engineering depuis les champs bruts...")

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

def extract_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Calcule toutes les features ML depuis les champs SWIFT bruts.
    C'est ici que le modèle 'apprend' à détecter les anomalies.
    """
    X = pd.DataFrame()

    # ── Longueurs ─────────────────────────────────────────────────
    X['sender_iban_len']   = df['sender_iban'].str.len()
    X['receiver_iban_len'] = df['receiver_iban'].str.len()
    X['sender_bic_len']    = df['sender_bic'].str.len()
    X['receiver_bic_len']  = df['receiver_bic'].str.len()

    # ── IBAN : pays (2 premiers caractères) ───────────────────────
    X['sender_iban_country_known'] = df['sender_iban'].str[:2].apply(
        lambda c: int(c in VALID_COUNTRIES))
    X['receiver_iban_country_known'] = df['receiver_iban'].str[:2].apply(
        lambda c: int(c in VALID_COUNTRIES))

    # ── IBAN : structure (chiffres après les 4 premiers chars) ────
    X['sender_iban_body_numeric'] = df['sender_iban'].apply(
        lambda s: int(s[4:].isdigit()) if len(s) > 4 else 0)
    X['receiver_iban_body_numeric'] = df['receiver_iban'].apply(
        lambda s: int(s[4:].isdigit()) if len(s) > 4 else 0)

    # ── IBAN : longueur dans la plage standard (15-34) ────────────
    X['sender_iban_len_ok']   = X['sender_iban_len'].between(15, 34).astype(int)
    X['receiver_iban_len_ok'] = X['receiver_iban_len'].between(15, 34).astype(int)

    # ── BIC : structure ───────────────────────────────────────────
    def bic_structure_ok(bic):
        if not isinstance(bic, str): return 0
        if len(bic) not in (8, 11): return 0
        if not bic[:4].isalpha() or not bic[:4].isupper(): return 0
        return 1

    X['sender_bic_struct_ok']   = df['sender_bic'].apply(bic_structure_ok)
    X['receiver_bic_struct_ok'] = df['receiver_bic'].apply(bic_structure_ok)

    # ── BIC : pays reconnu (positions 4-5) ───────────────────────
    X['sender_bic_country_known'] = df['sender_bic'].apply(
        lambda b: int(b[4:6] in VALID_COUNTRIES) if len(b) >= 6 else 0)
    X['receiver_bic_country_known'] = df['receiver_bic'].apply(
        lambda b: int(b[4:6] in VALID_COUNTRIES) if len(b) >= 6 else 0)

    # ── BIC : pays sous embargo ───────────────────────────────────
    X['receiver_bic_embargo'] = df['receiver_bic'].apply(
        lambda b: int(b[4:6] in EMBARGO) if len(b) >= 6 else 0)
    X['sender_bic_embargo'] = df['sender_bic'].apply(
        lambda b: int(b[4:6] in EMBARGO) if len(b) >= 6 else 0)

    # ── Les deux BIC invalides (AGNT) ────────────────────────────
    X['both_bic_invalid'] = (
        (X['sender_bic_struct_ok'] == 0) &
        (X['receiver_bic_struct_ok'] == 0)).astype(int)

    # ── Cohérence IBAN/BIC pays (même pays ?) ────────────────────
    X['sender_country_match'] = (
        df['sender_iban'].str[:2] == df['sender_bic'].str[4:6]).astype(int)
    X['receiver_country_match'] = (
        df['receiver_iban'].str[:2] == df['receiver_bic'].str[4:6]).astype(int)

    # ── Montant ───────────────────────────────────────────────────
    X['amount'] = df['amount']
    X['amount_log'] = np.log1p(df['amount'])   # log pour réduire l'écart

    # Décimales (AM09)
    def count_dec(v):
        s = str(v)
        return len(s.split('.')[1].rstrip('0')) if '.' in s else 0
    X['amount_decimal_places'] = df['amount'].apply(count_dec)
    X['amount_has_3_dec'] = (X['amount_decimal_places'] == 3).astype(int)

    # Catégories montant (ordinales)
    X['amount_quasi_nul']      = (df['amount'] < 0.5).astype(int)
    X['amount_normal']         = df['amount'].between(0.5, 100_000).astype(int)
    X['amount_eleve']          = df['amount'].between(100_001, 449_999).astype(int)
    X['amount_zone_grise']     = df['amount'].between(450_000, 500_000).astype(int)
    X['amount_depasse_plafond'] = (df['amount'] > 500_000).astype(int)

    # ── Devise ───────────────────────────────────────────────────
    X['currency_known'] = df['currency'].apply(
        lambda c: int(c in VALID_CURR))

    # Encode devise (top devises)
    top_currencies = ['EUR','USD','GBP','CHF','TND','MAD','DZD','JPY','CAD','CNY','AUD']
    for cur in top_currencies:
        X[f'currency_{cur}'] = (df['currency'] == cur).astype(int)

    # ── msg_type ──────────────────────────────────────────────────
    X['msg_type_valid'] = df['msg_type'].apply(
        lambda m: int(m in VALID_MSG))
    X['msg_type_pacs008'] = (df['msg_type'] == 'pacs.008').astype(int)
    X['msg_type_pacs009'] = (df['msg_type'] == 'pacs.009').astype(int)

    return X


X = extract_features(df)
print(f" {X.shape[1]} features calculées depuis les champs bruts")
print(f"   Colonnes : {list(X.columns)}")


# =====================================================================
# ÉTAPE 3 — Cibles
# =====================================================================

# Cible 1 : Statut binaire (ACCP=0, RJCT=1)
y_status = (df['status'] == 'RJCT').astype(int)

# Cible 2 : Motif de rejet (multi-classes)
df['reject_reason_filled'] = df['reject_reason'].fillna('ACCP')
le = LabelEncoder()
y_reason = le.fit_transform(df['reject_reason_filled'])

print(f"\n Cibles définies :")
print(f"   y_status → binaire  : {y_status.value_counts().to_dict()}")
print(f"   y_reason → classes  : {list(le.classes_)}")


# =====================================================================
# ÉTAPE 4 — Split train/test (stratifié)
# =====================================================================

X_train, X_test, y_train_s, y_test_s, y_train_r, y_test_r = train_test_split(
    X, y_status, y_reason,
    test_size=0.20,
    random_state=42,
    stratify=y_status
)

print(f"\n Split train/test :")
print(f"   Train : {len(X_train):,} lignes")
print(f"   Test  : {len(X_test):,}  lignes")


# =====================================================================
# ÉTAPE 5 — Modèle 1 : Classification ACCP / RJCT
# =====================================================================


print("  MODÈLE 1 — Statut (ACCP / RJCT)")


model_status = xgb.XGBClassifier(
    n_estimators    = 300,
    max_depth       = 6,
    learning_rate   = 0.05,
    subsample       = 0.8,
    colsample_bytree= 0.8,
    use_label_encoder=False,
    eval_metric     = 'logloss',
    random_state    = 42,
    n_jobs          = -1,
)

model_status.fit(
    X_train, y_train_s,
    eval_set=[(X_test, y_test_s)],
    verbose=False,
)

y_pred_s = model_status.predict(X_test)
acc_s    = accuracy_score(y_test_s, y_pred_s)

print(f"\n  Accuracy : {acc_s:.4f} ({acc_s*100:.2f}%)")
print("\n  Rapport de classification :")
print(classification_report(y_test_s, y_pred_s, target_names=['ACCP','RJCT']))

# Cross-validation
cv_scores = cross_val_score(model_status, X, y_status, cv=5, scoring='f1')
print(f"  Cross-validation F1 (5-fold) : {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

# ── Risque de surapprentissage ? ──────────────────────────────────────
y_pred_train = model_status.predict(X_train)
acc_train = accuracy_score(y_train_s, y_pred_train)
print(f"\n  Accuracy TRAIN : {acc_train*100:.2f}%")
print(f"  Accuracy TEST  : {acc_s*100:.2f}%")
gap = acc_train - acc_s
if gap > 0.05:
    print(f"   Écart train/test = {gap*100:.1f}% → risque de surapprentissage")
else:
    print(f"  Écart train/test = {gap*100:.1f}% → pas de surapprentissage")


# =====================================================================
# ÉTAPE 6 — Modèle 2 : Motif de rejet (multi-classes)
# =====================================================================


print("  MODÈLE 2 — Motif de rejet (13 classes)")


model_reason = xgb.XGBClassifier(
    n_estimators     = 400,
    max_depth        = 7,
    learning_rate    = 0.05,
    subsample        = 0.8,
    colsample_bytree = 0.8,
    use_label_encoder= False,
    eval_metric      = 'mlogloss',
    random_state     = 42,
    n_jobs           = -1,
)

model_reason.fit(
    X_train, y_train_r,
    eval_set=[(X_test, y_test_r)],
    verbose=False,
)

y_pred_r = model_reason.predict(X_test)
acc_r    = accuracy_score(y_test_r, y_pred_r)

print(f"\n  Accuracy : {acc_r:.4f} ({acc_r*100:.2f}%)")
print("\n  Rapport de classification :")
print(classification_report(y_test_r, y_pred_r, target_names=le.classes_))


# =====================================================================
# ÉTAPE 7 — risk_score = probabilité du modèle (pas random !)
# =====================================================================


print("  RISK SCORE = probabilité calculée par le modèle")


# La probabilité d'être RJCT = le vrai risk_score
risk_scores_test = model_status.predict_proba(X_test)[:, 1]

print("\n  Exemples de risk_score calculés :")
sample = pd.DataFrame({
    'statut_réel'   : ['ACCP' if v==0 else 'RJCT' for v in y_test_s[:10]],
    'statut_prédit' : ['ACCP' if v==0 else 'RJCT' for v in y_pred_s[:10]],
    'risk_score'    : risk_scores_test[:10].round(4),
})
print(sample.to_string(index=False))

print(f"\n  Distribution risk_score :")
print(f"    ACCP → moyenne : {risk_scores_test[y_test_s==0].mean():.4f}")
print(f"    RJCT → moyenne : {risk_scores_test[y_test_s==1].mean():.4f}")


# =====================================================================
# ÉTAPE 8 — SHAP : explainabilité
# =====================================================================


print("  SHAP — Explainabilité des décisions")


try:
    import shap

    explainer = shap.TreeExplainer(model_status)
    shap_values = explainer.shap_values(X_test.head(100))

    # Feature importance globale
    mean_abs_shap = np.abs(shap_values).mean(axis=0)
    feature_importance = pd.DataFrame({
        'feature'    : X.columns,
        'shap_impact': mean_abs_shap
    }).sort_values('shap_impact', ascending=False)

    print("\n  Top 10 features les plus importantes :")
    print(feature_importance.head(10).to_string(index=False))

    # Exemple d'explication pour 1 transaction
    print("\n  Exemple d'explication pour la transaction n°0 :")
    first_shap = shap_values[0]
    explanation = pd.DataFrame({
        'feature': X.columns,
        'valeur' : X_test.iloc[0].values,
        'impact_shap': first_shap
    }).sort_values('impact_shap', key=abs, ascending=False).head(8)
    print(explanation.to_string(index=False))

except ImportError:
    print("  ⚠️  SHAP non installé → pip install shap")
    print("  (le reste du pipeline fonctionne sans SHAP)")


# =====================================================================
# ÉTAPE 9 — Fonction de prédiction (à intégrer dans Spring Boot)
# =====================================================================


print("  SIMULATION D'UNE PRÉDICTION EN PRODUCTION")


def predict_transaction(sender_iban, receiver_iban, sender_bic,
                        receiver_bic, amount, currency, msg_type):
    """
    Prédit le statut d'une transaction SWIFT.
    C'est cette fonction qui s'intègre via API dans Spring Boot.
    """
    row = pd.DataFrame([{
        'sender_iban'  : sender_iban,
        'receiver_iban': receiver_iban,
        'sender_bic'   : sender_bic,
        'receiver_bic' : receiver_bic,
        'amount'       : amount,
        'currency'     : currency,
        'msg_type'     : msg_type,
    }])

    features = extract_features(row)

    status_prob   = model_status.predict_proba(features)[0]
    risk_score    = float(status_prob[1])
    status_pred   = 'RJCT' if risk_score > 0.5 else 'ACCP'

    reason_pred   = None
    if status_pred == 'RJCT':
        reason_encoded = model_reason.predict(features)[0]
        reason_pred    = le.inverse_transform([reason_encoded])[0]
        if reason_pred == 'ACCP':
            reason_pred = None

    return {
        'status'      : status_pred,
        'reject_reason': reason_pred,
        'risk_score'  : round(risk_score, 4),
        'confidence'  : f"{max(status_prob)*100:.1f}%",
    }


# Tests
print("\n  Test 1 — Transaction normale (attendu : ACCP)")
r = predict_transaction('FR7614508596748974032823',
                        'DE89370400440532013000',
                        'BNPAFRPP', 'DEUTDEFF',
                        15000.00, 'EUR', 'pacs.008')
print(f"  → {r}")

print("\n  Test 2 — Montant > 500k (attendu : AM02)")
r = predict_transaction('FR7614508596748974032823',
                        'DE89370400440532013000',
                        'BNPAFRPP', 'DEUTDEFF',
                        750000.00, 'EUR', 'pacs.008')
print(f"  → {r}")

print("\n  Test 3 — BIC embargo Iran (attendu : AG01)")
r = predict_transaction('FR7614508596748974032823',
                        'IR12345678901234567890123456',
                        'BNPAFRPP', 'BMJIIRTH',
                        5000.00, 'EUR', 'pacs.008')
print(f"  → {r}")

print("\n  Test 4 — Devise invalide (attendu : AG02)")
r = predict_transaction('FR7614508596748974032823',
                        'DE89370400440532013000',
                        'BNPAFRPP', 'DEUTDEFF',
                        5000.00, 'XYZ', 'pacs.008')
print(f"  → {r}")

print("\n  Test 5 — msg_type invalide (attendu : FF01)")
r = predict_transaction('FR7614508596748974032823',
                        'DE89370400440532013000',
                        'BNPAFRPP', 'DEUTDEFF',
                        5000.00, 'EUR', 'INVALID')
print(f"  → {r}")


print("\n" + "="*60)
print("  PIPELINE TERMINÉ")
print("="*60)
joblib.dump(model_status, 'model_status.pkl')
joblib.dump(model_reason, 'model_reason.pkl')
joblib.dump(le,           'label_encoder.pkl')
joblib.dump(list(X.columns), 'feature_columns.pkl')
print("Modèles sauvegardés")