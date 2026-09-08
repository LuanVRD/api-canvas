/**
 * Test fixtures for OpenAPI 3.x documents covering primitives, constraints,
 * reusable $ref, circular references, allOf combinations, and error scenarios.
 */

export const PRIMITIVES_AND_CONSTRAINTS_SPEC = {
  openapi: '3.0.3',
  info: {
    title: 'Primitives API',
    version: '1.0.0',
    description: 'API testing primitive schemas and constraints'
  },
  paths: {},
  components: {
    schemas: {
      User: {
        type: 'object',
        required: ['id', 'email', 'age'],
        properties: {
          id: {
            type: 'integer',
            format: 'int64',
            minimum: 1,
            maximum: 999999
          },
          email: {
            type: 'string',
            format: 'email',
            minLength: 5,
            maxLength: 100
          },
          age: {
            type: 'integer',
            minimum: 18,
            maximum: 120
          },
          score: {
            type: 'number',
            format: 'float',
            default: 0.0
          },
          status: {
            type: 'string',
            enum: ['ACTIVE', 'INACTIVE', 'PENDING'],
            default: 'PENDING'
          },
          isActive: {
            type: 'boolean',
            default: true
          },
          bio: {
            type: 'string',
            nullable: true,
            maxLength: 500
          },
          metadata: {
            type: 'object',
            properties: {
              createdAt: {
                type: 'string',
                format: 'date-time'
              },
              tags: {
                type: 'array',
                items: {
                  type: 'string'
                }
              }
            }
          }
        }
      }
    }
  }
};

export const REUSED_REFS_SPEC = {
  openapi: '3.0.3',
  info: {
    title: 'Store API',
    version: '2.1.0'
  },
  servers: [{ url: 'https://api.store.com/v1', description: 'Production' }],
  paths: {
    '/products': {
      get: {
        operationId: 'getProducts',
        summary: 'List products',
        tags: ['Products'],
        responses: {
          '200': {
            description: 'A list of products',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/Product'
                  }
                }
              }
            }
          }
        }
      },
      post: {
        operationId: 'createProduct',
        summary: 'Create product',
        tags: ['Products'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ProductCreate'
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Product created',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Product'
                }
              }
            }
          }
        }
      }
    },
    '/products/{id}': {
      get: {
        operationId: 'getProductById',
        summary: 'Get product by ID',
        tags: ['Products'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'integer',
              format: 'int64'
            }
          }
        ],
        responses: {
          '200': {
            description: 'Product details',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Product'
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      Category: {
        type: 'object',
        required: ['id', 'name'],
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' }
        }
      },
      Product: {
        type: 'object',
        required: ['id', 'name', 'price', 'category'],
        properties: {
          id: { type: 'integer', format: 'int64' },
          name: { type: 'string' },
          price: { type: 'number', minimum: 0 },
          category: {
            $ref: '#/components/schemas/Category'
          }
        }
      },
      ProductCreate: {
        type: 'object',
        required: ['name', 'price', 'categoryId'],
        properties: {
          name: { type: 'string' },
          price: { type: 'number' },
          categoryId: { type: 'integer' }
        }
      }
    }
  }
};

export const CIRCULAR_REF_SPEC = {
  openapi: '3.0.3',
  info: {
    title: 'Category Hierarchy API',
    version: '1.0.0'
  },
  paths: {},
  components: {
    schemas: {
      CategoryNode: {
        type: 'object',
        required: ['id', 'title'],
        properties: {
          id: { type: 'integer' },
          title: { type: 'string' },
          parent: {
            $ref: '#/components/schemas/CategoryNode'
          },
          subcategories: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/CategoryNode'
            }
          }
        }
      }
    }
  }
};

export const ALL_OF_SPEC = {
  openapi: '3.0.3',
  info: {
    title: 'AllOf Schema API',
    version: '1.0.0'
  },
  paths: {},
  components: {
    schemas: {
      Identifiable: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      Timestamped: {
        type: 'object',
        properties: {
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      Customer: {
        allOf: [
          { $ref: '#/components/schemas/Identifiable' },
          { $ref: '#/components/schemas/Timestamped' },
          {
            type: 'object',
            required: ['name', 'email'],
            properties: {
              name: { type: 'string' },
              email: { type: 'string', format: 'email' }
            }
          }
        ]
      }
    }
  }
};

export const INVALID_REF_SPEC = {
  openapi: '3.0.3',
  info: {
    title: 'Broken Ref API',
    version: '1.0.0'
  },
  paths: {},
  components: {
    schemas: {
      BrokenModel: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          target: {
            $ref: '#/components/schemas/MissingReference'
          }
        }
      }
    }
  }
};
