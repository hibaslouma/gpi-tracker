

import pandas as pd
import numpy as np
import random
import string
from datetime import datetime, timedelta

# ── Reproductibilité ─────────────────────────────────────────────────
random.seed(42)
np.random.seed(42)


# =====================================================================
# 1. RÉFÉRENTIELS — DONNÉES RÉALISTES PAR PAYS
# =====================================================================

COUNTRIES_DATA = {
    # ── Zone Euro ─────────────────────────────────────────────────────
    'FR': {
        'currency'   : 'EUR',
        'iban_length': 27,
        'banks'      : ['BNPA', 'CAGR', 'SGSS', 'CRLY', 'BRED', 'AGRI', 'POPU'],
    },
    'DE': {
        'currency'   : 'EUR',
        'iban_length': 22,
        'banks'      : ['DEUT', 'COBA', 'HYVE', 'DRSD', 'MARK', 'SSKM', 'MHYB'],
    },
    'ES': {
        'currency'   : 'EUR',
        'iban_length': 24,
        'banks'      : ['BBVA', 'BSCH', 'CECA', 'SABH', 'POPD', 'BKIA', 'CSYD'],
    },
    'IT': {
        'currency'   : 'EUR',
        'iban_length': 27,
        'banks'      : ['BCIT', 'UBSP', 'CRGR', 'INTB', 'BPMD', 'MCSM', 'BNLI'],
    },
    'BE': {
        'currency'   : 'EUR',
        'iban_length': 16,
        'banks'      : ['GKCC', 'CREB', 'AXAB', 'NICA', 'BPOT', 'DEUT', 'TRIO'],
    },
    'NL': {
        'currency'   : 'EUR',
        'iban_length': 18,
        'banks'      : ['ABNA', 'RABO', 'INGB', 'TRIO', 'SNSB', 'AEGO', 'FVLB'],
    },
    'AT': {
        'currency'   : 'EUR',
        'iban_length': 20,
        'banks'      : ['BAWW', 'RLNW', 'GIBA', 'VKBL', 'BFKK', 'RZOO', 'SBOE'],
    },
    'PT': {
        'currency'   : 'EUR',
        'iban_length': 25,
        'banks'      : ['CGDI', 'BBPI', 'BCOM', 'TOTA', 'BPIM', 'MONS', 'CXGP'],
    },
    # ── Europe hors Euro ──────────────────────────────────────────────
    'GB': {
        'currency'   : 'GBP',
        'iban_length': 22,
        'banks'      : ['HSBC', 'BARC', 'RBOS', 'LOYD', 'NWBK', 'MIDL', 'CITI'],
    },
    'CH': {
        'currency'   : 'CHF',
        'iban_length': 21,
        'banks'      : ['UBSW', 'CRES', 'ZKBK', 'RAIF', 'POFG', 'BCGE', 'BCVL'],
    },
    # ── Afrique du Nord ───────────────────────────────────────────────
    'DZ': {
        'currency'   : 'DZD',
        'iban_length': 24,
        'banks'      : ['BADR', 'CNEP', 'BEAW', 'BNAA', 'CPAA', 'BIAM', 'SAGA'],
    },
    'MA': {
        'currency'   : 'MAD',
        'iban_length': 24,
        'banks'      : ['BCMA', 'BMCE', 'ATTJ', 'BPMA', 'SGMR', 'CIHM', 'ABHM'],
    },
    'TN': {
        'currency'   : 'TND',
        'iban_length': 24,
        'banks'      : ['BIAT', 'STBA', 'UIBT', 'BNAA', 'AMEN', 'AMBT', 'ZITN'],
    },
    'EG': {
        'currency'   : 'EGP',
        'iban_length': 27,
        'banks'      : ['NBEG', 'CIEB', 'AAIB', 'BCAI', 'MASH', 'HBZA', 'ALAH'],
    },
    # ── Autres ────────────────────────────────────────────────────────
    'TR': {
        'currency'   : 'TRY',
        'iban_length': 26,
        'banks'      : ['TCBA', 'ISBK', 'GARA', 'AKBK', 'YFBK', 'ZBBA', 'FING'],
    },
    'US': {
        'currency'   : 'USD',
        'iban_length': 20,
        'banks'      : ['CHAS', 'CITI', 'BOFA', 'WELL', 'GSCM', 'MRSL', 'TDSB'],
    },
    'CA': {
        'currency'   : 'CAD',
        'iban_length': 20,
        'banks'      : ['ROYL', 'NRSC', 'BOFM', 'CIBK', 'SCOT', 'BMON', 'HKBA'],
    },
    'JP': {
        'currency'   : 'JPY',
        'iban_length': 20,
        'banks'      : ['BOTK', 'MHCB', 'SMBC', 'YUIG', 'RISA', 'BKCH', 'TOKY'],
    },
    'CN': {
        'currency'   : 'CNY',
        'iban_length': 20,
        'banks'      : ['BKCH', 'ICBK', 'ABOC', 'CCBC', 'BOSC', 'CMBC', 'SZHB'],
    },
    'AU': {
        'currency'   : 'AUD',
        'iban_length': 20,
        'banks'      : ['NATA', 'WPAC', 'CTBA', 'ANZB', 'MEBA', 'SGBC', 'QBAN'],
    },
}

