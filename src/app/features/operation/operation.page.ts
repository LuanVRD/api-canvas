import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ApiSessionService } from '../../core/services/api-session.service';
import { ApiOperation, ApiRequestBody } from '../../core/models/api-operation.model';
import { ApiParameter, ParameterLocation } from '../../core/models/api-parameter.model';
import { ApiResponse } from '../../core/models/api-response.model';
import { ApiSchema } from '../../core/models/api-schema.model';
import { HttpBadgeComponent } from '../../shared/components/http-badge/http-badge.component';
import { SchemaViewerComponent } from '../../shared/components/schema-viewer/schema-viewer.component';

@Component({
  selector: 'app-operation-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    HttpBadgeComponent,
    SchemaViewerComponent
  ],
  template: `
    <div class="operation-page-layout">
      <!-- Operation Topbar Navigation -->
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

      <!-- Operation Content Area -->
      <main class="operation-content" role="main">
        @if (currentOperation(); as op) {
          <article class="operation-container">
            <!-- Operation Main Header Banner -->
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

                <button
                  type="button"
                  class="copy-path-btn"
                  (click)="onCopyPath(op.path)"
                  [title]="copiedPath() ? 'Copied!' : 'Copy path'"
                >
                  <mat-icon class="copy-icon">{{ copiedPath() ? 'check' : 'content_copy' }}</mat-icon>
                  <span>{{ copiedPath() ? 'Copied' : 'Copy' }}</span>
                </button>
              </div>

              <!-- Summary & Operation ID -->
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

              <!-- Full Description if available -->
              @if (op.description && op.description !== op.summary) {
                <div class="op-description-box">
                  <p class="desc-text">{{ op.description }}</p>
                </div>
              }
            </section>

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
                      <ng-container *ngTemplateOutlet="paramTable; context: { $implicit: pathParams() }" />
                    </div>
                  }

                  <!-- Query Parameters -->
                  @if (queryParams().length > 0) {
                    <div class="param-group">
                      <div class="param-group-header">
                        <span class="group-title">Query Parameters</span>
                        <span class="group-count font-mono">{{ queryParams().length }}</span>
                      </div>
                      <ng-container *ngTemplateOutlet="paramTable; context: { $implicit: queryParams() }" />
                    </div>
                  }

                  <!-- Header Parameters -->
                  @if (headerParams().length > 0) {
                    <div class="param-group">
                      <div class="param-group-header">
                        <span class="group-title">Header Parameters</span>
                        <span class="group-count font-mono">{{ headerParams().length }}</span>
                      </div>
                      <ng-container *ngTemplateOutlet="paramTable; context: { $implicit: headerParams() }" />
                    </div>
                  }

                  <!-- Cookie Parameters -->
                  @if (cookieParams().length > 0) {
                    <div class="param-group">
                      <div class="param-group-header">
                        <span class="group-title">Cookie Parameters</span>
                        <span class="group-count font-mono">{{ cookieParams().length }}</span>
                      </div>
                      <ng-container *ngTemplateOutlet="paramTable; context: { $implicit: cookieParams() }" />
                    </div>
                  }
                </div>
              } @else {
                <div class="empty-section-card">
                  <span>No parameters required for this operation.</span>
                </div>
              }
            </section>

            <!-- Reusable Parameter Table Template -->
            <ng-template #paramTable let-params>
              <div class="param-table" role="table">
                <div class="param-row param-header-row" role="row">
                  <span class="col-param-name" role="columnheader">Name</span>
                  <span class="col-param-type" role="columnheader">Type / Format</span>
                  <span class="col-param-details" role="columnheader">Description / Constraints</span>
                </div>

                @for (p of params; track p.name) {
                  <div class="param-row" role="row">
                    <div class="col-param-name" role="cell">
                      <span class="param-name font-mono">{{ p.name }}</span>
                      @if (p.required) {
                        <span class="badge-required">required</span>
                      } @else {
                        <span class="badge-optional">optional</span>
                      }
                      @if (p.deprecated) {
                        <span class="badge-deprecated">deprecated</span>
                      }
                    </div>

                    <div class="col-param-type font-mono" role="cell">
                      <span class="type-text">{{ p.schema?.type || 'string' }}</span>
                      @if (p.schema?.format) {
                        <span class="format-text">&lt;{{ p.schema.format }}&gt;</span>
                      }
                      @if (p.schema?.nullable) {
                        <span class="nullable-text">nullable</span>
                      }
                    </div>

                    <div class="col-param-details" role="cell">
                      @if (p.description) {
                        <div class="param-desc">{{ p.description }}</div>
                      }

                      <div class="param-constraints">
                        @if (p.schema?.enum && p.schema.enum.length > 0) {
                          <div class="constraint-item">
                            <span class="c-lbl">Enum:</span>
                            <span class="c-val font-mono">[{{ formatEnumValues(p.schema.enum) }}]</span>
                          </div>
                        }
                        @if (p.default !== undefined || p.schema?.default !== undefined) {
                          <div class="constraint-item">
                            <span class="c-lbl">Default:</span>
                            <span class="c-val font-mono">{{ (p.default !== undefined ? p.default : p.schema.default) | json }}</span>
                          </div>
                        }
                        @if (p.example !== undefined || p.schema?.example !== undefined) {
                          <div class="constraint-item">
                            <span class="c-lbl">Example:</span>
                            <span class="c-val font-mono">{{ (p.example !== undefined ? p.example : p.schema.example) | json }}</span>
                          </div>
                        }
                        @if (p.schema?.pattern) {
                          <div class="constraint-item">
                            <span class="c-lbl">Pattern:</span>
                            <span class="c-val font-mono">/{{ p.schema.pattern }}/</span>
                          </div>
                        }
                        @if (p.schema?.minimum !== undefined || p.schema?.maximum !== undefined) {
                          <div class="constraint-item">
                            <span class="c-lbl">Range:</span>
                            <span class="c-val font-mono">
                              {{ p.schema.minimum !== undefined ? p.schema.minimum : '-∞' }} ..
                              {{ p.schema.maximum !== undefined ? p.schema.maximum : '+∞' }}
                            </span>
                          </div>
                        }
                      </div>
                    </div>
                  </div>
                }
              </div>
            </ng-template>

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
                  </div>
                </div>

                @if (rb.description) {
                  <p class="section-description">{{ rb.description }}</p>
                }

                <div class="schema-card">
                  <app-schema-viewer [schema]="rb.schema" />
                </div>
              </section>
            }

            <!-- Responses Section -->
            <section class="technical-section" aria-labelledby="responses-heading">
              <div class="section-title-bar">
                <div class="title-with-icon">
                  <mat-icon class="sec-icon">output</mat-icon>
                  <h2 id="responses-heading" class="section-title">Responses</h2>
                </div>
                <span class="count-pill font-mono">{{ op.responses.length }}</span>
              </div>

              @if (op.responses.length > 0) {
                <div class="responses-list">
                  @for (resp of op.responses; track resp.statusCode) {
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

                      <!-- Response Headers if any -->
                      @if (resp.headers && hasHeaders(resp.headers)) {
                        <div class="response-headers-section">
                          <div class="rh-title">Response Headers:</div>
                          <div class="rh-list">
                            @for (headerEntry of getHeaderEntries(resp.headers); track headerEntry.name) {
                              <div class="rh-item">
                                <span class="rh-name font-mono">{{ headerEntry.name }}:</span>
                                <span class="rh-type font-mono">{{ headerEntry.schema.type }}</span>
                                @if (headerEntry.schema.description) {
                                  <span class="rh-desc">{{ headerEntry.schema.description }}</span>
                                }
                              </div>
                            }
                          </div>
                        </div>
                      }

                      <!-- Response Body Schema -->
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
                  <span>No responses documented for this operation.</span>
                </div>
              }
            </section>
          </article>
        } @else {
          <!-- Operation Not Found / Not Loaded State -->
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
    .operation-page-layout {
      display: flex;
      flex-direction: column;
      height: 100vh;
      background: var(--canvas-bg);
      color: var(--canvas-text-primary);
      overflow: hidden;
    }

    .operation-topbar {
      height: 48px;
      min-height: 48px;
      background: var(--canvas-surface);
      border-bottom: 1px solid var(--canvas-border);
      padding: 0 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      z-index: 10;

      .topbar-left {
        display: flex;
        align-items: center;
        gap: 10px;
        overflow: hidden;
        min-width: 0;

        .back-btn {
          height: 28px;
          padding: 0 8px;
          font-size: 12px;
          font-weight: 500;
          color: var(--canvas-text-secondary);
          background: var(--canvas-surface-elevated);
          border: 1px solid var(--canvas-border);
          border-radius: var(--radius-sm);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: all 0.12s ease;
          flex-shrink: 0;

          &:hover {
            color: var(--canvas-text-primary);
            border-color: var(--canvas-text-muted);
            background: #282e37;
          }

          .btn-icon {
            font-size: 15px;
            width: 15px;
            height: 15px;
          }
        }

        .nav-separator {
          color: var(--canvas-text-muted);
          font-size: 12px;
        }

        .resource-breadcrumb {
          font-size: 12px;
          color: var(--canvas-text-secondary);
          white-space: nowrap;
        }

        .current-op-breadcrumb {
          font-size: 12px;
          font-weight: 600;
          color: var(--canvas-text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }

      .topbar-right {
        display: flex;
        align-items: center;
        flex-shrink: 0;

        .api-tag {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;

          .api-name {
            color: var(--canvas-text-muted);
            font-weight: 500;
          }

          .api-ver {
            font-size: 11px;
            color: var(--canvas-text-secondary);
            background: var(--canvas-surface-elevated);
            padding: 1px 5px;
            border-radius: var(--radius-sm);
            border: 1px solid var(--canvas-border-subtle);
          }
        }
      }
    }

    .operation-content {
      flex: 1;
      overflow-y: auto;
      padding: 24px 32px 48px;
    }

    .operation-container {
      max-width: 1040px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 28px;
    }

    /* Operation Header Banner */
    .op-header-banner {
      display: flex;
      flex-direction: column;
      gap: 12px;
      border-bottom: 1px solid var(--canvas-border-subtle);
      padding-bottom: 20px;

      .method-path-row {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;

        .op-path-text {
          font-size: 17px;
          font-weight: 600;
          color: var(--canvas-text-primary);
          word-break: break-all;
        }

        .badge-group {
          display: flex;
          align-items: center;
          gap: 6px;

          .type-badge {
            font-size: 10px;
            text-transform: uppercase;
            font-family: var(--font-mono);
            font-weight: 600;
            padding: 2px 6px;
            border-radius: var(--radius-sm);
            letter-spacing: 0.5px;
            background: var(--canvas-surface-elevated);
            border: 1px solid var(--canvas-border);
            color: var(--canvas-text-secondary);

            &[data-type="action"] {
              color: #e3b341;
              background: rgba(227, 179, 65, 0.1);
              border-color: rgba(227, 179, 65, 0.3);
            }

            &[data-type="unknown"] {
              color: #a371f7;
              background: rgba(163, 113, 247, 0.1);
              border-color: rgba(163, 113, 247, 0.3);
            }
          }

          .deprecated-tag {
            font-size: 10px;
            font-family: var(--font-mono);
            font-weight: 700;
            color: var(--color-danger);
            background: rgba(218, 54, 51, 0.12);
            border: 1px solid rgba(218, 54, 51, 0.3);
            padding: 2px 6px;
            border-radius: var(--radius-sm);
          }
        }

        .copy-path-btn {
          margin-left: auto;
          height: 24px;
          padding: 0 8px;
          font-size: 11px;
          background: var(--canvas-surface);
          border: 1px solid var(--canvas-border);
          border-radius: var(--radius-sm);
          color: var(--canvas-text-secondary);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: all 0.12s ease;

          &:hover {
            color: var(--canvas-text-primary);
            background: var(--canvas-surface-elevated);
          }

          .copy-icon {
            font-size: 13px;
            width: 13px;
            height: 13px;
          }
        }
      }

      .op-identity-block {
        display: flex;
        flex-direction: column;
        gap: 6px;

        .op-summary-heading {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
          color: var(--canvas-text-primary);
          letter-spacing: -0.2px;

          &.untitled {
            font-size: 15px;
            color: var(--canvas-text-secondary);
          }
        }

        .op-meta-info {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;

          .meta-item {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;

            .meta-label {
              color: var(--canvas-text-muted);
              font-weight: 500;
            }

            .meta-value {
              font-size: 12px;
              color: var(--canvas-text-link);
              background: var(--canvas-surface-elevated);
              padding: 1px 6px;
              border-radius: var(--radius-sm);
              border: 1px solid var(--canvas-border-subtle);
            }

            .tags-list {
              display: flex;
              gap: 4px;

              .tag-pill {
                font-size: 11px;
                color: var(--canvas-text-secondary);
                background: var(--canvas-surface-elevated);
                padding: 1px 6px;
                border-radius: var(--radius-sm);
                border: 1px solid var(--canvas-border-subtle);
              }
            }
          }
        }
      }

      .op-description-box {
        margin-top: 4px;
        background: var(--canvas-surface);
        border: 1px solid var(--canvas-border-subtle);
        border-radius: var(--radius-sm);
        padding: 10px 14px;

        .desc-text {
          margin: 0;
          font-size: 13px;
          line-height: 1.6;
          color: var(--canvas-text-secondary);
        }
      }
    }

    /* Technical Section Base */
    .technical-section {
      display: flex;
      flex-direction: column;
      gap: 12px;

      .section-title-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-bottom: 6px;
        border-bottom: 1px solid var(--canvas-border);

        .title-with-icon {
          display: flex;
          align-items: center;
          gap: 8px;

          .sec-icon {
            font-size: 18px;
            width: 18px;
            height: 18px;
            color: var(--canvas-text-muted);
          }

          .section-title {
            margin: 0;
            font-size: 14px;
            font-weight: 700;
            color: var(--canvas-text-primary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
        }

        .count-pill {
          font-size: 11px;
          color: var(--canvas-text-muted);
          background: var(--canvas-surface-elevated);
          padding: 1px 6px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--canvas-border-subtle);
        }

        .section-meta-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }
      }

      .section-description {
        margin: 0;
        font-size: 12px;
        color: var(--canvas-text-secondary);
        line-height: 1.5;
      }
    }

    /* Parameter Groups & Tables */
    .param-groups {
      display: flex;
      flex-direction: column;
      gap: 16px;

      .param-group {
        display: flex;
        flex-direction: column;
        gap: 6px;

        .param-group-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 600;
          color: var(--canvas-text-secondary);

          .group-title {
            color: var(--canvas-text-muted);
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.5px;
          }

          .group-count {
            font-size: 11px;
            color: var(--canvas-text-muted);
          }
        }
      }
    }

    .param-table {
      display: flex;
      flex-direction: column;
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-sm);
      background: var(--canvas-surface);
      overflow: hidden;

      .param-row {
        display: grid;
        grid-template-columns: 200px 140px 1fr;
        padding: 8px 12px;
        border-bottom: 1px solid var(--canvas-border-subtle);
        gap: 12px;
        align-items: flex-start;
        font-size: 13px;

        &:last-child {
          border-bottom: none;
        }

        &:hover:not(.param-header-row) {
          background: rgba(255, 255, 255, 0.015);
        }

        &.param-header-row {
          background: var(--canvas-surface-elevated);
          border-bottom: 1px solid var(--canvas-border);
          font-size: 11px;
          font-weight: 700;
          color: var(--canvas-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
      }
    }

    .col-param-name {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;

      .param-name {
        font-size: 12px;
        font-weight: 600;
        color: var(--canvas-text-primary);
        word-break: break-all;
      }
    }

    .col-param-type {
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: 12px;

      .type-text {
        color: var(--canvas-text-link);
      }

      .format-text, .nullable-text {
        font-size: 11px;
        color: var(--canvas-text-muted);
      }
    }

    .col-param-details {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;

      .param-desc {
        font-size: 12px;
        color: var(--canvas-text-secondary);
        line-height: 1.4;
      }

      .param-constraints {
        display: flex;
        flex-wrap: wrap;
        gap: 8px 12px;
      }
    }

    .constraint-item {
      display: inline-flex;
      align-items: baseline;
      gap: 4px;
      font-size: 11px;

      .c-lbl {
        color: var(--canvas-text-muted);
        font-weight: 600;
      }

      .c-val {
        color: var(--canvas-text-secondary);
        background: var(--canvas-bg);
        padding: 1px 4px;
        border-radius: var(--radius-sm);
        border: 1px solid var(--canvas-border-subtle);
        word-break: break-all;
      }
    }

    /* Badges */
    .badge-required {
      font-size: 9px;
      font-family: var(--font-mono);
      text-transform: uppercase;
      font-weight: 700;
      color: var(--color-danger);
      background: rgba(218, 54, 51, 0.12);
      border: 1px solid rgba(218, 54, 51, 0.3);
      padding: 1px 4px;
      border-radius: var(--radius-sm);
    }

    .badge-optional {
      font-size: 9px;
      font-family: var(--font-mono);
      text-transform: uppercase;
      color: var(--canvas-text-muted);
    }

    .badge-deprecated {
      font-size: 9px;
      font-family: var(--font-mono);
      text-transform: uppercase;
      color: var(--color-danger);
    }

    .content-type-pill {
      font-size: 11px;
      color: var(--canvas-text-secondary);
      background: var(--canvas-surface-elevated);
      padding: 1px 6px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--canvas-border-subtle);
    }

    /* Responses */
    .responses-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .response-card {
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-sm);
      background: var(--canvas-surface);
      overflow: hidden;

      .response-card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px;
        background: var(--canvas-surface-elevated);
        border-bottom: 1px solid var(--canvas-border-subtle);
        gap: 12px;

        .status-code-block {
          display: flex;
          align-items: center;
          gap: 10px;

          .status-code-badge {
            font-size: 12px;
            font-weight: 700;
            padding: 2px 8px;
            border-radius: var(--radius-sm);
            border: 1px solid transparent;

            &[data-status-group="2xx"] {
              background: var(--http-get-bg);
              color: var(--http-get);
              border-color: var(--http-get-border);
            }

            &[data-status-group="3xx"] {
              background: var(--http-post-bg);
              color: var(--http-post);
              border-color: var(--http-post-border);
            }

            &[data-status-group="4xx"] {
              background: var(--http-put-bg);
              color: var(--http-put);
              border-color: var(--http-put-border);
            }

            &[data-status-group="5xx"] {
              background: var(--http-delete-bg);
              color: var(--http-delete);
              border-color: var(--http-delete-border);
            }

            &[data-status-group="default"] {
              background: var(--canvas-bg);
              color: var(--canvas-text-secondary);
              border-color: var(--canvas-border);
            }
          }

          .response-description {
            font-size: 13px;
            font-weight: 500;
            color: var(--canvas-text-primary);
          }
        }
      }

      .response-headers-section {
        padding: 8px 14px;
        border-bottom: 1px solid var(--canvas-border-subtle);
        background: rgba(0, 0, 0, 0.15);

        .rh-title {
          font-size: 11px;
          font-weight: 600;
          color: var(--canvas-text-muted);
          margin-bottom: 4px;
        }

        .rh-list {
          display: flex;
          flex-direction: column;
          gap: 4px;

          .rh-item {
            font-size: 12px;
            display: flex;
            align-items: center;
            gap: 8px;

            .rh-name {
              color: var(--canvas-text-primary);
            }

            .rh-type {
              color: var(--canvas-text-link);
              font-size: 11px;
            }

            .rh-desc {
              color: var(--canvas-text-secondary);
              font-size: 11px;
            }
          }
        }
      }

      .response-body-schema {
        padding: 12px 14px;
      }

      .no-body-note {
        padding: 10px 14px;
        font-size: 12px;
        color: var(--canvas-text-muted);
        font-style: italic;
      }
    }

    .schema-card {
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-sm);
      background: var(--canvas-surface);
      padding: 14px;
    }

    .empty-section-card {
      padding: 14px;
      background: var(--canvas-surface);
      border: 1px solid var(--canvas-border-subtle);
      border-radius: var(--radius-sm);
      color: var(--canvas-text-muted);
      font-size: 12px;
      font-style: italic;
    }

    /* Not Found State */
    .not-found-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 60vh;
      text-align: center;
      color: var(--canvas-text-muted);

      .not-found-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        margin-bottom: 12px;
        color: var(--color-danger);
      }

      h2 {
        margin: 0 0 8px;
        font-size: 18px;
        font-weight: 600;
        color: var(--canvas-text-primary);
      }

      p {
        margin: 0 0 20px;
        font-size: 13px;
        max-width: 420px;
        line-height: 1.5;

        code {
          color: var(--canvas-text-link);
          background: var(--canvas-surface-elevated);
          padding: 2px 6px;
          border-radius: var(--radius-sm);
        }
      }

      .back-link-btn {
        height: 32px;
        padding: 0 14px;
        background: var(--canvas-surface-elevated);
        border: 1px solid var(--canvas-border);
        border-radius: var(--radius-sm);
        color: var(--canvas-text-primary);
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        transition: all 0.12s ease;

        &:hover {
          border-color: var(--canvas-text-muted);
          background: #282e37;
        }

        mat-icon {
          font-size: 16px;
          width: 16px;
          height: 16px;
        }
      }
    }

    @media (max-width: 768px) {
      .operation-content {
        padding: 16px;
      }
      .param-table {
        .param-row {
          grid-template-columns: 1fr;
          gap: 6px;
        }
        .param-header-row {
          display: none;
        }
      }
    }
  `]
})
export class OperationPage implements OnInit {
  private readonly sessionService = inject(ApiSessionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly operationId = input<string | undefined>(undefined);

  readonly routeOperationId = signal<string | null>(null);
  readonly copiedPath = signal<boolean>(false);

  readonly apiTitle = this.sessionService.apiTitle;
  readonly apiVersion = this.sessionService.apiVersion;

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

    // Normalizes requestBody to ApiRequestBody format
    const rb = op.requestBody;
    if ('schema' in rb) {
      return rb as ApiRequestBody;
    }
    return {
      schema: rb as ApiSchema,
      contentType: 'application/json'
    };
  });

  ngOnInit(): void {
    const paramId = this.route.snapshot.paramMap.get('operationId');
    if (paramId) {
      this.routeOperationId.set(paramId);
    }
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

  hasHeaders(headers: Record<string, ApiSchema>): boolean {
    return Object.keys(headers).length > 0;
  }

  getHeaderEntries(headers: Record<string, ApiSchema>): Array<{ name: string; schema: ApiSchema }> {
    return Object.entries(headers).map(([name, schema]) => ({ name, schema }));
  }

  formatEnumValues(values: unknown[]): string {
    return values.map((v) => JSON.stringify(v)).join(', ');
  }
}
