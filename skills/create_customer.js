const { createCRMClient } = require('../lib/crm-client');

module.exports = {
  name: 'create_customer',
  description: '创建新客户',

  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: '客户姓名'
      },
      company: {
        type: 'string',
        description: '公司名称'
      },
      phone: {
        type: 'string',
        description: '电话号码'
      },
      email: {
        type: 'string',
        description: '邮箱'
      }
    },
    required: ['name']
  },

  async execute(params, context) {
    const { name, company, phone, email } = params;
    const { tenantId, userId } = context;

    if (!tenantId || !userId) {
      throw new Error('Missing tenantId or userId in context');
    }

    const client = createCRMClient({ tenantId, userId });

    try {
      const response = await client.post('/api/mcp/customers', {
        name,
        company,
        phone,
        email
      });

      const customer = response.data.data;

      return {
        success: true,
        customer_id: customer.id,
        name: customer.name,
        company: customer.company_name,
        message: '客户创建成功'
      };
    } catch (error) {
      console.error('[create_customer] Error:', error.message);
      return {
        success: false,
        error: error.response?.data?.respDesc || '创建客户失败'
      };
    }
  }
};