# Pays sous embargo SWIFT (AG01) — avec leurs propres données bancaires
EMBARGO_DATA = {
    'KP': {'iban_length': 20, 'banks': ['CBKP', 'NKBK']},
    'IR': {'iban_length': 26, 'banks': ['BMJI', 'MLIR', 'BMIR']},
    'SY': {'iban_length': 22, 'banks': ['CBSY', 'BISY', 'COSS']},
    'CU': {'iban_length': 20, 'banks': ['BCUB', 'BAND', 'FION']},
    'VE': {'iban_length': 20, 'banks': ['BCVE', 'BVIE', 'BDVL']},
    'SD': {'iban_length': 20, 'banks': ['CBSD', 'OKBT', 'FAIS']},
}

VALID_COUNTRIES    = list(COUNTRIES_DATA.keys())
EUROZONE           = [c for c, d in COUNTRIES_DATA.items() if d['currency'] == 'EUR']
EMBARGO_COUNTRIES  = list(EMBARGO_DATA.keys())
VALID_CURRENCIES   = list(set(d['currency'] for d in COUNTRIES_DATA.values()))

# Codes pays inexistants (AC01)
FAKE_COUNTRIES     = ['XX', 'ZZ', 'QQ', '00', 'XA', 'XB', 'ZX', 'YY']

# Devises invalides (AG02)
INVALID_CURRENCIES = ['XYZ', 'ABC', 'ZZZ', 'QQQ', '111', 'AAA', 'FOO', 'BAR', 'UVW']

# Types de messages
VALID_MSG_TYPES    = ['pacs.008', 'pacs.009']
INVALID_MSG_TYPES  = ['INVALID', 'TEST001', 'pacs.999', 'XXXXX', 'BADMSG', 'MT103', 'SWIFT01', 'UNKNOWN']
# ↑ '' remplacé par 'EMPTY' : une chaîne vide devient NaN dans CSV → bug pandas

# Codes de localisation BIC (2 caractères)
LOC_CODES = ['PP','FF','XX','HH','BB','GG','MM','ZZ','AA','CC',
             '3A','B3','2X','K1','P1','X2','M9','T7','R3','N5']


# =====================================================================
# 2. FONCTIONS DE GÉNÉRATION ATOMIQUE
# =====================================================================

# ── BIC ──────────────────────────────────────────────────────────────

def gen_valid_bic(country: str) -> str:
    """
    BIC valide avec banque réaliste par pays.
    Structure : BANK(4) + PAYS(2) + LOC(2) [+ BRN(3) dans 25 % des cas]
    """
    data = COUNTRIES_DATA.get(country) or EMBARGO_DATA.get(country)
    bank = random.choice(data['banks']) if data else \
           ''.join(random.choices(string.ascii_uppercase, k=4))
    # Assurer exactement 4 lettres pour le code banque
    bank = (bank + 'X' * 4)[:4]
    loc  = random.choice(LOC_CODES)
    bic  = f"{bank}{country}{loc}"          # 8 chars
    if random.random() < 0.25:
        bic += random.choice(['XXX', '001', 'EUR', 'BRC'])  # 11 chars
    return bic

