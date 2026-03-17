const { createCRMClient } = require('../lib/crm-client');

module.exports = {
  name: 'summarize_followups',
  description: 'AI 总结客户/线索的跟进历史，生成摘要、当前阶段和下一步建议',

  inputSchema: {
    type: 'object',
    properties: {
      entity_id: {
        type: 'string',
        description: '客户或线索ID'
      },
      entity_type: {
        type: 'string',
        enum: ['leads', 'customers'],
        default: 'leads',
        description: '实体类型（注意：用复数形式）'
      },
      locale: {
        type: 'string',
        enum: ['zh', 'en'],
        default: 'zh',
        description: '返回语言'
      }
    },
    required: ['entity_id']
  },

  async execute(params, context) {
    const { entity_id, entity_type = 'leads', locale = 'zh' } = params;
    const { tenantId, userId } = context;

    if (!tenantId || !userId) {
      throw new Error('Missing tenantId or userId in context');
    }

    const client = createCRMClient({ tenantId, userId });

    try {
      const response = await client.post('/api/mcp/ai/summarize', {
        entity_id,
        entity_type,
        locale
      });

      const data = response.data.data;

      if (!data) {
        return {
          success: true,
          summary: null,
          message: response.data.message || '跟进记录不足，无法生成摘要'
        };
      }

      return {
        success: true,
        summary: {
          text: data.summary,
          current_stage: data.currentStage,
          next_action: data.nextAction,
          key_points: data.keyPoints
        }
      };
    } catch (error) {
      console.error('[summarize_followups] Error:', error.message);
      return {
        success: false,
        error: error.response?.data?.respDesc || 'AI 摘要服务暂不可用'
      };
    }
  }
};
