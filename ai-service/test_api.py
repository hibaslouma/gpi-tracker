"""
Test de l'API Flask - GPI Tracker ML Module
"""

import requests
import json

# Configuration
API_URL = "http://127.0.0.1:5000/predict"

print("="*70)
print("  TESTS API GPI TRACKER ML MODULE")
print("="*70)

# ═══════════════════════════════════════════════════════════════════════
# TEST 1 : Transaction ACCEPTÉE
# ═══════════════════════════════════════════════════════════════════════

print("\n🔵 TEST 1 : Transaction normale")
print("-"*70)

test1 = {
    "sender_iban": "FR7614508596748974032823",
    "receiver_iban": "DE89370400440532013000",
    "sender_bic": "BNPAFRPP",
    "receiver_bic": "DEUTDEFF",
    "amount": 15000.00,
    "currency": "EUR",
    "msg_type": "pacs.008"
}

print("Envoi de la requête...")
response1 = requests.post(API_URL, json=test1)

print(f"✅ Status Code: {response1.status_code}")
print(f"📊 Réponse:")
print(json.dumps(response1.json(), indent=2, ensure_ascii=False))

if response1.json().get('status') == 'ACCP':
    print("✅ TEST 1 RÉUSSI : Transaction acceptée comme prévu")
else:
    print("❌ TEST 1 ÉCHOUÉ")


# ═══════════════════════════════════════════════════════════════════════
# TEST 2 : REJET - Montant trop élevé (AM02)
# ═══════════════════════════════════════════════════════════════════════

print("\n🔴 TEST 2 : Montant > 500k (attendu : AM02)")
print("-"*70)

test2 = {
    "sender_iban": "FR7614508596748974032823",
    "receiver_iban": "DE89370400440532013000",
    "sender_bic": "BNPAFRPP",
    "receiver_bic": "DEUTDEFF",
    "amount": 750000.00,
    "currency": "EUR",
    "msg_type": "pacs.008"
}

response2 = requests.post(API_URL, json=test2)
print(f"✅ Status Code: {response2.status_code}")
print(f"📊 Réponse:")
print(json.dumps(response2.json(), indent=2, ensure_ascii=False))

if response2.json().get('reject_reason') == 'AM02':
    print("✅ TEST 2 RÉUSSI : Rejet AM02 détecté")
else:
    print("❌ TEST 2 ÉCHOUÉ")


# ═══════════════════════════════════════════════════════════════════════
# TEST 3 : REJET - Embargo Iran (AG01)
# ═══════════════════════════════════════════════════════════════════════

print("\n🔴 TEST 3 : BIC Iran sous embargo (attendu : AG01)")
print("-"*70)

test3 = {
    "sender_iban": "FR7614508596748974032823",
    "receiver_iban": "IR12345678901234567890123456",
    "sender_bic": "BNPAFRPP",
    "receiver_bic": "BMJIIRTH",
    "amount": 5000.00,
    "currency": "EUR",
    "msg_type": "pacs.008"
}

response3 = requests.post(API_URL, json=test3)
print(f"✅ Status Code: {response3.status_code}")
print(f"📊 Réponse:")
print(json.dumps(response3.json(), indent=2, ensure_ascii=False))

if response3.json().get('reject_reason') == 'AG01':
    print("✅ TEST 3 RÉUSSI : Embargo AG01 détecté")
else:
    print("❌ TEST 3 ÉCHOUÉ")


# ═══════════════════════════════════════════════════════════════════════
# TEST 4 : REJET - Devise invalide (AG02)
# ═══════════════════════════════════════════════════════════════════════

print("\n🔴 TEST 4 : Devise invalide (attendu : AG02)")
print("-"*70)

test4 = {
    "sender_iban": "FR7614508596748974032823",
    "receiver_iban": "DE89370400440532013000",
    "sender_bic": "BNPAFRPP",
    "receiver_bic": "DEUTDEFF",
    "amount": 5000.00,
    "currency": "XYZ",
    "msg_type": "pacs.008"
}

response4 = requests.post(API_URL, json=test4)
print(f"✅ Status Code: {response4.status_code}")
print(f"📊 Réponse:")
print(json.dumps(response4.json(), indent=2, ensure_ascii=False))

if response4.json().get('reject_reason') == 'AG02':
    print("✅ TEST 4 RÉUSSI : Devise invalide AG02 détectée")
else:
    print("❌ TEST 4 ÉCHOUÉ")


# ═══════════════════════════════════════════════════════════════════════
# TEST 5 : REJET - Message invalide (FF01)
# ═══════════════════════════════════════════════════════════════════════

print("\n🔴 TEST 5 : Message type invalide (attendu : FF01)")
print("-"*70)

test5 = {
    "sender_iban": "FR7614508596748974032823",
    "receiver_iban": "DE89370400440532013000",
    "sender_bic": "BNPAFRPP",
    "receiver_bic": "DEUTDEFF",
    "amount": 5000.00,
    "currency": "EUR",
    "msg_type": "INVALID"
}

response5 = requests.post(API_URL, json=test5)
print(f"✅ Status Code: {response5.status_code}")
print(f"📊 Réponse:")
print(json.dumps(response5.json(), indent=2, ensure_ascii=False))

if response5.json().get('reject_reason') == 'FF01':
    print("✅ TEST 5 RÉUSSI : Message invalide FF01 détecté")
else:
    print("❌ TEST 5 ÉCHOUÉ")


# ═══════════════════════════════════════════════════════════════════════
# RÉSUMÉ
# ═══════════════════════════════════════════════════════════════════════

print("\n" + "="*70)
print("  ✅ TESTS TERMINÉS")
print("="*70)