const { createCRMClient } = require('../lib/crm-client');

module.exports = {
  name: 'search_customer',
  description: '按姓名、公司名或电话模糊搜索客户',

  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: '搜索关键词（客户姓名、公司名或电话）',
        minLength: 1
      },
      type: {
        type: 'string',
        enum: ['customer', 'lead'],
        default: 'customer',
        description: '搜索类型：customer=客户，lead=线索'
      },
      pageSize: {
        type: 'integer',
        minimum: 1,
        maximum: 50,
        default: 10,
        description: '每页返回数量'
      }
    },
    required: ['query']
  },

  async execute(params, context) {
    const { query, type = 'customer', pageSize = 10 } = params;
    const { tenantId, userId } = context;

    if (!tenantId || !userId) {
      throw new Error('Missing tenantId or userId in context');
    }

    const client = createCRMClient({ tenantId, userId });

    try {
      const response = await client.get('/api/search', {
        params: { q: query, type, pageSize }
      });

      const { data, pagination } = response.data;

      return {
        success: true,
        results: data.map(item => ({
          id: item.id,
          name: item.name,
          company: item.company_name || '',
          phone: item.phone || '',
          email: item.email || '',
          status: item.status
        })),
        total: pagination.total,
        message: `找到 ${pagination.total} 个${type === 'customer' ? '客户' : '线索'}`
      };
    } catch (error) {
      console.error('[search_customer] Error:', error.message);
      return {
        success: false,
        results: [],
        total: 0,
        error: error.response?.data?.respDesc || error.message
      };
    }
  }
};
