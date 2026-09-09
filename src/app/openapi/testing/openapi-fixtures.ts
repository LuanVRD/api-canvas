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

export const FULL_EXTENDED_SPEC = {
  openapi: '3.0.3',
  info: {
    title: 'Extended API',
    version: '1.5.0',
    description: 'A comprehensive Extended API with full parameters, headers, cookies, and responses'
  },
  servers: [
    { url: 'https://api.example.com/v1', description: 'Production' },
    { url: 'https://sandbox.example.com/v1', description: 'Sandbox' }
  ],
  paths: {
    '/pets': {
      parameters: [
        {
          name: 'X-Request-ID',
          in: 'header',
          required: true,
          description: 'Unique tracking identifier',
          schema: { type: 'string', format: 'uuid' }
        }
      ],
      get: {
        operationId: 'findPets',
        summary: 'Find all pets',
        description: 'Returns a paginated list of pets matching filter criteria',
        tags: ['Pets'],
        parameters: [
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 20 },
            description: 'Number of items to return'
          },
          {
            name: 'session_token',
            in: 'cookie',
            required: false,
            schema: { type: 'string' },
            description: 'Client session cookie'
          }
        ],
        responses: {
          '200': {
            description: 'A list of pets',
            headers: {
              'X-Total-Count': {
                description: 'Total number of items available',
                schema: { type: 'integer' }
              }
            },
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/Pet'
                  }
                }
              }
            }
          },
          'default': {
            description: 'Unexpected error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error'
                }
              }
            }
          }
        }
      },
      post: {
        operationId: 'addPet',
        summary: 'Add a new pet',
        description: 'Creates a new pet entry in the store',
        tags: ['Pets'],
        deprecated: true,
        requestBody: {
          description: 'Pet creation payload',
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/NewPet'
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Pet created successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Pet'
                }
              }
            }
          },
          '400': {
            description: 'Invalid input provided'
          }
        }
      }
    },
    '/pets/{id}': {
      get: {
        operationId: 'findPetById',
        summary: 'Find pet by ID',
        tags: ['Pets'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer', format: 'int64' }
          }
        ],
        responses: {
          '200': {
            description: 'Pet found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Pet'
                }
              }
            }
          },
          '404': {
            description: 'Pet not found'
          }
        }
      },
      delete: {
        operationId: 'deletePet',
        summary: 'Deletes a pet',
        tags: ['Pets'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer', format: 'int64' }
          }
        ],
        responses: {
          '204': {
            description: 'Pet deleted'
          }
        }
      }
    }
  },
  components: {
    schemas: {
      Pet: {
        type: 'object',
        required: ['id', 'name'],
        properties: {
          id: { type: 'integer', format: 'int64' },
          name: { type: 'string' },
          tag: { type: 'string' }
        }
      },
      NewPet: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
          tag: { type: 'string' }
        }
      },
      Error: {
        type: 'object',
        required: ['code', 'message'],
        properties: {
          code: { type: 'integer', format: 'int32' },
          message: { type: 'string' }
        }
      }
    }
  }
};

export const SWAGGER_2_SPEC = {
  swagger: '2.0',
  info: {
    title: 'Legacy Swagger API',
    version: '1.0.0',
    description: 'Swagger 2.0 specification with body parameters and direct response schema'
  },
  host: 'legacy.api.com',
  basePath: '/v2',
  schemes: ['https'],
  paths: {
    '/users': {
      post: {
        operationId: 'createUser',
        summary: 'Create user',
        tags: ['Users'],
        parameters: [
          {
            name: 'Authorization',
            in: 'header',
            required: true,
            type: 'string'
          },
          {
            name: 'user',
            in: 'body',
            required: true,
            schema: {
              $ref: '#/definitions/User'
            }
          }
        ],
        responses: {
          '200': {
            description: 'Successful operation',
            schema: {
              $ref: '#/definitions/User'
            }
          }
        }
      }
    }
  },
  definitions: {
    User: {
      type: 'object',
      required: ['username', 'email'],
      properties: {
        username: { type: 'string' },
        email: { type: 'string' }
      }
    }
  }
};

export const UNTAGGED_API_SPEC = {
  openapi: '3.0.3',
  info: {
    title: 'Untagged Routes API',
    version: '3.0.0'
  },
  paths: {
    '/orders/{orderId}/items': {
      get: {
        summary: 'Get order items',
        responses: {
          '200': {
            description: 'List of items'
          }
        }
      }
    },
    '/analytics/reports': {
      get: {
        summary: 'Get analytics reports',
        responses: {
          '200': {
            description: 'Report data'
          }
        }
      }
    }
  }
};
