"""
========================================================================
  VÉRIFICATEUR DU DATASET — GPI Tracker AI Module
  Lance ce script APRÈS generate_banking_dataset_v3.py
  Commande : python verifier_dataset.py
========================================================================
"""

import pandas as pd
import numpy as np

# ── Charger le dataset ────────────────────────────────────────────────
print("Chargement du dataset...")
df = pd.read_csv('generate_swift_dataset.csv')
print(f"✅ Dataset chargé : {len(df):,} lignes × {len(df.columns)} colonnes\n")


# =====================================================================
# VÉRIFICATION 1 — Infos générales
# =====================================================================
print("="*60)
print("  1. INFOS GÉNÉRALES")
print("="*60)
print(df.info())


# =====================================================================
# VÉRIFICATION 2 — Valeurs manquantes
# =====================================================================
print("\n" + "="*60)
print("  2. VALEURS MANQUANTES")
print("="*60)
missing = df.isnull().sum()
missing_cols = missing[missing > 0]

if len(missing_cols) == 0:
    print("✅ Aucune valeur manquante !")
else:
    print("⚠️  Colonnes avec valeurs manquantes :")
    print(missing_cols)

# Note : reject_reason est NaN pour les ACCP → c'est normal
accp_nan = df[df['status'] == 'ACCP']['reject_reason'].isnull().sum()
print(f"\n   ℹ️  reject_reason = NaN pour {accp_nan} lignes ACCP → NORMAL")


# =====================================================================
# VÉRIFICATION 3 — Distribution des classes
# =====================================================================
print("\n" + "="*60)
print("  3. DISTRIBUTION DES CLASSES")
print("="*60)

print("\n── status ───────────────────────────────────────────────")
for val, count in df['status'].value_counts().items():
    bar = "█" * int(count / 100)
    print(f"  {val:5s} : {count:6,}  ({count/len(df)*100:5.1f}%)  {bar}")

print("\n── reject_reason ────────────────────────────────────────")
reasons = df['reject_reason'].fillna('ACCP').value_counts()
for val, count in reasons.items():
    bar = "█" * int(count / 50)
    print(f"  {val:5s} : {count:6,}  ({count/len(df)*100:5.1f}%)  {bar}")


# =====================================================================
# VÉRIFICATION 4 — Statistiques sur les montants
# =====================================================================
print("\n" + "="*60)
print("  4. STATISTIQUES MONTANTS PAR MOTIF DE REJET")
print("="*60)

df_with_reason = df.copy()
df_with_reason['reject_reason'] = df_with_reason['reject_reason'].fillna('ACCP')

stats = df_with_reason.groupby('reject_reason')['amount'].agg(['min','max','mean']).round(2)
print(stats.to_string())


# =====================================================================
# VÉRIFICATION 5 — Règles métier (les vraies règles SWIFT)
# =====================================================================
print("\n" + "="*60)
print("  5. VALIDATION DES RÈGLES MÉTIER")
print("="*60)

VALID_COUNTRIES_SET  = {'FR','DE','ES','IT','BE','NL','AT','PT','GB','CH',
                         'DZ','MA','TN','EG','TR','US','CA','JP','CN','AU'}
EMBARGO_SET          = {'KP','IR','SY','CU','VE','SD'}
VALID_CURRENCIES_SET = {'EUR','GBP','CHF','DZD','MAD','TND','EGP','TRY',
                         'USD','CAD','JPY','CNY','AUD'}
VALID_MSG_SET        = {'pacs.008','pacs.009'}
INVALID_CURRENCIES   = {'XYZ','ABC','ZZZ','QQQ','111','AAA','FOO','BAR','UVW'}
INVALID_MSG_TYPES    = {'INVALID','TEST001','pacs.999','XXXXX','BADMSG','MT103','SWIFT01','UNKNOWN'}

results = {}

# ── ACCP : tout doit être valide ──────────────────────────────────────
accp = df[df['status'] == 'ACCP']
results['ACCP → sender_iban_valid=1']   = (accp['sender_iban_valid']   == 1).mean()
results['ACCP → receiver_iban_valid=1'] = (accp['receiver_iban_valid'] == 1).mean()
results['ACCP → sender_bic_valid=1']    = (accp['sender_bic_valid']    == 1).mean()
results['ACCP → currency_valid=1']      = (accp['currency_valid']      == 1).mean()
results['ACCP → msg_type_valid=1']      = (accp['msg_type_valid']      == 1).mean()

# ── AC01 : receiver_iban invalide ─────────────────────────────────────
ac01 = df[df['reject_reason'] == 'AC01']
results['AC01 → receiver_iban_valid=0'] = (ac01['receiver_iban_valid'] == 0).mean()

# ── AC04 : receiver_iban longueur 7-11 ───────────────────────────────
ac04 = df[df['reject_reason'] == 'AC04']
results['AC04 → len(receiver_iban) in [7,11]'] = \
    ac04['receiver_iban_len'].between(7, 11).mean()

# ── AC06 : receiver_iban longueur 10-12 ──────────────────────────────
ac06 = df[df['reject_reason'] == 'AC06']
results['AC06 → len(receiver_iban) in [10,12]'] = \
    ac06['receiver_iban_len'].between(10, 12).mean()

# ── AC13 : sender_iban longueur 6-11 ─────────────────────────────────
ac13 = df[df['reject_reason'] == 'AC13']
results['AC13 → len(sender_iban) in [6,11]'] = \
    ac13['sender_iban_len'].between(6, 11).mean()

