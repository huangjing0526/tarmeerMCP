const { createCRMClient } = require('../lib/crm-client');

module.exports = {
  name: 'get_lead',
  description: '获取线索详情信息',

  inputSchema: {
    type: 'object',
    properties: {
      lead_id: {
        type: 'string',
        description: '线索ID'
      }
    },
    required: ['lead_id']
  },

  async execute(params, context) {
    const { lead_id } = params;
    const { tenantId, userId } = context;

    if (!tenantId || !userId) {
      throw new Error('Missing tenantId or userId in context');
    }

    const client = createCRMClient({ tenantId, userId });

    try {
      const response = await client.get(`/api/mcp/leads/${lead_id}`);
      const lead = response.data.data;

      return {
        success: true,
        lead: {
          id: lead.id,
          name: lead.name,
          company: lead.company_name,
          phone: lead.phone,
          email: lead.email,
          status: lead.status,
          source: lead.source,
          score: lead.score,
          last_followed_at: lead.last_followed_at,
          owner: lead.owner?.name || '未分配',
          created_at: lead.created_at
        }
      };
    } catch (error) {
      console.error('[get_lead] Error:', error.message);
      return {
        success: false,
        error: error.response?.data?.respDesc || '线索不存在'
      };
    }
  }
};
