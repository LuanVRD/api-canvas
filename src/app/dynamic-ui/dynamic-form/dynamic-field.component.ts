import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FormFieldDescriptor } from './form-schema.service';

@Component({
  selector: 'app-dynamic-field',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule
  ],
  template: `
    <div [formGroup]="form" class="dynamic-field-container">
      @switch (field.type) {
        @case ('select') {
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>{{ field.label }}</mat-label>
            <mat-select [formControlName]="field.key">
              @for (opt of field.options; track opt) {
                <mat-option [value]="opt">{{ opt }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        }
        @case ('number') {
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>{{ field.label }}</mat-label>
            <input matInput type="number" [formControlName]="field.key">
          </mat-form-field>
        }
        @case ('boolean') {
          <div class="toggle-field">
            <mat-slide-toggle [formControlName]="field.key">
              {{ field.label }}
            </mat-slide-toggle>
          </div>
        }
        @default {
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>{{ field.label }}</mat-label>
            <input matInput [formControlName]="field.key">
          </mat-form-field>
        }
      }
    </div>
  `,
  styles: [`
    .dynamic-field-container {
      margin-bottom: 12px;
    }
    .w-full {
      width: 100%;
    }
    .toggle-field {
      padding: 8px 0;
    }
  `]
})
export class DynamicFieldComponent {
  @Input({ required: true }) form!: FormGroup;
  @Input({ required: true }) field!: FormFieldDescriptor;
}
