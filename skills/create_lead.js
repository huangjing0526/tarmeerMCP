const { createCRMClient } = require('../lib/crm-client');

module.exports = {
  name: 'create_lead',
  description: '创建新线索',

  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: '线索联系人姓名'
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
      },
      source: {
        type: 'string',
        description: '线索来源（如 referral, website, cold_call 等）'
      }
    },
    required: ['name']
  },

  async execute(params, context) {
    const { name, company, phone, email, source } = params;
    const { tenantId, userId } = context;

    if (!tenantId || !userId) {
      throw new Error('Missing tenantId or userId in context');
    }

    const client = createCRMClient({ tenantId, userId });

    try {
      const response = await client.post('/api/mcp/leads', {
        name,
        company,
        phone,
        email,
        source
      });

      const lead = response.data.data;

      return {
        success: true,
        lead_id: lead.id,
        name: lead.name,
        company: lead.company_name,
        message: '线索创建成功'
      };
    } catch (error) {
      console.error('[create_lead] Error:', error.message);
      return {
        success: false,
        error: error.response?.data?.respDesc || '创建线索失败'
      };
    }
  }
};