def gen_bic_embargo(embargo_country: str) -> str:
    """BIC avec pays sous embargo (structure valide sinon)."""
    data = EMBARGO_DATA.get(embargo_country, {})
    bank = random.choice(data.get('banks', ['EMBB']))
    bank = (bank + 'X' * 4)[:4]
    loc  = random.choice(LOC_CODES)
    bic  = f"{bank}{embargo_country}{loc}"
    if random.random() < 0.25:
        bic += "XXX"
    return bic

def gen_invalid_bic() -> str:
    """BIC structurellement invalide (pour AGNT — les DEUX invalides)."""
    strategy = random.choice(['wrong_len_7', 'wrong_len_9', 'all_digits',
                               'fake_country', 'lowercase', 'too_long'])
    if strategy == 'wrong_len_7':
        return ''.join(random.choices(string.ascii_uppercase, k=4)) + 'FR' + 'X'
    elif strategy == 'wrong_len_9':
        return ''.join(random.choices(string.ascii_uppercase, k=4)) + 'FR' + \
               ''.join(random.choices(string.ascii_uppercase + string.digits, k=3))
    elif strategy == 'all_digits':
        return ''.join(random.choices(string.digits, k=8))
    elif strategy == 'fake_country':
        return ''.join(random.choices(string.ascii_uppercase, k=4)) + 'ZZ' + \
               ''.join(random.choices(string.ascii_uppercase + string.digits, k=2))
    elif strategy == 'lowercase':
        return ''.join(random.choices(string.ascii_lowercase, k=8))
    else:
        return ''.join(random.choices(string.ascii_uppercase + string.digits, k=13))


# ── IBAN ─────────────────────────────────────────────────────────────

def gen_valid_iban(country: str) -> str:
    """
    IBAN valide avec longueur RÉALISTE par pays.
    Utilise la norme internationale (ex: FR=27, DE=22, GB=22, TN=24).
    """
    data = COUNTRIES_DATA.get(country) or EMBARGO_DATA.get(country)
    total_len = data['iban_length'] if data else 22
    check = f"{random.randint(10, 99)}"
    body_len = total_len - 4  # pays(2) + clé(2) = 4
    body = ''.join(random.choices(string.digits, k=body_len))
    return f"{country}{check}{body}"

def gen_iban_bad_country() -> str:
    """AC01 — préfixe pays inconnu (XX, ZZ, QQ...)."""
    fake  = random.choice(FAKE_COUNTRIES)
    check = f"{random.randint(10, 99)}"
    body  = ''.join(random.choices(string.digits, k=random.randint(18, 22)))
    return f"{fake}{check}{body}"

def gen_iban_too_long(country: str) -> str:
    """AC01 — IBAN > 34 caractères."""
    check = f"{random.randint(10, 99)}"
    body  = ''.join(random.choices(string.digits, k=33))  # 2+2+33 = 37
    return f"{country}{check}{body}"

def gen_iban_short(country: str, length_range: tuple) -> str:
    """AC04 / AC06 / AC13 — IBAN trop court (longueur forcée)."""
    target   = random.randint(*length_range)
    body_len = max(1, target - 4)
    base     = f"{country}{random.randint(10, 99)}" + \
               ''.join(random.choices(string.digits, k=body_len))
    return base[:target]


# ── Devise ───────────────────────────────────────────────────────────

def get_currency(sender_country: str, receiver_country: str) -> str:
    """
    Devise cohérente avec les pays impliqués.
    — Zone euro ↔ zone euro → EUR (toujours)
    — Même pays → devise locale
    — International → devise sender (70 %) ou EUR (30 %)
    """
    if sender_country == receiver_country:
        return COUNTRIES_DATA[sender_country]['currency']
    if sender_country in EUROZONE and receiver_country in EUROZONE:
        return 'EUR'
    base = COUNTRIES_DATA.get(sender_country, {}).get('currency', 'EUR')
    return base if random.random() < 0.70 else 'EUR'


# ── Montant ──────────────────────────────────────────────────────────

def gen_amount_normal() -> float:
    """Montant ACCP normal : 500 – 99 999."""
    return round(random.uniform(500, 99_999), 2)

def gen_amount_large_legit() -> float:
    """5 % des ACCP : gros montant légitime 100k–450k (pas rejeté)."""
    return round(random.uniform(100_000, 450_000), 2)

