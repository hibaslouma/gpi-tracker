export type StatutISO = 'PDNG' | 'ACCP' | 'ACSP' | 'ACSC' | 'RJCT' | 'CANC';
export type MotifRejet = 'AC01' | 'AC04' | 'AG01' | 'FF01' | 'MS03' | 'NARR';
export type MotifRefusCamt = 'LEGL' | 'CUST' | 'AGET' | 'NARR';

export interface Charge {
  bic: string;
  pays: string;
  montant: number;
  devise: string;
  type: 'SHA' | 'OUR' | 'BEN';
}

export interface Agent {
  bic: string;
  pays: string;
  role: 'emetteur' | 'intermediaire' | 'recepteur';
  statut: 'confirme' | 'en-transit' | 'en-attente';
  dateHeure?: string;
  ref?: string;
  charges: Charge[];
}

export interface MessageTrace {
  type: 'pacs.008' | 'pacs.002' | 'camt.056' | 'camt.029';
  dateHeure: string;
  statut: StatutISO;
  ref: string;
  detail?: string;
}

export interface Transaction {
  statutISO: StatutISO;
  uetr: string;
  bicEmetteur: string;
  bicRecepteur: string;
  montant: number;
  devise: string;
  date: string;
  agents: Agent[];
  messages: MessageTrace[];
  motifRejet?: MotifRejet;
  motifRejetDetail?: string;
  delaiGPI?: number;
}

export interface PaiementEntrant {
  statutISO: StatutISO;
  uetr: string;
  bicEmetteur: string;
  montant: number;
  devise: string;
  date: string;
  motif: string;
  typeCharges: 'SHA' | 'OUR' | 'BEN';
  motifRejet?: MotifRejet;
  motifRejetDetail?: string;
}

export interface Annulation {
  reference: string;
  uetr: string;
  bicEmetteur: string;
  motif: string;
  motifDetail?: string;
  date: string;
  statutReponse: 'PDNG' | 'ACCP' | 'RJCT';
  motifRefus?: MotifRefusCamt;
  reponse: string;
}

export interface NouveauPaiement {
  bicDestinataire: string;
  iban: string;
  montant: number;
  devise: 'TND' | 'EUR' | 'USD' | 'GBP';
  typeCharges: 'SHA' | 'OUR' | 'BEN';
  motif: string;
}