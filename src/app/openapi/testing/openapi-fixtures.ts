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

/**
 * Full-featured Order Management API spec with complete CRUD,
 * parameterized endpoints (orderId), status PATCH, custom action POST,
 * and enveloped responses.
 */
export const ORDER_MANAGEMENT_SPEC = {
  openapi: '3.0.3',
  info: {
    title: 'Order Management API',
    version: '2.0.0',
    description: 'Comprehensive Order API for Dashboard regression testing'
  },
  servers: [{ url: 'https://api.orders.example.com/v2', description: 'Production' }],
  paths: {
    '/orders': {
      get: {
        operationId: 'listOrders',
        summary: 'List all orders',
        tags: ['Orders'],
        parameters: [
          { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 } },
          { name: 'pageSize', in: 'query', required: false, schema: { type: 'integer', default: 10 } },
          { name: 'search', in: 'query', required: false, schema: { type: 'string' } },
          { name: 'status', in: 'query', required: false, schema: { type: 'string', enum: ['PENDING', 'PROCESSING', 'PAID', 'SHIPPED', 'CANCELLED'] } }
        ],
        responses: {
          '200': {
            description: 'Enveloped list of orders',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Order' }
                    },
                    total: { type: 'integer' },
                    page: { type: 'integer' },
                    limit: { type: 'integer' }
                  }
                }
              }
            }
          }
        }
      },
      post: {
        operationId: 'createOrder',
        summary: 'Create a new order',
        tags: ['Orders'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/OrderCreateInput' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Order created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Order' }
              }
            }
          }
        }
      }
    },
    '/orders/{orderId}': {
      get: {
        operationId: 'getOrderById',
        summary: 'Get order details',
        tags: ['Orders'],
        parameters: [
          { name: 'orderId', in: 'path', required: true, schema: { type: 'string' }, description: 'Unique Order Identifier' }
        ],
        responses: {
          '200': {
            description: 'Order details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Order' }
              }
            }
          },
          '404': { description: 'Order not found' }
        }
      },
      put: {
        operationId: 'updateOrder',
        summary: 'Update order',
        tags: ['Orders'],
        parameters: [
          { name: 'orderId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/OrderUpdateInput' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Order updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Order' }
              }
            }
          }
        }
      },
      delete: {
        operationId: 'deleteOrder',
        summary: 'Delete order',
        tags: ['Orders'],
        parameters: [
          { name: 'orderId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '204': { description: 'Order deleted successfully' }
        }
      }
    },
    '/orders/{orderId}/status': {
      patch: {
        operationId: 'updateOrderStatus',
        summary: 'Update order status',
        tags: ['Orders'],
        parameters: [
          { name: 'orderId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: {
                    type: 'string',
                    enum: ['PENDING', 'PROCESSING', 'PAID', 'SHIPPED', 'CANCELLED']
                  },
                  reason: { type: 'string' },
                  notifyCustomer: { type: 'boolean', default: true }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Status updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Order' }
              }
            }
          }
        }
      }
    },
    '/orders/{orderId}/cancel': {
      post: {
        operationId: 'cancelOrder',
        summary: 'Cancel order immediately',
        tags: ['Orders'],
        parameters: [
          { name: 'orderId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  cancellationReason: { type: 'string' },
                  refundAmount: { type: 'number' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Order cancelled successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    orderId: { type: 'string' },
                    status: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/orders/{orderId}/dispatch': {
      post: {
        operationId: 'dispatchOrder',
        summary: 'Dispatch order for shipping',
        tags: ['Orders'],
        parameters: [
          { name: 'orderId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  carrier: { type: 'string' },
                  trackingCode: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Order dispatched',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Order' }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      Order: {
        type: 'object',
        required: ['orderId', 'customerName', 'totalAmount', 'status'],
        properties: {
          orderId: { type: 'string', description: 'Order Code' },
          customerName: { type: 'string' },
          customerEmail: { type: 'string', format: 'email' },
          totalAmount: { type: 'number', minimum: 0 },
          status: { type: 'string', enum: ['PENDING', 'PROCESSING', 'PAID', 'SHIPPED', 'CANCELLED'] },
          itemsCount: { type: 'integer', minimum: 1 },
          priority: { type: 'string', enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'], default: 'NORMAL' },
          createdAt: { type: 'string', format: 'date-time' },
          notes: { type: 'string' }
        }
      },
      OrderCreateInput: {
        type: 'object',
        required: ['customerName', 'customerEmail', 'totalAmount'],
        properties: {
          customerName: { type: 'string', minLength: 2 },
          customerEmail: { type: 'string', format: 'email' },
          totalAmount: { type: 'number', minimum: 0 },
          priority: { type: 'string', enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'], default: 'NORMAL' },
          notes: { type: 'string' }
        }
      },
      OrderUpdateInput: {
        type: 'object',
        properties: {
          customerName: { type: 'string' },
          customerEmail: { type: 'string', format: 'email' },
          priority: { type: 'string', enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'] },
          notes: { type: 'string' }
        }
      }
    }
  }
};

/**
 * Article spec using non-id slug path parameter (/articles/{slug}).
 */
export const ARTICLES_SLUG_SPEC = {
  openapi: '3.0.3',
  info: {
    title: 'Content Publishing API',
    version: '1.0.0'
  },
  paths: {
    '/articles': {
      get: {
        operationId: 'listArticles',
        summary: 'List articles',
        tags: ['Articles'],
        responses: {
          '200': {
            description: 'Articles list',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Article' }
                }
              }
            }
          }
        }
      },
      post: {
        operationId: 'createArticle',
        summary: 'Create article',
        tags: ['Articles'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ArticleInput' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Created',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Article' } }
            }
          }
        }
      }
    },
    '/articles/{slug}': {
      get: {
        operationId: 'getArticleBySlug',
        summary: 'Get article by slug',
        tags: ['Articles'],
        parameters: [
          { name: 'slug', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '200': {
            description: 'Article details',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Article' } }
            }
          }
        }
      },
      delete: {
        operationId: 'deleteArticle',
        summary: 'Delete article by slug',
        tags: ['Articles'],
        parameters: [
          { name: 'slug', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '204': { description: 'Article deleted' }
        }
      }
    },
    '/articles/{slug}/status': {
      patch: {
        operationId: 'changeArticleStatus',
        summary: 'Change article publishing status',
        tags: ['Articles'],
        parameters: [
          { name: 'slug', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'] }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Status updated',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Article' } }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      Article: {
        type: 'object',
        required: ['slug', 'title', 'status'],
        properties: {
          slug: { type: 'string' },
          title: { type: 'string' },
          body: { type: 'string' },
          status: { type: 'string', enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'] },
          views: { type: 'integer' }
        }
      },
      ArticleInput: {
        type: 'object',
        required: ['title', 'slug'],
        properties: {
          title: { type: 'string' },
          slug: { type: 'string' },
          body: { type: 'string' }
        }
      }
    }
  }
};

/**
 * Reusable mock response payloads for simple, enveloped, and paginated patterns.
 */
export const FIXTURE_RESPONSES = {
  simpleArray: [
    { orderId: 'ORD-101', customerName: 'Alice Silva', totalAmount: 150.5, status: 'PAID', priority: 'HIGH', itemsCount: 3, createdAt: '2026-09-10T10:00:00Z' },
    { orderId: 'ORD-102', customerName: 'Bruno Costa', totalAmount: 89.0, status: 'PENDING', priority: 'NORMAL', itemsCount: 1, createdAt: '2026-09-11T12:30:00Z' },
    { orderId: 'ORD-103', customerName: 'Carla Souza', totalAmount: 420.0, status: 'SHIPPED', priority: 'URGENT', itemsCount: 5, createdAt: '2026-09-12T08:15:00Z' }
  ],
  envelopedStandard: {
    data: [
      { orderId: 'ORD-201', customerName: 'Daniel Dias', totalAmount: 95.0, status: 'PAID', priority: 'NORMAL', itemsCount: 2, createdAt: '2026-09-10T14:00:00Z' },
      { orderId: 'ORD-202', customerName: 'Eduarda Lima', totalAmount: 310.0, status: 'PROCESSING', priority: 'HIGH', itemsCount: 4, createdAt: '2026-09-11T16:00:00Z' }
    ],
    total: 42,
    page: 1,
    limit: 10
  },
  envelopedNested: {
    result: {
      items: [
        { orderId: 'ORD-301', customerName: 'Fabio Ramos', totalAmount: 210.0, status: 'PAID', priority: 'LOW', itemsCount: 2 },
        { orderId: 'ORD-302', customerName: 'Gisele Melo', totalAmount: 540.0, status: 'CANCELLED', priority: 'NORMAL', itemsCount: 6 }
      ],
      pagination: {
        totalCount: 128,
        currentPage: 2,
        perPage: 10
      }
    }
  },
  paginatedServerMeta: {
    content: [
      { orderId: 'ORD-401', customerName: 'Helena Paz', totalAmount: 180.0, status: 'PAID', priority: 'HIGH' }
    ],
    totalElements: 55,
    pageNumber: 0,
    pageSize: 10
  },
  singleOrderDetails: {
    orderId: 'ORD-101',
    customerName: 'Alice Silva',
    customerEmail: 'alice@example.com',
    totalAmount: 150.5,
    status: 'PAID',
    priority: 'HIGH',
    itemsCount: 3,
    createdAt: '2026-09-10T10:00:00Z',
    notes: 'Entregar no período da manhã'
  },
  createdOrder: {
    orderId: 'ORD-500',
    customerName: 'Novo Cliente',
    customerEmail: 'novo@example.com',
    totalAmount: 99.9,
    status: 'PENDING',
    priority: 'NORMAL',
    itemsCount: 1,
    createdAt: '2026-09-12T10:00:00Z'
  },
  patchedStatusOrder: {
    orderId: 'ORD-101',
    customerName: 'Alice Silva',
    customerEmail: 'alice@example.com',
    totalAmount: 150.5,
    status: 'SHIPPED',
    priority: 'HIGH',
    itemsCount: 3
  },
  cancelResult: {
    success: true,
    orderId: 'ORD-101',
    status: 'CANCELLED'
  },
  emptyList: {
    data: [],
    total: 0
  }
};