def gen_amount_3dec() -> float:
    """AM09 : montant avec EXACTEMENT 3 décimales, 3e ≠ 0."""
    integer = random.randint(1_000, 99_999)
    d1 = random.randint(0, 9)
    d2 = random.randint(0, 9)
    d3 = random.randint(1, 9)   # garantit 3e décimale non nulle
    return float(f"{integer}.{d1}{d2}{d3}")


# ── Cohérence transaction ─────────────────────────────────────────────

def gen_consistent_base(sender_country: str = None,
                        receiver_country: str = None) -> dict:
    """
    Génère le socle cohérent d'une transaction :
    pays → IBAN longueur réaliste → BIC banque réaliste → devise logique.
    80 % des transactions sont cross-border.
    """
    sc = sender_country   or random.choice(VALID_COUNTRIES)
    rc = receiver_country or (
        random.choice([c for c in VALID_COUNTRIES if c != sc])
        if random.random() < 0.80 else sc
    )
    return {
        'sender_country'  : sc,
        'receiver_country': rc,
        'sender_iban'     : gen_valid_iban(sc),
        'sender_bic'      : gen_valid_bic(sc),
        'receiver_iban'   : gen_valid_iban(rc),
        'receiver_bic'    : gen_valid_bic(rc),
        'currency'        : get_currency(sc, rc),
    }


# ── Timestamp ─────────────────────────────────────────────────────────

START_DATE = datetime(2024, 1, 1, 8, 0, 0)

def gen_ts(idx: int) -> str:
    delta = timedelta(minutes=idx * random.randint(3, 15))
    return (START_DATE + delta).strftime('%Y-%m-%d %H:%M:%S')


# =====================================================================
# 3. GÉNÉRATEURS PAR CAS
# =====================================================================

def _row(b: dict, amount, currency, msg_type,
         status, reason, r_low, r_high,
         sender_iban=None, receiver_iban=None,
         sender_bic=None, receiver_bic=None) -> dict:
    """Construit le dict brut de la transaction."""
    return {
        # ── SWIFT bruts ──────────────────────────
        'sender_iban'       : sender_iban   or b['sender_iban'],
        'receiver_iban'     : receiver_iban or b['receiver_iban'],
        'sender_bic'        : sender_bic    or b['sender_bic'],
        'receiver_bic'      : receiver_bic  or b['receiver_bic'],
        'amount'            : amount,
        'currency'          : currency,
        'msg_type'          : msg_type,
        # ── Méta (pour feature engineering) ─────
        'sender_country'    : b['sender_country'],
        'receiver_country'  : b['receiver_country'],
        # ── Targets ─────────────────────────────
        'status'            : status,
        'reject_reason'     : reason,
        'risk_score'        : round(random.uniform(r_low, r_high), 4),
    }


def gen_ACCP() -> dict:
    b   = gen_consistent_base()
    amt = gen_amount_large_legit() if random.random() < 0.05 else gen_amount_normal()
    return _row(b, amt, b['currency'], random.choice(VALID_MSG_TYPES),
                'ACCP', None, 0.01, 0.25)


# ── COMPTE ────────────────────────────────────────────────────────────

def gen_AC01() -> dict:
    """Receiver IBAN invalide : pays inconnu OU trop long."""
    b   = gen_consistent_base()
    bad = gen_iban_bad_country() if random.random() < 0.55 \
          else gen_iban_too_long(b['receiver_country'])
    return _row(b, gen_amount_normal(), b['currency'], random.choice(VALID_MSG_TYPES),
                'RJCT', 'AC01', 0.55, 0.88, receiver_iban=bad)

def gen_AC04() -> dict:
    """Compte clôturé : receiver_iban longueur 7–11."""
    b = gen_consistent_base()
    return _row(b, gen_amount_normal(), b['currency'], random.choice(VALID_MSG_TYPES),
                'RJCT', 'AC04', 0.60, 0.91,
                receiver_iban=gen_iban_short(b['receiver_country'], (7, 11)))

def gen_AC06() -> dict:
    """Compte bloqué : receiver_iban longueur 10–12."""
    b = gen_consistent_base()
    return _row(b, gen_amount_normal(), b['currency'], random.choice(VALID_MSG_TYPES),
                'RJCT', 'AC06', 0.62, 0.93,
                receiver_iban=gen_iban_short(b['receiver_country'], (10, 12)))

