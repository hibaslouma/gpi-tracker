import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AiPredictionRequest {

  senderIban: string;

  receiverIban: string;

  senderBic: string;

  receiverBic: string;

  amount: number;

  currency: string;

  msgType: string;
}

export interface AiPredictionResponse {

  prediction: string;

  probability: number;

  reason: string;

  topReasons: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AiService {

  private apiUrl = 'http://localhost:8080/api/ai';

  constructor(private http: HttpClient) {}

  predict(
    data: AiPredictionRequest
  ): Observable<AiPredictionResponse> {

    return this.http.post<AiPredictionResponse>(
      `${this.apiUrl}/predict`,
      data
    );
  }
}