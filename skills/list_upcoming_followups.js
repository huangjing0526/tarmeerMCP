const { createCRMClient } = require('../lib/crm-client');

module.exports = {
  name: 'list_upcoming_followups',
  description: '获取当前用户待跟进的客户/线索列表（含已逾期）',

  inputSchema: {
    type: 'object',
    properties: {
      days: {
        type: 'integer',
        minimum: 1,
        maximum: 30,
        default: 7,
        description: '查询未来几天内的待跟进（默认7天，也包含已逾期的）'
      },
      pageSize: {
        type: 'integer',
        minimum: 1,
        maximum: 50,
        default: 20,
        description: '返回数量'
      }
    },
    required: []
  },

  async execute(params, context) {
    const { days = 7, pageSize = 20 } = params;
    const { tenantId, userId } = context;

    if (!tenantId || !userId) {
      throw new Error('Missing tenantId or userId in context');
    }

    const client = createCRMClient({ tenantId, userId });

    try {
      const response = await client.get('/api/mcp/followups/upcoming', {
        params: { days, pageSize }
      });

      const { data, pagination } = response.data;

      return {
        success: true,
        followups: data.map(f => ({
          id: f.id,
          method: f.method,
          content: f.content,
          result: f.result,
          next_follow_at: f.next_follow_at,
          created_at: f.created_at,
          is_overdue: f.is_overdue,
          entity_type: f.entity?.type || null,
          entity_id: f.entity?.id || null,
          entity_name: f.entity?.name || '',
          entity_company: f.entity?.company || '',
          entity_status: f.entity?.status || ''
        })),
        total: pagination.total,
        message: `找到 ${pagination.total} 条待跟进记录`
      };
    } catch (error) {
      console.error('[list_upcoming_followups] Error:', error.message);
      return {
        success: false,
        followups: [],
        total: 0,
        error: error.response?.data?.respDesc || '获取待跟进列表失败'
      };
    }
  }
};