def gen_AC13() -> dict:
    """Débiteur invalide : sender_iban longueur 6–11."""
    b = gen_consistent_base()
    return _row(b, gen_amount_normal(), b['currency'], random.choice(VALID_MSG_TYPES),
                'RJCT', 'AC13', 0.60, 0.91,
                sender_iban=gen_iban_short(b['sender_country'], (6, 11)))


# ── BANQUE ────────────────────────────────────────────────────────────

def gen_AG01() -> dict:
    """
    Pays embargo : IBAN + BIC du receiver issus du pays sous embargo.
    → Cohérence maximale (pays embargo cohérent dans les deux champs).
    """
    b    = gen_consistent_base()
    emb  = random.choice(EMBARGO_COUNTRIES)
    r_iban = gen_valid_iban(emb)    # IBAN avec pays embargo
    r_bic  = gen_bic_embargo(emb)   # BIC  avec pays embargo
    b['receiver_country'] = emb
    return _row(b, gen_amount_normal(), b['currency'], random.choice(VALID_MSG_TYPES),
                'RJCT', 'AG01', 0.80, 0.99,
                receiver_iban=r_iban, receiver_bic=r_bic)

def gen_AG02() -> dict:
    """Devise invalide (non ISO 4217)."""
    b = gen_consistent_base()
    return _row(b, gen_amount_normal(), random.choice(INVALID_CURRENCIES),
                random.choice(VALID_MSG_TYPES),
                'RJCT', 'AG02', 0.65, 0.93)

def gen_AGNT() -> dict:
    """Les DEUX BIC structurellement invalides simultanément."""
    b = gen_consistent_base()
    return _row(b, gen_amount_normal(), b['currency'], random.choice(VALID_MSG_TYPES),
                'RJCT', 'AGNT', 0.72, 0.96,
                sender_bic=gen_invalid_bic(), receiver_bic=gen_invalid_bic())


# ── PAIEMENT ─────────────────────────────────────────────────────────

def gen_AM01() -> dict:
    """Montant quasi-nul : 0.01–0.49."""
    b = gen_consistent_base()
    return _row(b, round(random.uniform(0.01, 0.49), 2), b['currency'],
                random.choice(VALID_MSG_TYPES), 'RJCT', 'AM01', 0.55, 0.83)

def gen_AM02() -> dict:
    """Montant > 500 000 (dépasse plafond réglementaire) + zone grise 15 %."""
    b   = gen_consistent_base()
    amt = round(random.uniform(450_001, 500_000), 2) if random.random() < 0.15 \
          else round(random.uniform(500_001, 5_000_000), 2)
    return _row(b, amt, b['currency'], random.choice(VALID_MSG_TYPES),
                'RJCT', 'AM02', 0.74, 0.98)

def gen_AM04() -> dict:
    """Provision insuffisante : 100 001–449 999 + zone grise 12 %."""
    b   = gen_consistent_base()
    amt = round(random.uniform(450_000, 499_999), 2) if random.random() < 0.12 \
          else round(random.uniform(100_001, 449_999), 2)
    return _row(b, amt, b['currency'], random.choice(VALID_MSG_TYPES),
                'RJCT', 'AM04', 0.58, 0.87)

def gen_AM09() -> dict:
    """Format montant invalide : exactement 3 décimales."""
    b = gen_consistent_base()
    return _row(b, gen_amount_3dec(), b['currency'], random.choice(VALID_MSG_TYPES),
                'RJCT', 'AM09', 0.60, 0.89)

def gen_FF01() -> dict:
    """msg_type non reconnu par SWIFT."""
    b = gen_consistent_base()
    return _row(b, gen_amount_normal(), b['currency'],
                random.choice(INVALID_MSG_TYPES),
                'RJCT', 'FF01', 0.55, 0.84)


# =====================================================================
# 4. PLAN DE DISTRIBUTION (12 000 lignes)
# =====================================================================

TOTAL = 12_000

