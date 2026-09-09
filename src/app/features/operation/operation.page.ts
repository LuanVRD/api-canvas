import {
  Component,
  computed,
  effect,
  HostListener,
  inject,
  input,
  OnInit,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ApiSessionService } from '../../core/services/api-session.service';
import { ApiExecutorService } from '../../core/services/api-executor.service';
import { ApiOperation, ApiRequestBody } from '../../core/models/api-operation.model';
import { ApiParameter } from '../../core/models/api-parameter.model';
import { ApiSchema } from '../../core/models/api-schema.model';
import { ApiExecutionResult } from '../../core/models/api-execution-result.model';
import { ApiRequestInput } from '../../core/models/api-request-input.model';
import { HttpBadgeComponent } from '../../shared/components/http-badge/http-badge.component';
import { SchemaViewerComponent } from '../../shared/components/schema-viewer/schema-viewer.component';

export interface CustomHeaderItem {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

@Component({
  selector: 'app-operation-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    HttpBadgeComponent,
    SchemaViewerComponent
  ],
  template: `
    <div class="operation-page-layout">
      <!-- Topbar Navigation -->
      <header class="operation-topbar">
        <div class="topbar-left">
          <button
            type="button"
            class="back-btn"
            (click)="onNavigateBack()"
            title="Return to Workspace"
          >
            <mat-icon class="btn-icon">arrow_back</mat-icon>
            <span>Back to Workspace</span>
          </button>

          <span class="nav-separator">/</span>

          @if (parentResource(); as res) {
            <span class="resource-breadcrumb font-mono">{{ res.label }}</span>
            <span class="nav-separator">/</span>
          }

          <span class="current-op-breadcrumb font-mono">
            {{ currentOperation()?.operationId || currentOperation()?.id || operationId() }}
          </span>
        </div>

        <div class="topbar-right">
          @if (apiTitle()) {
            <div class="api-tag">
              <span class="api-name">{{ apiTitle() }}</span>
              @if (apiVersion()) {
                <span class="api-ver font-mono">v{{ apiVersion() }}</span>
              }
            </div>
          }
        </div>
      </header>

      <!-- Operation Workbench -->
      <main class="operation-content" role="main">
        @if (currentOperation(); as op) {
          <div class="operation-workbench">
            <!-- Header Banner -->
            <section class="op-header-banner">
              <div class="method-path-row">
                <app-http-badge [method]="op.method" />
                <span class="op-path-text font-mono" [title]="op.path">{{ op.path }}</span>

                <div class="badge-group">
                  <span class="type-badge" [attr.data-type]="op.type">{{ op.type }}</span>
                  @if (op.deprecated) {
                    <span class="deprecated-tag">DEPRECATED</span>
                  }
                </div>

                <div class="banner-actions">
                  <button
                    type="button"
                    class="tool-btn"
                    (click)="onCopyPath(op.path)"
                    [title]="copiedPath() ? 'Copied!' : 'Copy path'"
                  >
                    <mat-icon class="tool-icon">{{ copiedPath() ? 'check' : 'content_copy' }}</mat-icon>
                    <span>{{ copiedPath() ? 'Copied' : 'Copy Path' }}</span>
                  </button>

                  <button
                    type="button"
                    class="tool-btn execute-primary-btn"
                    (click)="onExecute()"
                    [disabled]="isExecuting()"
                    title="Execute request (Ctrl+Enter)"
                  >
                    <mat-icon class="tool-icon">{{ isExecuting() ? 'hourglass_top' : 'play_arrow' }}</mat-icon>
                    <span>{{ isExecuting() ? 'Executing...' : 'Execute' }}</span>
                    <span class="shortcut-tag font-mono">Ctrl+↵</span>
                  </button>
                </div>
              </div>

              <!-- Summary & Meta -->
              <div class="op-identity-block">
                @if (op.summary) {
                  <h1 class="op-summary-heading">{{ op.summary }}</h1>
                } @else {
                  <h1 class="op-summary-heading untitled font-mono">{{ op.method }} {{ op.path }}</h1>
                }

                <div class="op-meta-info">
                  @if (op.operationId) {
                    <div class="meta-item">
                      <span class="meta-label">Operation ID:</span>
                      <code class="meta-value">{{ op.operationId }}</code>
                    </div>
                  }

                  @if (baseUrl()) {
                    <div class="meta-item">
                      <span class="meta-label">Base URL:</span>
                      <code class="meta-value font-mono">{{ baseUrl() }}</code>
                    </div>
                  }

                  @if (op.tags && op.tags.length > 0) {
                    <div class="meta-item">
                      <span class="meta-label">Tags:</span>
                      <div class="tags-list">
                        @for (tag of op.tags; track tag) {
                          <span class="tag-pill">{{ tag }}</span>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>

              @if (op.description && op.description !== op.summary) {
                <div class="op-description-box">
                  <p class="desc-text">{{ op.description }}</p>
                </div>
              }
            </section>

            <!-- Workbench Columns -->
            <div class="workbench-grid">
              <!-- Request Column -->
              <div class="request-column">
                @if (validationError()) {
                  <div class="alert-box alert-error" role="alert">
                    <mat-icon class="alert-icon">error</mat-icon>
                    <div class="alert-content">
                      <span class="alert-title">Request Validation Error</span>
                      <p class="alert-message">{{ validationError() }}</p>
                    </div>
                    <button type="button" class="alert-close" (click)="validationError.set(null)">
                      <mat-icon>close</mat-icon>
                    </button>
                  </div>
                }

                <!-- Parameters Section -->
                <section class="technical-section" aria-labelledby="params-heading">
                  <div class="section-title-bar">
                    <div class="title-with-icon">
                      <mat-icon class="sec-icon">tune</mat-icon>
                      <h2 id="params-heading" class="section-title">Parameters</h2>
                    </div>
                    <span class="count-pill font-mono">{{ op.parameters.length }}</span>
                  </div>

                  @if (op.parameters.length > 0) {
                    <div class="param-groups">
                      <!-- Path Parameters -->
                      @if (pathParams().length > 0) {
                        <div class="param-group">
                          <div class="param-group-header">
                            <span class="group-title">Path Parameters</span>
                            <span class="group-count font-mono">{{ pathParams().length }}</span>
                          </div>
                          <div class="param-inputs-table" role="table">
                            <div class="table-header-row" role="row">
                              <span class="th-name" role="columnheader">Parameter</span>
                              <span class="th-type" role="columnheader">Type</span>
                              <span class="th-value" role="columnheader">Value (Required)</span>
                            </div>
                            @for (p of pathParams(); track p.name) {
                              <div class="param-input-row" role="row">
                                <div class="cell-name" role="cell">
                                  <span class="param-name font-mono">{{ p.name }}</span>
                                  <span class="badge-required">required</span>
                                  @if (p.description) {
                                    <span class="param-hint" [title]="p.description">{{ p.description }}</span>
                                  }
                                </div>
                                <div class="cell-type font-mono" role="cell">
                                  <span>{{ p.schema.type || 'string' }}</span>
                                  @if (p.schema.format) {
                                    <span class="format-tag">&lt;{{ p.schema.format }}&gt;</span>
                                  }
                                </div>
                                <div class="cell-input" role="cell">
                                  <input
                                    type="text"
                                    class="mono-input"
                                    [attr.aria-label]="'Path parameter ' + p.name"
                                    [placeholder]="p.schema.format || p.name"
                                    [value]="pathParamValues()[p.name] || ''"
                                    (input)="onPathParamChange(p.name, $any($event.target).value)"
                                  />
                                </div>
                              </div>
                            }
                          </div>
                        </div>
                      }

                      <!-- Query Parameters -->
                      @if (queryParams().length > 0) {
                        <div class="param-group">
                          <div class="param-group-header">
                            <span class="group-title">Query Parameters</span>
                            <span class="group-count font-mono">{{ queryParams().length }}</span>
                          </div>
                          <div class="param-inputs-table" role="table">
                            <div class="table-header-row" role="row">
                              <span class="th-name" role="columnheader">Parameter</span>
                              <span class="th-type" role="columnheader">Type</span>
                              <span class="th-value" role="columnheader">Value</span>
                            </div>
                            @for (p of queryParams(); track p.name) {
                              <div class="param-input-row" role="row">
                                <div class="cell-name" role="cell">
                                  <span class="param-name font-mono">{{ p.name }}</span>
                                  @if (p.required) {
                                    <span class="badge-required">required</span>
                                  } @else {
                                    <span class="badge-optional">optional</span>
                                  }
                                  @if (p.description) {
                                    <span class="param-hint" [title]="p.description">{{ p.description }}</span>
                                  }
                                </div>
                                <div class="cell-type font-mono" role="cell">
                                  <span>{{ p.schema.type || 'string' }}</span>
                                  @if (p.schema.enum && p.schema.enum.length > 0) {
                                    <span class="enum-hint" [title]="formatEnumValues(p.schema.enum)">[enum]</span>
                                  }
                                </div>
                                <div class="cell-input" role="cell">
                                  @if (p.schema.enum && p.schema.enum.length > 0) {
                                    <select
                                      class="mono-select"
                                      [attr.aria-label]="'Query parameter ' + p.name"
                                      [value]="queryParamValues()[p.name] || ''"
                                      (change)="onQueryParamChange(p.name, $any($event.target).value)"
                                    >
                                      <option value="">-- None --</option>
                                      @for (enumVal of p.schema.enum; track enumVal) {
                                        <option [value]="enumVal">{{ enumVal }}</option>
                                      }
                                    </select>
                                  } @else {
                                    <input
                                      type="text"
                                      class="mono-input"
                                      [attr.aria-label]="'Query parameter ' + p.name"
                                      [placeholder]="getParamPlaceholder(p)"
                                      [value]="queryParamValues()[p.name] || ''"
                                      (input)="onQueryParamChange(p.name, $any($event.target).value)"
                                    />
                                  }
                                </div>
                              </div>
                            }
                          </div>
                        </div>
                      }

                      <!-- Header Parameters -->
                      @if (headerParams().length > 0) {
                        <div class="param-group">
                          <div class="param-group-header">
                            <span class="group-title">Header Parameters</span>
                            <span class="group-count font-mono">{{ headerParams().length }}</span>
                          </div>
                          <div class="param-inputs-table" role="table">
                            <div class="table-header-row" role="row">
                              <span class="th-name" role="columnheader">Header</span>
                              <span class="th-type" role="columnheader">Type</span>
                              <span class="th-value" role="columnheader">Value</span>
                            </div>
                            @for (p of headerParams(); track p.name) {
                              <div class="param-input-row" role="row">
                                <div class="cell-name" role="cell">
                                  <span class="param-name font-mono">{{ p.name }}</span>
                                  @if (p.required) {
                                    <span class="badge-required">required</span>
                                  } @else {
                                    <span class="badge-optional">optional</span>
                                  }
                                  @if (p.description) {
                                    <span class="param-hint" [title]="p.description">{{ p.description }}</span>
                                  }
                                </div>
                                <div class="cell-type font-mono" role="cell">
                                  <span>{{ p.schema.type || 'string' }}</span>
                                </div>
                                <div class="cell-input" role="cell">
                                  <input
                                    type="text"
                                    class="mono-input"
                                    [attr.aria-label]="'Header parameter ' + p.name"
                                    [placeholder]="getParamPlaceholder(p)"
                                    [value]="headerParamValues()[p.name] || ''"
                                    (input)="onHeaderParamChange(p.name, $any($event.target).value)"
                                  />
                                </div>
                              </div>
                            }
                          </div>
                        </div>
                      }
                    </div>
                  } @else {
                    <div class="empty-section-card">
                      <span>No parameters defined for this operation.</span>
                    </div>
                  }

                  <!-- Custom Headers Sub-section -->
                  <div class="custom-headers-block">
                    <div class="custom-headers-header">
                      <div class="ch-left">
                        <span class="ch-title">Custom Request Headers</span>
                        <span class="group-count font-mono">{{ customHeaders().length }}</span>
                      </div>
                      <button type="button" class="btn-sm add-header-btn" (click)="onAddCustomHeader()">
                        <mat-icon class="icon-sm">add</mat-icon>
                        <span>Add Header</span>
                      </button>
                    </div>

                    @if (customHeaders().length > 0) {
                      <div class="custom-headers-list">
                        @for (h of customHeaders(); track h.id) {
                          <div class="custom-header-row">
                            <input
                              type="checkbox"
                              class="header-toggle-chk"
                              [checked]="h.enabled"
                              (change)="onCustomHeaderChange(h.id, 'enabled', $any($event.target).checked)"
                              title="Enable/Disable header"
                            />
                            <input
                              type="text"
                              class="mono-input header-key-input"
                              placeholder="Header-Name (e.g. Authorization)"
                              [value]="h.key"
                              (input)="onCustomHeaderChange(h.id, 'key', $any($event.target).value)"
                            />
                            <input
                              type="text"
                              class="mono-input header-val-input"
                              placeholder="Value (e.g. Bearer token...)"
                              [value]="h.value"
                              (input)="onCustomHeaderChange(h.id, 'value', $any($event.target).value)"
                            />
                            <button
                              type="button"
                              class="delete-header-btn"
                              (click)="onRemoveCustomHeader(h.id)"
                              title="Remove header"
                            >
                              <mat-icon class="icon-sm">delete_outline</mat-icon>
                            </button>
                          </div>
                        }
                      </div>
                    }
                  </div>
                </section>

                <!-- Request Body Section -->
                @if (requestBody(); as rb) {
                  <section class="technical-section" aria-labelledby="request-body-heading">
                    <div class="section-title-bar">
                      <div class="title-with-icon">
                        <mat-icon class="sec-icon">input</mat-icon>
                        <h2 id="request-body-heading" class="section-title">Request Body</h2>
                      </div>

                      <div class="section-meta-right">
                        @if (rb.contentType) {
                          <span class="content-type-pill font-mono">{{ rb.contentType }}</span>
                        }
                        @if (rb.required) {
                          <span class="badge-required">required</span>
                        } @else {
                          <span class="badge-optional">optional</span>
                        }

                        <div class="body-view-toggle">
                          <button
                            type="button"
                            class="toggle-btn"
                            [class.active]="activeBodyTab() === 'editor'"
                            (click)="activeBodyTab.set('editor')"
                          >
                            JSON Editor
                          </button>
                          <button
                            type="button"
                            class="toggle-btn"
                            [class.active]="activeBodyTab() === 'schema'"
                            (click)="activeBodyTab.set('schema')"
                          >
                            Schema
                          </button>
                        </div>
                      </div>
                    </div>

                    @if (rb.description) {
                      <p class="section-description">{{ rb.description }}</p>
                    }

                    @if (activeBodyTab() === 'editor') {
                      <div class="json-editor-container">
                        <div class="editor-toolbar">
                          <span class="editor-lang-tag font-mono">JSON</span>
                          <div class="editor-actions">
                            <button
                              type="button"
                              class="editor-action-btn"
                              (click)="onGenerateSampleBody()"
                              title="Populate template sample from schema"
                            >
                              <mat-icon class="icon-sm">auto_fix_high</mat-icon>
                              <span>Sample JSON</span>
                            </button>
                            <button
                              type="button"
                              class="editor-action-btn"
                              (click)="onFormatJson()"
                              title="Prettify and format JSON"
                            >
                              <mat-icon class="icon-sm">format_align_left</mat-icon>
                              <span>Format</span>
                            </button>
                            <button
                              type="button"
                              class="editor-action-btn"
                              (click)="onClearBody()"
                              title="Clear editor contents"
                            >
                              <mat-icon class="icon-sm">clear</mat-icon>
                              <span>Clear</span>
                            </button>
                          </div>
                        </div>

                        <textarea
                          class="json-editor-textarea font-mono"
                          rows="10"
                          spellcheck="false"
                          placeholder="{\n  &quot;key&quot;: &quot;value&quot;\n}"
                          [value]="requestBodyText()"
                          (input)="onRequestBodyChange($any($event.target).value)"
                        ></textarea>

                        @if (requestBodyFormatError()) {
                          <div class="json-error-banner font-mono">
                            <mat-icon class="err-icon">error_outline</mat-icon>
                            <span>{{ requestBodyFormatError() }}</span>
                          </div>
                        }
                      </div>
                    } @else {
                      <div class="schema-card">
                        <app-schema-viewer [schema]="rb.schema" />
                      </div>
                    }
                  </section>
                }

                <!-- Action Bar -->
                <div class="execution-action-bar">
                  <button
                    type="button"
                    class="btn-primary execute-btn"
                    (click)="onExecute()"
                    [disabled]="isExecuting()"
                  >
                    <mat-icon class="btn-icon">{{ isExecuting() ? 'hourglass_top' : 'send' }}</mat-icon>
                    <span>{{ isExecuting() ? 'Executing Request...' : 'Execute Request' }}</span>
                  </button>

                  <button
                    type="button"
                    class="btn-secondary reset-btn"
                    (click)="onResetInputs()"
                    title="Reset parameters to defaults"
                  >
                    <mat-icon class="btn-icon">restart_alt</mat-icon>
                    <span>Reset</span>
                  </button>

                  <span class="exec-hint font-mono">Ctrl+Enter to run</span>
                </div>
              </div>

              <!-- Response Column -->
              <div class="response-column">
                <section class="response-console-section" aria-labelledby="response-console-heading">
                  <div class="section-title-bar">
                    <div class="title-with-icon">
                      <mat-icon class="sec-icon">terminal</mat-icon>
                      <h2 id="response-console-heading" class="section-title">Response Console</h2>
                    </div>

                    @if (executionResult(); as res) {
                      <div class="res-meta-badges">
                        <span
                          class="res-status-badge font-mono"
                          [attr.data-status-group]="getStatusGroup(res.status.toString())"
                        >
                          {{ res.status }} {{ res.statusText }}
                        </span>
                        <span class="res-duration-badge font-mono">
                          {{ res.durationMs }}ms
                        </span>
                      </div>
                    }
                  </div>

                  <!-- Execution Loading State -->
                  @if (isExecuting()) {
                    <div class="console-loading-state font-mono">
                      <div class="spinner"></div>
                      <span>Sending HTTP {{ op.method }} request...</span>
                    </div>
                  } @else if (executionResult(); as res) {
                    <!-- Execution Result Display -->
                    <div class="console-result-container">
                      <div class="console-tab-header">
                        <div class="tab-buttons">
                          <button
                            type="button"
                            class="console-tab-btn"
                            [class.active]="activeResponseTab() === 'body'"
                            (click)="activeResponseTab.set('body')"
                          >
                            Response Body
                          </button>
                          <button
                            type="button"
                            class="console-tab-btn"
                            [class.active]="activeResponseTab() === 'headers'"
                            (click)="activeResponseTab.set('headers')"
                          >
                            Headers
                            @if (res.headers && hasHeaders(res.headers)) {
                              <span class="tab-count font-mono">{{ getObjectKeysCount(res.headers) }}</span>
                            }
                          </button>
                          <button
                            type="button"
                            class="console-tab-btn"
                            [class.active]="activeResponseTab() === 'docs'"
                            (click)="activeResponseTab.set('docs')"
                          >
                            Documented Schemas
                          </button>
                        </div>

                        <div class="tab-actions">
                          <button
                            type="button"
                            class="copy-resp-btn"
                            (click)="onCopyResponse(res)"
                            [title]="copiedResponse() ? 'Copied!' : 'Copy response body'"
                          >
                            <mat-icon class="icon-sm">{{ copiedResponse() ? 'check' : 'content_copy' }}</mat-icon>
                            <span>{{ copiedResponse() ? 'Copied' : 'Copy' }}</span>
                          </button>
                        </div>
                      </div>

                      <!-- Console Body View -->
                      @if (activeResponseTab() === 'body') {
                        @if (!res.isSuccess && res.error) {
                          <div class="response-error-alert font-mono">
                            <mat-icon class="err-alert-icon">error</mat-icon>
                            <div class="err-alert-body">
                              <div class="err-msg">{{ res.error.message }}</div>
                              @if (res.error.details && res.error.details !== res.data) {
                                <div class="err-details">{{ formatOutput(res.error.details) }}</div>
                              }
                            </div>
                          </div>
                        }

                        <div class="response-body-viewer">
                          <pre class="response-pre font-mono"><code>{{ formatOutput(res.data) }}</code></pre>
                        </div>
                      }

                      <!-- Console Headers View -->
                      @if (activeResponseTab() === 'headers') {
                        <div class="response-headers-viewer">
                          @if (res.headers && hasHeaders(res.headers)) {
                            <div class="resp-headers-table font-mono" role="table">
                              @for (headerEntry of getHeaderEntries(res.headers); track headerEntry.name) {
                                <div class="resp-header-row" role="row">
                                  <span class="rh-key" role="cell">{{ headerEntry.name }}:</span>
                                  <span class="rh-val" role="cell">{{ headerEntry.schema }}</span>
                                </div>
                              }
                            </div>
                          } @else {
                            <div class="no-headers-note font-mono">No response headers captured.</div>
                          }
                        </div>
                      }

                      <!-- Documented Responses View -->
                      @if (activeResponseTab() === 'docs') {
                        <div class="documented-responses-list">
                          <ng-container *ngTemplateOutlet="docResponsesTemplate; context: { $implicit: op.responses }" />
                        </div>
                      }
                    </div>
                  } @else {
                    <!-- Empty / Idle Console State -->
                    <div class="console-idle-state">
                      <div class="idle-message">
                        <mat-icon class="idle-icon">play_circle_outline</mat-icon>
                        <h3>Ready to Execute</h3>
                        <p>
                          Configure parameters or payload and click <strong>Execute Request</strong> or press <code class="font-mono">Ctrl+Enter</code>.
                        </p>
                      </div>

                      <div class="documented-specs-preview">
                        <div class="preview-title">
                          <mat-icon class="icon-sm">menu_book</mat-icon>
                          <span>Documented Responses (OpenAPI)</span>
                        </div>
                        <ng-container *ngTemplateOutlet="docResponsesTemplate; context: { $implicit: op.responses }" />
                      </div>
                    </div>
                  }
                </section>
              </div>
            </div>

            <!-- Reusable Documented Responses Template -->
            <ng-template #docResponsesTemplate let-responses>
              @if (responses && responses.length > 0) {
                <div class="responses-list">
                  @for (resp of responses; track resp.statusCode) {
                    <div class="response-card">
                      <div class="response-card-header">
                        <div class="status-code-block">
                          <span
                            class="status-code-badge font-mono"
                            [attr.data-status-group]="getStatusGroup(resp.statusCode)"
                          >
                            {{ resp.statusCode }}
                          </span>
                          <span class="response-description">
                            {{ resp.description || getStatusText(resp.statusCode) }}
                          </span>
                        </div>

                        @if (resp.contentType) {
                          <span class="content-type-pill font-mono">{{ resp.contentType }}</span>
                        }
                      </div>

                      @if (resp.schema) {
                        <div class="response-body-schema">
                          <app-schema-viewer [schema]="resp.schema" />
                        </div>
                      } @else {
                        <div class="no-body-note font-mono">
                          <span>No response body schema defined</span>
                        </div>
                      }
                    </div>
                  }
                </div>
              } @else {
                <div class="empty-section-card">
                  <span>No response schemas defined for this operation.</span>
                </div>
              }
            </ng-template>
          </div>
        } @else {
          <div class="not-found-container">
            <mat-icon class="not-found-icon">error_outline</mat-icon>
            <h2>Operation Not Found</h2>
            <p>
              The requested operation <code class="font-mono">{{ operationId() || 'undefined' }}</code> could not be found in the active API definition.
            </p>
            <button type="button" class="back-link-btn" (click)="onNavigateBack()">
              <mat-icon>arrow_back</mat-icon>
              <span>Return to Workspace</span>
            </button>
          </div>
        }
      </main>
    </div>
  `,
  styles: [`
    .operation-page-layout { display: flex; flex-direction: column; height: 100vh; background: var(--canvas-bg); color: var(--canvas-text-primary); overflow: hidden; }
    .operation-topbar { height: 48px; min-height: 48px; background: var(--canvas-surface); border-bottom: 1px solid var(--canvas-border); padding: 0 16px; display: flex; align-items: center; justify-content: space-between; gap: 16px; z-index: 10; }
    .topbar-left { display: flex; align-items: center; gap: 10px; overflow: hidden; min-width: 0; }
    .back-btn { height: 28px; padding: 0 8px; font-size: 12px; font-weight: 500; color: var(--canvas-text-secondary); background: var(--canvas-surface-elevated); border: 1px solid var(--canvas-border); border-radius: var(--radius-sm); cursor: pointer; display: flex; align-items: center; gap: 4px; transition: all 0.12s ease; flex-shrink: 0; }
    .back-btn:hover { color: var(--canvas-text-primary); border-color: var(--canvas-text-muted); background: #282e37; }
    .btn-icon { font-size: 15px; width: 15px; height: 15px; }
    .nav-separator { color: var(--canvas-text-muted); font-size: 12px; }
    .resource-breadcrumb { font-size: 12px; color: var(--canvas-text-secondary); white-space: nowrap; }
    .current-op-breadcrumb { font-size: 12px; font-weight: 600; color: var(--canvas-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .topbar-right { display: flex; align-items: center; flex-shrink: 0; }
    .api-tag { display: flex; align-items: center; gap: 6px; font-size: 12px; }
    .api-name { color: var(--canvas-text-muted); font-weight: 500; }
    .api-ver { font-size: 11px; color: var(--canvas-text-secondary); background: var(--canvas-surface-elevated); padding: 1px 5px; border-radius: var(--radius-sm); border: 1px solid var(--canvas-border-subtle); }
    .operation-content { flex: 1; overflow-y: auto; padding: 20px 28px 48px; }
    .operation-workbench { max-width: 1360px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px; }
    .op-header-banner { display: flex; flex-direction: column; gap: 12px; border-bottom: 1px solid var(--canvas-border-subtle); padding-bottom: 16px; }
    .method-path-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .op-path-text { font-size: 16px; font-weight: 600; color: var(--canvas-text-primary); word-break: break-all; }
    .badge-group { display: flex; align-items: center; gap: 6px; }
    .type-badge { font-size: 10px; text-transform: uppercase; font-family: var(--font-mono); font-weight: 600; padding: 2px 6px; border-radius: var(--radius-sm); letter-spacing: 0.5px; background: var(--canvas-surface-elevated); border: 1px solid var(--canvas-border); color: var(--canvas-text-secondary); }
    .type-badge[data-type="action"] { color: #e3b341; background: rgba(227, 179, 65, 0.1); border-color: rgba(227, 179, 65, 0.3); }
    .type-badge[data-type="unknown"] { color: #a371f7; background: rgba(163, 113, 247, 0.1); border-color: rgba(163, 113, 247, 0.3); }
    .deprecated-tag { font-size: 10px; font-family: var(--font-mono); font-weight: 700; color: var(--color-danger); background: rgba(218, 54, 51, 0.12); border: 1px solid rgba(218, 54, 51, 0.3); padding: 2px 6px; border-radius: var(--radius-sm); }
    .banner-actions { margin-left: auto; display: flex; align-items: center; gap: 8px; }
    .tool-btn { height: 28px; padding: 0 10px; font-size: 12px; background: var(--canvas-surface); border: 1px solid var(--canvas-border); border-radius: var(--radius-sm); color: var(--canvas-text-secondary); cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.12s ease; }
    .tool-btn:hover:not(:disabled) { color: var(--canvas-text-primary); background: var(--canvas-surface-elevated); }
    .tool-icon { font-size: 14px; width: 14px; height: 14px; }
    .execute-primary-btn { background: #238636; border-color: rgba(240, 246, 252, 0.1); color: #ffffff; font-weight: 600; }
    .execute-primary-btn:hover:not(:disabled) { background: #2ea043; }
    .execute-primary-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .shortcut-tag { font-size: 10px; background: rgba(0, 0, 0, 0.25); padding: 1px 4px; border-radius: 2px; margin-left: 4px; }
    .op-identity-block { display: flex; flex-direction: column; gap: 6px; }
    .op-summary-heading { margin: 0; font-size: 18px; font-weight: 600; color: var(--canvas-text-primary); letter-spacing: -0.2px; }
    .op-summary-heading.untitled { font-size: 15px; color: var(--canvas-text-secondary); }
    .op-meta-info { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    .meta-item { display: flex; align-items: center; gap: 6px; font-size: 12px; }
    .meta-label { color: var(--canvas-text-muted); font-weight: 500; }
    .meta-value { font-size: 12px; color: var(--canvas-text-link); background: var(--canvas-surface-elevated); padding: 1px 6px; border-radius: var(--radius-sm); border: 1px solid var(--canvas-border-subtle); }
    .tags-list { display: flex; gap: 4px; }
    .tag-pill { font-size: 11px; color: var(--canvas-text-secondary); background: var(--canvas-surface-elevated); padding: 1px 6px; border-radius: var(--radius-sm); border: 1px solid var(--canvas-border-subtle); }
    .op-description-box { margin-top: 2px; background: var(--canvas-surface); border: 1px solid var(--canvas-border-subtle); border-radius: var(--radius-sm); padding: 8px 12px; }
    .desc-text { margin: 0; font-size: 12px; line-height: 1.5; color: var(--canvas-text-secondary); }
    .workbench-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start; }
    .request-column, .response-column { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
    .technical-section { background: var(--canvas-surface); border: 1px solid var(--canvas-border); border-radius: var(--radius-md); padding: 14px; display: flex; flex-direction: column; gap: 12px; }
    .section-title-bar { display: flex; align-items: center; justify-content: space-between; padding-bottom: 8px; border-bottom: 1px solid var(--canvas-border-subtle); }
    .title-with-icon { display: flex; align-items: center; gap: 6px; }
    .sec-icon { font-size: 16px; width: 16px; height: 16px; color: var(--canvas-text-muted); }
    .section-title { margin: 0; font-size: 13px; font-weight: 700; color: var(--canvas-text-primary); text-transform: uppercase; letter-spacing: 0.5px; }
    .count-pill { font-size: 11px; color: var(--canvas-text-muted); background: var(--canvas-surface-elevated); padding: 1px 6px; border-radius: var(--radius-sm); border: 1px solid var(--canvas-border-subtle); }
    .section-meta-right { display: flex; align-items: center; gap: 8px; }
    .section-description { margin: 0; font-size: 12px; color: var(--canvas-text-secondary); }
    .param-groups { display: flex; flex-direction: column; gap: 14px; }
    .param-group { display: flex; flex-direction: column; gap: 6px; }
    .param-group-header { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; color: var(--canvas-text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
    .group-count { font-size: 10px; background: var(--canvas-surface-elevated); padding: 1px 4px; border-radius: var(--radius-sm); }
    .param-inputs-table { display: flex; flex-direction: column; border: 1px solid var(--canvas-border); border-radius: var(--radius-sm); background: var(--canvas-bg); overflow: hidden; }
    .table-header-row { display: grid; grid-template-columns: 140px 100px 1fr; padding: 6px 10px; background: var(--canvas-surface-elevated); border-bottom: 1px solid var(--canvas-border); font-size: 11px; font-weight: 600; color: var(--canvas-text-muted); text-transform: uppercase; }
    .param-input-row { display: grid; grid-template-columns: 140px 100px 1fr; align-items: center; padding: 6px 10px; border-bottom: 1px solid var(--canvas-border-subtle); gap: 8px; }
    .param-input-row:last-child { border-bottom: none; }
    .cell-name { display: flex; flex-direction: column; gap: 2px; overflow: hidden; }
    .param-name { font-size: 12px; font-weight: 600; color: var(--canvas-text-primary); overflow: hidden; text-overflow: ellipsis; }
    .param-hint { font-size: 10px; color: var(--canvas-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .cell-type { font-size: 11px; color: var(--canvas-text-secondary); display: flex; align-items: center; gap: 4px; }
    .format-tag, .enum-hint { font-size: 10px; color: var(--canvas-text-muted); }
    .cell-input { display: flex; align-items: center; }
    .mono-input, .mono-select { width: 100%; height: 28px; background: var(--canvas-surface); border: 1px solid var(--canvas-border); border-radius: var(--radius-sm); color: var(--canvas-text-primary); font-family: var(--font-mono); font-size: 12px; padding: 0 8px; outline: none; transition: border-color 0.12s ease; }
    .mono-input:focus, .mono-select:focus { border-color: var(--canvas-text-link); }
    .mono-input::placeholder { color: var(--canvas-text-muted); font-family: var(--font-mono); font-size: 11px; }
    .mono-select { cursor: pointer; }
    .custom-headers-block { display: flex; flex-direction: column; gap: 8px; margin-top: 4px; padding-top: 10px; border-top: 1px dashed var(--canvas-border-subtle); }
    .custom-headers-header { display: flex; align-items: center; justify-content: space-between; }
    .ch-left { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; color: var(--canvas-text-muted); text-transform: uppercase; }
    .add-header-btn { height: 22px; padding: 0 6px; font-size: 11px; background: var(--canvas-surface-elevated); border: 1px solid var(--canvas-border); border-radius: var(--radius-sm); color: var(--canvas-text-secondary); cursor: pointer; display: flex; align-items: center; gap: 2px; }
    .add-header-btn:hover { color: var(--canvas-text-primary); border-color: var(--canvas-text-muted); }
    .custom-headers-list { display: flex; flex-direction: column; gap: 6px; }
    .custom-header-row { display: flex; align-items: center; gap: 8px; }
    .header-toggle-chk { accent-color: var(--canvas-text-link); cursor: pointer; }
    .header-key-input { width: 40%; }
    .header-val-input { flex: 1; }
    .delete-header-btn { background: transparent; border: none; color: var(--canvas-text-muted); cursor: pointer; padding: 2px; display: flex; align-items: center; }
    .delete-header-btn:hover { color: var(--color-danger); }
    .json-editor-container { display: flex; flex-direction: column; border: 1px solid var(--canvas-border); border-radius: var(--radius-sm); background: var(--canvas-bg); overflow: hidden; }
    .editor-toolbar { height: 30px; background: var(--canvas-surface-elevated); border-bottom: 1px solid var(--canvas-border); padding: 0 8px; display: flex; align-items: center; justify-content: space-between; }
    .editor-lang-tag { font-size: 11px; font-weight: 600; color: var(--canvas-text-muted); }
    .editor-actions { display: flex; align-items: center; gap: 4px; }
    .editor-action-btn { height: 22px; padding: 0 6px; font-size: 11px; background: var(--canvas-surface); border: 1px solid var(--canvas-border); border-radius: var(--radius-sm); color: var(--canvas-text-secondary); cursor: pointer; display: flex; align-items: center; gap: 4px; }
    .editor-action-btn:hover { color: var(--canvas-text-primary); border-color: var(--canvas-text-muted); }
    .json-editor-textarea { width: 100%; background: transparent; border: none; outline: none; color: var(--canvas-text-primary); font-family: var(--font-mono); font-size: 12px; line-height: 1.6; padding: 10px; resize: vertical; min-height: 140px; }
    .json-error-banner { padding: 6px 10px; background: rgba(218, 54, 51, 0.15); border-top: 1px solid rgba(218, 54, 51, 0.3); color: #f85149; font-size: 11px; display: flex; align-items: center; gap: 6px; }
    .json-error-banner .err-icon { font-size: 14px; width: 14px; height: 14px; }
    .body-view-toggle { display: flex; background: var(--canvas-surface-elevated); border: 1px solid var(--canvas-border-subtle); border-radius: var(--radius-sm); padding: 1px; }
    .toggle-btn { background: transparent; border: none; font-size: 11px; color: var(--canvas-text-muted); padding: 2px 8px; border-radius: 2px; cursor: pointer; }
    .toggle-btn.active { background: var(--canvas-surface); color: var(--canvas-text-primary); font-weight: 500; }
    .execution-action-bar { display: flex; align-items: center; gap: 10px; padding: 12px 14px; background: var(--canvas-surface); border: 1px solid var(--canvas-border); border-radius: var(--radius-md); }
    .btn-primary.execute-btn { height: 32px; padding: 0 16px; background: #238636; border: 1px solid rgba(240, 246, 252, 0.1); border-radius: var(--radius-sm); color: #ffffff; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: background 0.12s ease; }
    .btn-primary.execute-btn:hover:not(:disabled) { background: #2ea043; }
    .btn-primary.execute-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-primary.execute-btn .btn-icon { font-size: 16px; width: 16px; height: 16px; }
    .btn-secondary.reset-btn { height: 32px; padding: 0 12px; background: var(--canvas-surface-elevated); border: 1px solid var(--canvas-border); border-radius: var(--radius-sm); color: var(--canvas-text-secondary); font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 4px; }
    .btn-secondary.reset-btn:hover { color: var(--canvas-text-primary); border-color: var(--canvas-text-muted); }
    .btn-secondary.reset-btn .btn-icon { font-size: 15px; width: 15px; height: 15px; }
    .exec-hint { margin-left: auto; font-size: 11px; color: var(--canvas-text-muted); }
    .alert-box { padding: 10px 12px; border-radius: var(--radius-sm); display: flex; align-items: flex-start; gap: 8px; }
    .alert-box.alert-error { background: rgba(218, 54, 51, 0.12); border: 1px solid rgba(218, 54, 51, 0.3); color: #f85149; }
    .alert-icon { font-size: 16px; width: 16px; height: 16px; flex-shrink: 0; margin-top: 1px; }
    .alert-content { flex: 1; }
    .alert-title { font-size: 12px; font-weight: 600; display: block; }
    .alert-message { margin: 2px 0 0; font-size: 12px; opacity: 0.9; }
    .alert-close { background: transparent; border: none; color: inherit; cursor: pointer; padding: 0; display: flex; }
    .alert-close mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .response-console-section { background: var(--canvas-surface); border: 1px solid var(--canvas-border); border-radius: var(--radius-md); padding: 14px; display: flex; flex-direction: column; gap: 12px; min-height: 480px; }
    .res-meta-badges { display: flex; align-items: center; gap: 6px; }
    .res-status-badge { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: var(--radius-sm); background: var(--canvas-surface-elevated); }
    .res-status-badge[data-status-group="2xx"] { color: var(--color-success); background: rgba(46, 160, 67, 0.15); border: 1px solid rgba(46, 160, 67, 0.3); }
    .res-status-badge[data-status-group="3xx"] { color: var(--canvas-text-link); background: rgba(88, 166, 255, 0.15); border: 1px solid rgba(88, 166, 255, 0.3); }
    .res-status-badge[data-status-group="4xx"] { color: #d29922; background: rgba(210, 153, 34, 0.15); border: 1px solid rgba(210, 153, 34, 0.3); }
    .res-status-badge[data-status-group="5xx"], .res-status-badge[data-status-group="default"] { color: var(--color-danger); background: rgba(218, 54, 51, 0.15); border: 1px solid rgba(218, 54, 51, 0.3); }
    .res-duration-badge { font-size: 11px; color: var(--canvas-text-secondary); background: var(--canvas-surface-elevated); border: 1px solid var(--canvas-border-subtle); padding: 2px 6px; border-radius: var(--radius-sm); }
    .console-loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; gap: 16px; color: var(--canvas-text-secondary); font-size: 12px; }
    .spinner { width: 24px; height: 24px; border: 2px solid var(--canvas-border); border-top-color: var(--canvas-text-link); border-radius: 50%; animation: spin 0.8s linear infinite; }
    .console-result-container { display: flex; flex-direction: column; gap: 8px; }
    .console-tab-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--canvas-border-subtle); padding-bottom: 4px; }
    .tab-buttons { display: flex; gap: 4px; }
    .console-tab-btn { background: transparent; border: none; font-size: 12px; color: var(--canvas-text-muted); padding: 4px 8px; cursor: pointer; border-radius: var(--radius-sm); display: flex; align-items: center; gap: 4px; }
    .console-tab-btn.active { background: var(--canvas-surface-elevated); color: var(--canvas-text-primary); font-weight: 500; }
    .tab-count { font-size: 10px; background: var(--canvas-bg); padding: 1px 4px; border-radius: 2px; }
    .copy-resp-btn { height: 22px; padding: 0 6px; font-size: 11px; background: var(--canvas-surface-elevated); border: 1px solid var(--canvas-border); border-radius: var(--radius-sm); color: var(--canvas-text-secondary); cursor: pointer; display: flex; align-items: center; gap: 4px; }
    .copy-resp-btn:hover { color: var(--canvas-text-primary); border-color: var(--canvas-text-muted); }
    .response-error-alert { padding: 8px 10px; background: rgba(218, 54, 51, 0.12); border: 1px solid rgba(218, 54, 51, 0.3); border-radius: var(--radius-sm); display: flex; align-items: flex-start; gap: 6px; font-size: 12px; color: #f85149; }
    .err-alert-icon { font-size: 15px; width: 15px; height: 15px; margin-top: 1px; }
    .err-alert-body { flex: 1; }
    .err-msg { font-weight: 600; }
    .err-details { margin-top: 4px; font-size: 11px; color: #ff7b72; white-space: pre-wrap; }
    .response-body-viewer { background: var(--canvas-bg); border: 1px solid var(--canvas-border); border-radius: var(--radius-sm); padding: 10px; max-height: 480px; overflow-y: auto; }
    .response-pre { margin: 0; font-size: 12px; line-height: 1.5; color: var(--canvas-text-primary); white-space: pre-wrap; word-break: break-all; }
    .response-headers-viewer { background: var(--canvas-bg); border: 1px solid var(--canvas-border); border-radius: var(--radius-sm); padding: 10px; max-height: 380px; overflow-y: auto; }
    .resp-headers-table { display: flex; flex-direction: column; gap: 4px; }
    .resp-header-row { display: flex; gap: 8px; font-size: 11px; }
    .rh-key { color: var(--canvas-text-link); font-weight: 500; min-width: 160px; }
    .rh-val { color: var(--canvas-text-secondary); word-break: break-all; }
    .no-headers-note { font-size: 12px; color: var(--canvas-text-muted); text-align: center; padding: 16px; }
    .console-idle-state { display: flex; flex-direction: column; gap: 20px; padding-top: 10px; }
    .idle-message { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 24px 16px; background: var(--canvas-bg); border: 1px dashed var(--canvas-border); border-radius: var(--radius-sm); }
    .idle-icon { font-size: 28px; width: 28px; height: 28px; color: var(--canvas-text-muted); margin-bottom: 8px; }
    .idle-message h3 { margin: 0 0 4px; font-size: 14px; font-weight: 600; color: var(--canvas-text-primary); }
    .idle-message p { margin: 0; font-size: 12px; color: var(--canvas-text-secondary); }
    .documented-specs-preview { display: flex; flex-direction: column; gap: 8px; }
    .preview-title { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; color: var(--canvas-text-muted); text-transform: uppercase; }
    .schema-card { background: var(--canvas-bg); border: 1px solid var(--canvas-border); border-radius: var(--radius-sm); padding: 12px; }
    .responses-list { display: flex; flex-direction: column; gap: 10px; }
    .response-card { background: var(--canvas-bg); border: 1px solid var(--canvas-border); border-radius: var(--radius-sm); padding: 10px; display: flex; flex-direction: column; gap: 8px; }
    .response-card-header { display: flex; align-items: center; justify-content: space-between; }
    .status-code-block { display: flex; align-items: center; gap: 8px; }
    .status-code-badge { font-size: 11px; font-weight: 700; padding: 1px 6px; border-radius: var(--radius-sm); background: var(--canvas-surface-elevated); }
    .status-code-badge[data-status-group="2xx"] { color: var(--color-success); background: rgba(46, 160, 67, 0.15); }
    .status-code-badge[data-status-group="4xx"] { color: #d29922; background: rgba(210, 153, 34, 0.15); }
    .status-code-badge[data-status-group="5xx"] { color: var(--color-danger); background: rgba(218, 54, 51, 0.15); }
    .response-description { font-size: 12px; color: var(--canvas-text-primary); }
    .no-body-note { font-size: 11px; color: var(--canvas-text-muted); }
    .empty-section-card { padding: 16px; text-align: center; color: var(--canvas-text-muted); font-size: 12px; border: 1px dashed var(--canvas-border-subtle); border-radius: var(--radius-sm); }
    .badge-required { font-size: 9px; text-transform: uppercase; font-family: var(--font-mono); font-weight: 700; color: #f85149; background: rgba(218, 54, 51, 0.15); border: 1px solid rgba(218, 54, 51, 0.3); padding: 1px 4px; border-radius: 2px; width: fit-content; }
    .badge-optional { font-size: 9px; text-transform: uppercase; font-family: var(--font-mono); color: var(--canvas-text-muted); background: var(--canvas-surface-elevated); padding: 1px 4px; border-radius: 2px; width: fit-content; }
    .content-type-pill { font-size: 11px; color: var(--canvas-text-secondary); background: var(--canvas-surface-elevated); padding: 1px 6px; border-radius: var(--radius-sm); border: 1px solid var(--canvas-border-subtle); }
    .icon-sm { font-size: 14px; width: 14px; height: 14px; }
    .not-found-container { max-width: 500px; margin: 60px auto; text-align: center; background: var(--canvas-surface); border: 1px solid var(--canvas-border); border-radius: var(--radius-md); padding: 32px 24px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
    .not-found-icon { font-size: 40px; width: 40px; height: 40px; color: var(--color-warning); }
    .not-found-container h2 { margin: 0; font-size: 18px; font-weight: 600; }
    .not-found-container p { margin: 0; font-size: 13px; color: var(--canvas-text-secondary); }
    .back-link-btn { margin-top: 8px; height: 32px; padding: 0 16px; background: var(--canvas-surface-elevated); border: 1px solid var(--canvas-border); border-radius: var(--radius-sm); color: var(--canvas-text-primary); cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 13px; }
    .back-link-btn:hover { border-color: var(--canvas-text-muted); background: #282e37; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @media (max-width: 992px) { .workbench-grid { grid-template-columns: 1fr; } .operation-content { padding: 16px; } }
  `]
})
export class OperationPage implements OnInit {
  private readonly sessionService = inject(ApiSessionService);
  private readonly executorService = inject(ApiExecutorService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly operationId = input<string | undefined>(undefined);
  readonly routeOperationId = signal<string | null>(null);

  readonly copiedPath = signal<boolean>(false);
  readonly copiedResponse = signal<boolean>(false);

  // Inputs state
  readonly pathParamValues = signal<Record<string, string>>({});
  readonly queryParamValues = signal<Record<string, string>>({});
  readonly headerParamValues = signal<Record<string, string>>({});
  readonly customHeaders = signal<CustomHeaderItem[]>([]);
  readonly requestBodyText = signal<string>('');
  readonly requestBodyFormatError = signal<string | null>(null);
  readonly validationError = signal<string | null>(null);

  // Execution & UI state
  readonly isExecuting = signal<boolean>(false);
  readonly executionResult = signal<ApiExecutionResult | null>(null);
  readonly activeBodyTab = signal<'editor' | 'schema'>('editor');
  readonly activeResponseTab = signal<'body' | 'headers' | 'docs'>('body');

  readonly apiTitle = this.sessionService.apiTitle;
  readonly apiVersion = this.sessionService.apiVersion;
  readonly baseUrl = this.sessionService.baseUrl;

  readonly targetOpId = computed<string | undefined>(() => {
    return this.operationId() || this.routeOperationId() || undefined;
  });

  readonly currentOperation = computed<ApiOperation | null>(() => {
    const id = this.targetOpId();
    if (!id) return null;
    return this.sessionService.getOperation(id);
  });

  readonly parentResource = computed(() => {
    const id = this.targetOpId();
    if (!id) return null;
    return this.sessionService.getResourceForOperation(id);
  });

  readonly pathParams = computed<ApiParameter[]>(() => {
    const op = this.currentOperation();
    if (!op) return [];
    return op.parameters.filter((p) => p.location === 'path');
  });

  readonly queryParams = computed<ApiParameter[]>(() => {
    const op = this.currentOperation();
    if (!op) return [];
    return op.parameters.filter((p) => p.location === 'query');
  });

  readonly headerParams = computed<ApiParameter[]>(() => {
    const op = this.currentOperation();
    if (!op) return [];
    return op.parameters.filter((p) => p.location === 'header');
  });

  readonly cookieParams = computed<ApiParameter[]>(() => {
    const op = this.currentOperation();
    if (!op) return [];
    return op.parameters.filter((p) => p.location === 'cookie');
  });

  readonly requestBody = computed<ApiRequestBody | null>(() => {
    const op = this.currentOperation();
    if (!op || !op.requestBody) return null;

    const rb = op.requestBody;
    if ('schema' in rb) {
      return rb as ApiRequestBody;
    }
    return {
      schema: rb as ApiSchema,
      contentType: 'application/json'
    };
  });

  constructor() {
    effect(() => {
      const op = this.currentOperation();
      if (op) {
        this.initializeOperationState(op);
      }
    });
  }

  ngOnInit(): void {
    const paramId = this.route.snapshot.paramMap.get('operationId');
    if (paramId) {
      this.routeOperationId.set(paramId);
    }
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      if (!this.isExecuting()) {
        this.onExecute();
      }
    }
  }

