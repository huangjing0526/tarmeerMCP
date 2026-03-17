const { createCRMClient } = require('../lib/crm-client');

module.exports = {
  name: 'suggest_followup',
  description: '基于跟进内容，AI 分析并建议跟进结果、下次跟进时间和意向强度',

  inputSchema: {
    type: 'object',
    properties: {
      entity_id: {
        type: 'string',
        description: '客户或线索ID'
      },
      entity_type: {
        type: 'string',
        enum: ['lead', 'customer'],
        default: 'lead',
        description: '实体类型'
      },
      content: {
        type: 'string',
        description: '本次跟进的内容描述'
      },
      recent_followups: {
        type: 'array',
        items: { type: 'string' },
        description: '最近几次跟进内容（可选，用于上下文分析）'
      }
    },
    required: ['entity_id', 'content']
  },

  async execute(params, context) {
    const { entity_id, entity_type = 'lead', content, recent_followups } = params;
    const { tenantId, userId } = context;

    if (!tenantId || !userId) {
      throw new Error('Missing tenantId or userId in context');
    }

    const client = createCRMClient({ tenantId, userId });

    try {
      const response = await client.post('/api/mcp/ai/followups/suggest', {
        entity_id,
        entity_type,
        content,
        recent_followups
      });

      const data = response.data.data;

      return {
        success: true,
        suggestion: {
          result: data.resultSuggestion,
          result_explanation: data.resultExplanation,
          next_follow_at: data.nextFollowAtSuggestion,
          next_follow_explanation: data.nextFollowAtExplanation,
          intent_strength: data.intentStrength,
          key_points: data.keyPoints
        }
      };
    } catch (error) {
      console.error('[suggest_followup] Error:', error.message);
      return {
        success: false,
        error: error.response?.data?.respDesc || 'AI 建议服务暂不可用'
      };
    }
  }
};