DISTRIBUTION = {
    'ACCP': (gen_ACCP, 0.550),   # 6 600
    'AC01': (gen_AC01, 0.050),   #   600
    'AC04': (gen_AC04, 0.040),   #   480
    'AC06': (gen_AC06, 0.040),   #   480
    'AC13': (gen_AC13, 0.038),   #   456
    'AG01': (gen_AG01, 0.050),   #   600
    'AG02': (gen_AG02, 0.040),   #   480
    'AGNT': (gen_AGNT, 0.028),   #   336
    'AM01': (gen_AM01, 0.028),   #   336
    'AM02': (gen_AM02, 0.040),   #   480
    'AM04': (gen_AM04, 0.038),   #   456
    'AM09': (gen_AM09, 0.030),   #   360
    'FF01': (gen_FF01, 0.028),   #   336
}

assert abs(sum(v[1] for v in DISTRIBUTION.values()) - 1.0) < 0.01, \
    "Les pourcentages ne somment pas à 1.0 !"


# =====================================================================
# 5. GÉNÉRATION
# =====================================================================

print("="*65)
print("  GÉNÉRATEUR DATASET SWIFT pacs.008 — Version 3.0 FUSION")
print("="*65)

rows = []
for case, (fn, pct) in DISTRIBUTION.items():
    n = int(TOTAL * pct)
    for _ in range(n):
        rows.append(fn())
    print(f"  ✓ {case:5s} : {n:5d} lignes générées")

while len(rows) < TOTAL:
    rows.append(gen_ACCP())

random.shuffle(rows)
print(f"\n  Total : {len(rows):,} lignes — mélange appliqué.")


# =====================================================================
# 6. DATAFRAME
# =====================================================================

df = pd.DataFrame(rows)

# ── IDs & timestamps ─────────────────────────────────────────────────
df.insert(0, 'transaction_id',
          [f"TXN{str(i+1).zfill(6)}" for i in range(len(df))])
df['created_at'] = [gen_ts(i) for i in range(len(df))]
df['e2e_ref']    = [f"E2E-{''.join(random.choices(string.ascii_uppercase+string.digits, k=10))}"
                    for _ in range(len(df))]


# =====================================================================
# 7. FEATURE ENGINEERING
# =====================================================================

print("\n[INFO] Calcul des features dérivées ML...")

VALID_COUNTRIES_SET  = set(VALID_COUNTRIES)
EMBARGO_SET          = set(EMBARGO_COUNTRIES)
VALID_CURRENCIES_SET = set(VALID_CURRENCIES)
VALID_MSG_SET        = set(VALID_MSG_TYPES)

# ── Longueurs ─────────────────────────────────────────────────────────
df['sender_iban_len']   = df['sender_iban'].str.len()
df['receiver_iban_len'] = df['receiver_iban'].str.len()
df['sender_bic_len']    = df['sender_bic'].str.len()
df['receiver_bic_len']  = df['receiver_bic'].str.len()

# ── Pays extraits ─────────────────────────────────────────────────────
df['sender_iban_country']   = df['sender_iban'].str[:2]
df['receiver_iban_country'] = df['receiver_iban'].str[:2]
df['sender_bic_country']    = df['sender_bic'].str[4:6]
df['receiver_bic_country']  = df['receiver_bic'].str[4:6]

# ── Validité IBAN ─────────────────────────────────────────────────────
def iban_valid(v: str) -> int:
    if not isinstance(v, str): return 0
    return int(15 <= len(v) <= 34 and
               v[:2] in VALID_COUNTRIES_SET and
               v[2:4].isdigit())

df['sender_iban_valid']   = df['sender_iban'].apply(iban_valid)
df['receiver_iban_valid'] = df['receiver_iban'].apply(iban_valid)

# ── Validité BIC ──────────────────────────────────────────────────────
def bic_valid(v: str) -> int:
    if not isinstance(v, str): return 0
    return int(len(v) in (8, 11) and
               v[:4].isalpha() and
               v[:4].isupper() and
               v[4:6] in VALID_COUNTRIES_SET)

df['sender_bic_valid']   = df['sender_bic'].apply(bic_valid)
df['receiver_bic_valid'] = df['receiver_bic'].apply(bic_valid)

# ── BIC pays embargo ──────────────────────────────────────────────────
df['receiver_bic_embargo'] = df['receiver_bic_country'].apply(
    lambda c: int(c in EMBARGO_SET))

# ── IBAN pays embargo ─────────────────────────────────────────────────
df['receiver_iban_embargo'] = df['receiver_iban_country'].apply(
    lambda c: int(c in EMBARGO_SET))