  private initializeOperationState(op: ApiOperation): void {
    const pathInit: Record<string, string> = {};
    const queryInit: Record<string, string> = {};
    const headerInit: Record<string, string> = {};

    for (const p of op.parameters) {
      const defaultVal = p.default !== undefined ? String(p.default) : (p.schema.default !== undefined ? String(p.schema.default) : '');
      if (p.location === 'path') {
        pathInit[p.name] = defaultVal;
      } else if (p.location === 'query') {
        queryInit[p.name] = defaultVal;
      } else if (p.location === 'header') {
        headerInit[p.name] = defaultVal;
      }
    }

    this.pathParamValues.set(pathInit);
    this.queryParamValues.set(queryInit);
    this.headerParamValues.set(headerInit);
    this.customHeaders.set([]);
    this.validationError.set(null);
    this.requestBodyFormatError.set(null);
    this.executionResult.set(null);

    const rb = op.requestBody;
    if (rb) {
      const schema = 'schema' in rb ? (rb as ApiRequestBody).schema : (rb as ApiSchema);
      const sample = this.generateSampleFromSchema(schema);
      this.requestBodyText.set(JSON.stringify(sample, null, 2));
    } else {
      this.requestBodyText.set('');
    }
  }

  onPathParamChange(name: string, value: string): void {
    this.pathParamValues.update((current) => ({ ...current, [name]: value }));
    this.validationError.set(null);
  }

