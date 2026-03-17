const { createCRMClient } = require('../lib/crm-client');

module.exports = {
  name: 'create_followup',
  description: '创建客户或线索的跟进记录',

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
        description: '实体ID（客户ID、线索ID或商机ID）'
      },
      method: {
        type: 'string',
        enum: ['phone', 'wechat', 'email', 'visit', 'meeting'],
        description: '跟进方式'
      },
      content: {
        type: 'string',
        description: '跟进内容',
        minLength: 1
      },
      result: {
        type: 'string',
        enum: ['interested', 'considering', 'rejected'],
        description: '跟进结果（可选）'
      },
      next_follow_at: {
        type: 'string',
        format: 'date-time',
        description: '下次跟进时间（可选，ISO 8601格式）'
      }
    },
    required: ['entity_type', 'entity_id', 'method', 'content']
  },

  async execute(params, context) {
    const {
      entity_type,
      entity_id,
      method,
      content,
      result,
      next_follow_at
    } = params;
    const { tenantId, userId } = context;

    if (!tenantId || !userId) {
      throw new Error('Missing tenantId or userId in context');
    }

    const client = createCRMClient({ tenantId, userId });

    try {
      const response = await client.post('/api/mcp/followups', {
        entity_type,
        entity_id,
        method,
        content,
        result,
        next_follow_at
      });

      const followup = response.data.data;

      return {
        success: true,
        followup_id: followup.id,
        message: '跟进记录创建成功',
        created_at: followup.created_at
      };
    } catch (error) {
      console.error('[create_followup] Error:', error.message);
      return {
        success: false,
        error: error.response?.data?.respDesc || '创建跟进记录失败'
      };
    }
  }
};