# ── Les deux BIC invalides ────────────────────────────────────────────
df['both_bic_invalid'] = (
    (df['sender_bic_valid'] == 0) & (df['receiver_bic_valid'] == 0)).astype(int)

# ── Devise / msg ──────────────────────────────────────────────────────
df['currency_valid'] = df['currency'].apply(
    lambda c: int(c in VALID_CURRENCIES_SET))
df['msg_type_valid'] = df['msg_type'].apply(
    lambda m: int(m in VALID_MSG_SET))

# ── Décimales du montant ──────────────────────────────────────────────
def count_dec(val) -> int:
    s = str(val)
    return len(s.split('.')[1].rstrip('0')) if '.' in s else 0

df['amount_decimal_places'] = df['amount'].apply(count_dec)

# ── Catégorie montant ─────────────────────────────────────────────────
def amount_cat(row) -> str:
    a, d = row['amount'], row['amount_decimal_places']
    if d == 3:        return 'FORMAT_3DEC'
    if a < 0.50:      return 'QUASI_NUL'
    if a < 100_001:   return 'NORMAL'
    if a < 450_000:   return 'ELEVE'
    if a < 500_001:   return 'ZONE_GRISE'
    return 'DEPASSE_PLAFOND'

df['amount_category'] = df.apply(amount_cat, axis=1)

# ── Cohérences inter-champs ───────────────────────────────────────────
df['sender_country_match']   = (df['sender_iban_country']   == df['sender_bic_country']).astype(int)
df['receiver_country_match'] = (df['receiver_iban_country'] == df['receiver_bic_country']).astype(int)

# ── Cohérence devise / pays sender ───────────────────────────────────
def currency_ok(row) -> int:
    expected = COUNTRIES_DATA.get(row['sender_country'], {}).get('currency')
    if not expected: return 0
    return int(row['currency'] == expected or
               (row['currency'] == 'EUR' and row['sender_country'] in EUROZONE))

df['currency_country_match'] = df.apply(currency_ok, axis=1)

# ── Longueur IBAN attendue par pays ──────────────────────────────────
def expected_iban_len(country: str) -> int:
    d = COUNTRIES_DATA.get(country) or EMBARGO_DATA.get(country)
    return d['iban_length'] if d else 0

df['sender_iban_expected_len']   = df['sender_country'].apply(expected_iban_len)
df['receiver_iban_expected_len'] = df['receiver_country'].apply(expected_iban_len)

# ── Longueur IBAN correcte selon pays ────────────────────────────────
df['sender_iban_len_ok'] = (
    df['sender_iban_len'] == df['sender_iban_expected_len']).astype(int)
df['receiver_iban_len_ok'] = (
    df['receiver_iban_len'] == df['receiver_iban_expected_len']).astype(int)


# =====================================================================
# 8. ORDONNANCEMENT FINAL
# =====================================================================

COLUMNS = [
    # Identifiant
    'transaction_id', 'created_at', 'e2e_ref',
    # SWIFT bruts
    'sender_iban', 'receiver_iban',
    'sender_bic',  'receiver_bic',
    'amount', 'currency', 'msg_type',
    # Méta pays
    'sender_country', 'receiver_country',
    # Features IBAN
    'sender_iban_len',   'sender_iban_valid',   'sender_iban_country',
    'sender_iban_expected_len', 'sender_iban_len_ok',
    'receiver_iban_len', 'receiver_iban_valid', 'receiver_iban_country',
    'receiver_iban_expected_len', 'receiver_iban_len_ok',
    # Features BIC
    'sender_bic_len',   'sender_bic_valid',   'sender_bic_country',
    'receiver_bic_len', 'receiver_bic_valid', 'receiver_bic_country',
    'receiver_bic_embargo', 'receiver_iban_embargo', 'both_bic_invalid',
    # Features montant
    'amount_decimal_places', 'amount_category',
    # Features devise / msg
    'currency_valid', 'msg_type_valid',
    # Cohérences
    'sender_country_match', 'receiver_country_match', 'currency_country_match',
    # Targets
    'status', 'reject_reason', 'risk_score',
]

df = df[COLUMNS]


# =====================================================================
# 9. VALIDATION CROISÉE
# =====================================================================