# ── AG01 : pays embargo ───────────────────────────────────────────────
ag01 = df[df['reject_reason'] == 'AG01']
results['AG01 → receiver_bic_embargo=1']  = (ag01['receiver_bic_embargo']  == 1).mean()
results['AG01 → receiver_iban_embargo=1'] = (ag01['receiver_iban_embargo'] == 1).mean()

# ── AG02 : devise invalide ────────────────────────────────────────────
ag02 = df[df['reject_reason'] == 'AG02']
results['AG02 → currency invalide'] = \
    ag02['currency'].isin(INVALID_CURRENCIES).mean()

# ── AGNT : les deux BIC invalides ────────────────────────────────────
agnt = df[df['reject_reason'] == 'AGNT']
results['AGNT → sender_bic_valid=0']   = (agnt['sender_bic_valid']   == 0).mean()
results['AGNT → receiver_bic_valid=0'] = (agnt['receiver_bic_valid'] == 0).mean()
results['AGNT → both_bic_invalid=1']   = (agnt['both_bic_invalid']   == 1).mean()

# ── AM01 : montant quasi-nul ──────────────────────────────────────────
am01 = df[df['reject_reason'] == 'AM01']
results['AM01 → amount in [0.01, 0.49]'] = am01['amount'].between(0.01, 0.49).mean()

# ── AM02 : montant > 450k ─────────────────────────────────────────────
am02 = df[df['reject_reason'] == 'AM02']
results['AM02 → amount > 450 000'] = (am02['amount'] > 450_000).mean()

# ── AM04 : montant 100k-500k ──────────────────────────────────────────
am04 = df[df['reject_reason'] == 'AM04']
results['AM04 → amount in [100k, 500k]'] = \
    am04['amount'].between(100_001, 499_999).mean()

# ── AM09 : 3 décimales ───────────────────────────────────────────────
am09 = df[df['reject_reason'] == 'AM09']
results['AM09 → amount_decimal_places=3'] = \
    (am09['amount_decimal_places'] == 3).mean()

# ── FF01 : msg_type invalide ──────────────────────────────────────────
ff01 = df[df['reject_reason'] == 'FF01']
results['FF01 → msg_type invalide'] = ff01['msg_type'].isin(INVALID_MSG_TYPES).mean()

# ── Affichage ─────────────────────────────────────────────────────────
print()
all_ok = True
for label, score in results.items():
    icon = '✅' if score == 1.0 else ('⚠️ ' if score >= 0.95 else '❌')
    if score < 1.0:
        all_ok = False
    print(f"  {icon}  {label:<45s}  {score:.0%}")

if all_ok:
    print("\n  ✅ TOUTES LES RÈGLES SONT RESPECTÉES À 100% !")
else:
    print("\n  ⚠️  Certaines règles ne sont pas à 100% — vérifier le générateur.")


# =====================================================================
# VÉRIFICATION 6 — Cohérence inter-champs
# =====================================================================
print("\n" + "="*60)
print("  6. COHÉRENCE INTER-CHAMPS")
print("="*60)

accp_only = df[df['status'] == 'ACCP']

print(f"\n  Transactions ACCP avec IBAN sender longueur correcte  : "
      f"{accp_only['sender_iban_len_ok'].mean():.1%}")
print(f"  Transactions ACCP avec IBAN receiver longueur correcte: "
      f"{accp_only['receiver_iban_len_ok'].mean():.1%}")
print(f"  Transactions ACCP avec devise cohérente avec le pays  : "
      f"{accp_only['currency_country_match'].mean():.1%}")
print(f"  Transactions ACCP sender BIC/IBAN même pays           : "
      f"{accp_only['sender_country_match'].mean():.1%}")
print(f"  Transactions ACCP receiver BIC/IBAN même pays         : "
      f"{accp_only['receiver_country_match'].mean():.1%}")


# =====================================================================
# VÉRIFICATION 7 — Pays les plus fréquents
# =====================================================================
print("\n" + "="*60)
print("  7. TOP 5 PAYS SENDER / RECEIVER")
print("="*60)

print("\n  Top 5 pays sender :")
for pays, n in df['sender_country'].value_counts().head(5).items():
    print(f"    {pays} : {n:,}")

print("\n  Top 5 pays receiver :")
for pays, n in df['receiver_country'].value_counts().head(5).items():
    print(f"    {pays} : {n:,}")

print("\n  Pays embargo dans les AG01 :")
for pays, n in ag01['receiver_bic_country'].value_counts().items():
    print(f"    {pays} : {n} transactions")


# =====================================================================
# VÉRIFICATION 8 — Aperçu de quelques lignes par motif
# =====================================================================
print("\n" + "="*60)
print("  8. EXEMPLES PAR MOTIF DE REJET")
print("="*60)

cols = ['sender_iban','receiver_iban','sender_bic',
        'receiver_bic','amount','currency','msg_type',
        'reject_reason','risk_score']

motifs = ['AC01','AC04','AC06','AC13','AG01','AG02',
          'AGNT','AM01','AM02','AM04','AM09','FF01']

for motif in motifs:
    sample = df[df['reject_reason'] == motif][cols].head(2)
    print(f"\n  ── {motif} ──────────────────────────────")
    print(sample.to_string(index=False))

print("\n" + "="*60)
print("  ✅ VÉRIFICATION TERMINÉE")
print("="*60)