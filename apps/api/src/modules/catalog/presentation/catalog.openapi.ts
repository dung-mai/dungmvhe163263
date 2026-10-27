export const productSchema = {
  type: 'object' as const,
  required: ['id', 'slug', 'name', 'price', 'currency', 'available'],
  properties: {
    id: { type: 'string', example: 'samsung-galaxy-s23' },
    slug: { type: 'string', example: 'samsung-galaxy-s23' },
    name: { type: 'string', example: 'Samsung Galaxy S23 256GB' },
    description: { type: 'string' },
    brand: { type: 'string' },
    category: { type: 'string' },
    image: { type: 'string', example: '/images/products/galaxy.webp' },
    images: { type: 'array', items: { type: 'string' } },
    price: {
      type: 'string',
      pattern: '^\\d+$',
      example: '14990000',
      description: 'Integer VND string, exact precision',
    },
    originalPrice: { type: 'string', nullable: true, example: '18990000' },
    currency: { type: 'string', enum: ['VND'] },
    rating: { type: 'number', example: 4.8 },
    reviewCount: { type: 'integer', example: 178 },
    badge: { type: 'string', nullable: true },
    available: { type: 'boolean' },
  },
};
export const categorySchema = {
  type: 'object' as const,
  properties: { slug: { type: 'string' }, name: { type: 'string' }, image: { type: 'string' } },
};
export const listSchema = {
  type: 'object' as const,
  properties: {
    items: { type: 'array', items: productSchema },
    total: { type: 'integer' },
    page: { type: 'integer' },
    limit: { type: 'integer' },
  },
};