print("\n" + "="*65)
print("  VALIDATION CROISÉE")
print("="*65)

checks = {
    'ACCP → sender_iban_valid=1'   : (df[df['status']=='ACCP']['sender_iban_valid']   == 1).mean(),
    'ACCP → receiver_iban_valid=1' : (df[df['status']=='ACCP']['receiver_iban_valid'] == 1).mean(),
    'ACCP → sender_bic_valid=1'    : (df[df['status']=='ACCP']['sender_bic_valid']    == 1).mean(),
    'ACCP → currency_valid=1'      : (df[df['status']=='ACCP']['currency_valid']       == 1).mean(),
    'ACCP → msg_type_valid=1'      : (df[df['status']=='ACCP']['msg_type_valid']       == 1).mean(),
    'AC01 → receiver_iban_valid=0' : (df[df['reject_reason']=='AC01']['receiver_iban_valid'] == 0).mean(),
    'AC04 → iban_len in [7,11]'    : df[df['reject_reason']=='AC04']['receiver_iban_len'].between(7,11).mean(),
    'AC06 → iban_len in [10,12]'   : df[df['reject_reason']=='AC06']['receiver_iban_len'].between(10,12).mean(),
    'AC13 → sender_iban_len [6,11]': df[df['reject_reason']=='AC13']['sender_iban_len'].between(6,11).mean(),
    'AG01 → receiver_bic_embargo=1': (df[df['reject_reason']=='AG01']['receiver_bic_embargo'] == 1).mean(),
    'AG01 → receiver_iban_embargo=1':(df[df['reject_reason']=='AG01']['receiver_iban_embargo']== 1).mean(),
    'AG02 → currency_valid=0'      : (df[df['reject_reason']=='AG02']['currency_valid'] == 0).mean(),
    'AGNT → both_bic_invalid=1'    : (df[df['reject_reason']=='AGNT']['both_bic_invalid'] == 1).mean(),
    'AM01 → amount in [0.01,0.49]' : df[df['reject_reason']=='AM01']['amount'].between(0.01,0.49).mean(),
    'AM02 → amount > 450k'         : (df[df['reject_reason']=='AM02']['amount'] > 450_000).mean(),
    'AM04 → amount in [100k,500k]' : df[df['reject_reason']=='AM04']['amount'].between(100_001,499_999).mean(),
    'AM09 → decimal_places=3'      : (df[df['reject_reason']=='AM09']['amount_decimal_places'] == 3).mean(),
    'FF01 → msg_type_valid=0'      : (df[df['reject_reason']=='FF01']['msg_type_valid'] == 0).mean(),
}

all_ok = True
for label, score in checks.items():
    icon = '✅' if score == 1.0 else ('⚠️' if score >= 0.95 else '❌')
    if score < 1.0: all_ok = False
    print(f"  {icon} {label:<42s} {score:.0%}")

print(f"\n  {'✅ TOUTES LES RÈGLES VALIDÉES À 100%' if all_ok else '⚠️ Certaines règles non satisfaites'}")


# =====================================================================
# 10. RAPPORT & EXPORT
# =====================================================================

print("\n" + "="*65)
print("  RAPPORT FINAL")
print("="*65)
print(f"  Lignes      : {len(df):,}")
print(f"  Colonnes    : {len(df.columns)}")
print(f"  Cibles      : status | reject_reason | risk_score")

print("\n  Distribution status :")
for v, n in df['status'].value_counts().items():
    print(f"    {v}: {n:5,}  ({n/len(df)*100:.1f}%)")

print("\n  Distribution reject_reason :")
for v, n in df['reject_reason'].fillna('ACCP').value_counts().items():
    print(f"    {v:5s}: {n:5,}  ({n/len(df)*100:.1f}%)")

print("\n  IBAN réalistes (longueur correcte selon pays) :")
print(f"    Sender   : {df['sender_iban_len_ok'].mean():.1%}")
print(f"    Receiver : {df[df['status']=='ACCP']['receiver_iban_len_ok'].mean():.1%}  (ACCP uniquement)")

# Export
output = 'generate_swift_dataset.csv'
df.to_csv(output, index=False, float_format='%.10g')
print(f"\n  [OK] Sauvegardé → {output}")
print("\n[DONE] Génération v3.0 terminée avec succès.")