  onQueryParamChange(name: string, value: string): void {
    this.queryParamValues.update((current) => ({ ...current, [name]: value }));
  }

  onHeaderParamChange(name: string, value: string): void {
    this.headerParamValues.update((current) => ({ ...current, [name]: value }));
  }

  onAddCustomHeader(): void {
    const newId = `ch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    this.customHeaders.update((list) => [...list, { id: newId, key: '', value: '', enabled: true }]);
  }

  onRemoveCustomHeader(id: string): void {
    this.customHeaders.update((list) => list.filter((h) => h.id !== id));
  }

  onCustomHeaderChange(id: string, field: 'key' | 'value' | 'enabled', val: any): void {
    this.customHeaders.update((list) =>
      list.map((h) => (h.id === id ? { ...h, [field]: val } : h))
    );
  }

  onRequestBodyChange(text: string): void {
    this.requestBodyText.set(text);
    if (this.requestBodyFormatError()) {
      try {
        if (text.trim() !== '') {
          JSON.parse(text);
        }
        this.requestBodyFormatError.set(null);
      } catch {
        // Keep error until valid
      }
    }
  }

  onFormatJson(): void {
    const raw = this.requestBodyText();
    if (!raw.trim()) return;

    try {
      const parsed = JSON.parse(raw);
      this.requestBodyText.set(JSON.stringify(parsed, null, 2));
      this.requestBodyFormatError.set(null);
    } catch (err: any) {
      this.requestBodyFormatError.set(`JSON Format Error: ${err.message}`);
    }
  }

  onGenerateSampleBody(): void {
    const op = this.currentOperation();
    if (!op || !op.requestBody) return;

    const rb = op.requestBody;
    const schema = 'schema' in rb ? (rb as ApiRequestBody).schema : (rb as ApiSchema);
    const sample = this.generateSampleFromSchema(schema);
    this.requestBodyText.set(JSON.stringify(sample, null, 2));
    this.requestBodyFormatError.set(null);
  }

  onClearBody(): void {
    this.requestBodyText.set('');
    this.requestBodyFormatError.set(null);
  }

  onResetInputs(): void {
    const op = this.currentOperation();
    if (op) {
      this.initializeOperationState(op);
    }
  }

  onExecute(): void {
    const op = this.currentOperation();
    if (!op) return;

    this.validationError.set(null);
    this.requestBodyFormatError.set(null);

    // 1. Validate required Path Parameters
    for (const p of this.pathParams()) {
      const val = this.pathParamValues()[p.name];
      if (!val || val.trim() === '') {
        this.validationError.set(`Missing required path parameter: "${p.name}".`);
        return;
      }
    }

    // 2. Validate Request Body JSON if present
    let parsedBody: unknown = undefined;
    const bodyStr = this.requestBodyText().trim();
    if (bodyStr !== '') {
      try {
        parsedBody = JSON.parse(bodyStr);
      } catch (err: any) {
        this.requestBodyFormatError.set(`Invalid JSON: ${err.message}`);
        this.validationError.set('Please fix the JSON syntax error in the Request Body before executing.');
        return;
      }
    } else if (op.requestBody && 'required' in op.requestBody && (op.requestBody as ApiRequestBody).required) {
      this.validationError.set('Request Body is required for this operation.');
      return;
    }

    // 3. Assemble Headers
    const headersRecord: Record<string, string> = {};
    for (const [k, v] of Object.entries(this.headerParamValues())) {
      if (v && v.trim() !== '') {
        headersRecord[k] = v;
      }
    }
    for (const ch of this.customHeaders()) {
      if (ch.enabled && ch.key.trim() !== '') {
        headersRecord[ch.key.trim()] = ch.value;
      }
    }

    // 4. Assemble Query Parameters
    const queryRecord: Record<string, string> = {};
    for (const [k, v] of Object.entries(this.queryParamValues())) {
      if (v !== undefined && v !== null && v.trim() !== '') {
        queryRecord[k] = v;
      }
    }

    const inputData: ApiRequestInput = {
      path: this.pathParamValues(),
      query: queryRecord,
      headers: headersRecord,
      body: parsedBody
    };

    const base = this.baseUrl() || '';
    this.isExecuting.set(true);

    this.executorService.execute(base, op, inputData).subscribe({
      next: (result: ApiExecutionResult) => {
        this.executionResult.set(result);
        this.isExecuting.set(false);
        this.activeResponseTab.set('body');
      },
      error: (err: any) => {
        this.executionResult.set({
          status: err?.status || 0,
          statusText: err?.statusText || 'Execution Error',
          data: err?.error || err?.message || 'Unknown network error',
          duration: 0,
          durationMs: 0,
          isSuccess: false,
          error: {
            message: err?.message || 'Execution error occurred',
            status: err?.status || 0,
            details: err?.error
          }
        });
        this.isExecuting.set(false);
      }
    });
  }

  onNavigateBack(): void {
    const parent = this.parentResource();
    if (parent) {
      this.router.navigate(['/workspace', parent.id]);
    } else {
      this.router.navigate(['/workspace']);
    }
  }

  onCopyPath(path: string): void {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(path).then(() => {
        this.copiedPath.set(true);
        setTimeout(() => this.copiedPath.set(false), 2000);
      });
    }
  }

  onCopyResponse(res: ApiExecutionResult): void {
    if (navigator?.clipboard) {
      const text = this.formatOutput(res.data);
      navigator.clipboard.writeText(text).then(() => {
        this.copiedResponse.set(true);
        setTimeout(() => this.copiedResponse.set(false), 2000);
      });
    }
  }

  formatOutput(data: unknown): string {
    if (data === undefined || data === null) {
      return '';
    }
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return data;
      }
    }
    return JSON.stringify(data, null, 2);
  }

  generateSampleFromSchema(schema?: ApiSchema | null): unknown {
    if (!schema) return {};
    if (schema.example !== undefined) return schema.example;
    if (schema.default !== undefined) return schema.default;
    if (schema.enum && schema.enum.length > 0) return schema.enum[0];

    switch (schema.type) {
      case 'string':
        if (schema.format === 'date-time') return new Date().toISOString();
        if (schema.format === 'date') return '2026-01-01';
        if (schema.format === 'uuid') return '123e4567-e89b-12d3-a456-426614174000';
        if (schema.format === 'email') return 'user@example.com';
        return 'string';
      case 'number':
      case 'integer':
        return 0;
      case 'boolean':
        return false;
      case 'array':
        if (schema.items) {
          return [this.generateSampleFromSchema(schema.items)];
        }
        return [];
      case 'object':
      default:
        if (schema.properties) {
          const obj: Record<string, unknown> = {};
          for (const [propName, propSchema] of Object.entries(schema.properties)) {
            obj[propName] = this.generateSampleFromSchema(propSchema);
          }
          return obj;
        }
        return {};
    }
  }

  getParamPlaceholder(p: ApiParameter): string {
    if (p.example !== undefined) return String(p.example);
    if (p.default !== undefined) return String(p.default);
    if (p.schema.default !== undefined) return String(p.schema.default);
    if (p.schema.format) return p.schema.format;
    return p.name;
  }

  getStatusGroup(statusCode: string): string {
    if (statusCode.startsWith('2')) return '2xx';
    if (statusCode.startsWith('3')) return '3xx';
    if (statusCode.startsWith('4')) return '4xx';
    if (statusCode.startsWith('5')) return '5xx';
    return 'default';
  }

  getStatusText(statusCode: string): string {
    const map: Record<string, string> = {
      '200': 'OK',
      '201': 'Created',
      '202': 'Accepted',
      '204': 'No Content',
      '400': 'Bad Request',
      '401': 'Unauthorized',
      '403': 'Forbidden',
      '404': 'Not Found',
      '409': 'Conflict',
      '422': 'Unprocessable Entity',
      '500': 'Internal Server Error'
    };
    return map[statusCode] || 'Response';
  }

  hasHeaders(headers: Record<string, any>): boolean {
    return headers ? Object.keys(headers).length > 0 : false;
  }

  getObjectKeysCount(obj: Record<string, any>): number {
    return obj ? Object.keys(obj).length : 0;
  }

  getHeaderEntries(headers: Record<string, any>): Array<{ name: string; schema: any }> {
    return Object.entries(headers).map(([name, schema]) => ({ name, schema }));
  }

  formatEnumValues(values?: unknown[]): string {
    if (!values || !Array.isArray(values)) return '';
    return values.map((v) => JSON.stringify(v)).join(', ');
  }
}
