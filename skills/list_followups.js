const { createCRMClient } = require('../lib/crm-client');

module.exports = {
  name: 'list_followups',
  description: '获取客户或线索的跟进记录列表',

  inputSchema: {
    type: 'object',
    properties: {
      entity_type: {
        type: 'string',
        enum: ['customer', 'lead', 'opportunity'],
        description: '实体类型'
      },
      entity_id: {
        type: 'string',
        description: '实体ID'
      },
      pageSize: {
        type: 'integer',
        minimum: 1,
        maximum: 50,
        default: 10,
        description: '每页返回数量'
      }
    },
    required: ['entity_type', 'entity_id']
  },

  async execute(params, context) {
    const { entity_type, entity_id, pageSize = 10 } = params;
    const { tenantId, userId } = context;

    if (!tenantId || !userId) {
      throw new Error('Missing tenantId or userId in context');
    }

    const client = createCRMClient({ tenantId, userId });

    try {
      const response = await client.get(
        `/api/mcp/followups/entity/${entity_type}/${entity_id}`,
        { params: { pageSize } }
      );

      const { data, pagination } = response.data;

      return {
        success: true,
        followups: data.map(f => ({
          id: f.id,
          method: f.method,
          content: f.content,
          result: f.result,
          created_by: f.user?.name || '未知',
          created_at: f.created_at,
          next_follow_at: f.next_follow_at
        })),
        total: pagination.total
      };
    } catch (error) {
      console.error('[list_followups] Error:', error.message);
      return {
        success: false,
        followups: [],
        error: error.response?.data?.respDesc || '获取跟进记录失败'
      };
    }
  }
};
