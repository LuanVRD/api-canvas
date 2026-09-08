import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OpenApiLoaderService {
  private readonly http = inject(HttpClient);

  load(url: string): Observable<unknown> {
    return this.http.get(url, { responseType: 'json' });
  }
}
