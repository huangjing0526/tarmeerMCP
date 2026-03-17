const { createCRMClient } = require('../lib/crm-client');

module.exports = {
  name: 'get_customer',
  description: '获取客户详情信息',

  inputSchema: {
    type: 'object',
    properties: {
      customer_id: {
        type: 'string',
        description: '客户ID'
      }
    },
    required: ['customer_id']
  },

  async execute(params, context) {
    const { customer_id } = params;
    const { tenantId, userId } = context;

    if (!tenantId || !userId) {
      throw new Error('Missing tenantId or userId in context');
    }

    const client = createCRMClient({ tenantId, userId });

    try {
      const response = await client.get(`/api/mcp/customers/${customer_id}`);
      const customer = response.data.data;

      return {
        success: true,
        customer: {
          id: customer.id,
          name: customer.name,
          company: customer.company_name,
          phone: customer.phone,
          email: customer.email,
          status: customer.status,
          owner: customer.owner?.name || '未分配',
          created_at: customer.created_at
        }
      };
    } catch (error) {
      console.error('[get_customer] Error:', error.message);
      return {
        success: false,
        error: error.response?.data?.respDesc || '客户不存在'
      };
    }
  }
};
