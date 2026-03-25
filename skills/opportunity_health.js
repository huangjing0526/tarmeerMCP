const { createCRMClient } = require('../lib/crm-client');

module.exports = {
  name: 'opportunity_health',
  description: '分析商机健康度：正面信号、风险点、建议。需要提供商机名称或 ID。',

  inputSchema: {
    type: 'object',
    properties: {
      opportunity_id: {
        type: 'string',
        description: '商机 ID（已知时直接使用）'
      },
      query: {
        type: 'string',
        description: '商机名称关键词（未知 ID 时搜索）'
      },
      locale: {
        type: 'string',
        enum: ['zh', 'en'],
        default: 'zh',
        description: '回复语言'
      }
    },
    required: []
  },

  async execute(params, context) {
    const { opportunity_id, query, locale = 'zh' } = params;
    const { tenantId, userId } = context;

    if (!tenantId || !userId) {
      throw new Error('Missing tenantId or userId in context');
    }

    if (!opportunity_id && !query) {
      return {
        success: false,
        action: 'need_input',
        message: locale === 'zh'
          ? '请提供商机名称或 ID，例如："项目A 的健康度"'
          : 'Please provide an opportunity name or ID.'
      };
    }

    const client = createCRMClient({ tenantId, userId });

    try {
      let oppId = opportunity_id;

      // 若无 ID，通过搜索找商机
      if (!oppId) {
        const searchRes = await client.get('/api/mcp/search', {
          params: { q: query, type: 'opportunity', pageSize: 5 }
        });
        const items = searchRes.data?.data?.items || searchRes.data?.data || [];

        if (items.length === 0) {
          return {
            success: false,
            action: 'not_found',
            message: locale === 'zh'
              ? `未找到商机"${query}"，请确认名称后重试`
              : `Opportunity "${query}" not found.`
          };
        }

        if (items.length > 1) {
          return {
            success: false,
            action: 'multiple_matches',
            message: locale === 'zh' ? `找到 ${items.length} 个匹配商机，请指定：` : `Found ${items.length} matches. Please specify:`,
            matches: items.map((o, i) => ({
              index: i + 1,
              id: o.id,
              name: o.name,
              stage: o.stage,
              amount: o.amount
            }))
          };
        }

        oppId = items[0].id;
      }

      // 获取商机上下文
      const ctxRes = await client.get(`/api/mcp/context/opportunity/${oppId}`);
      if (ctxRes.data?.respCode !== 0) {
        return {
          success: false,
          error: locale === 'zh' ? '商机不存在或无权限' : 'Opportunity not found or no permission.'
        };
      }

      const ctx = ctxRes.data.data;
      return {
        success: true,
        context: ctx,
        locale,
        // 将上下文传回给 LLM 生成健康度分析
        _analysis_prompt: buildAnalysisPrompt(ctx, locale)
      };

    } catch (error) {
      console.error('[opportunity_health] Error:', error.message);
      return {
        success: false,
        error: error.response?.data?.message || (locale === 'zh' ? '获取商机上下文失败' : 'Failed to fetch opportunity context.')
      };
    }
  }
};

function buildAnalysisPrompt(ctx, locale) {
  const { opportunity, customer, followupStats, recentFollowups, timePatterns } = ctx;
  const isZh = locale !== 'en';

  const stageDays = opportunity.daysSinceLastFollowup ?? '未知';
  const recentList = (recentFollowups || []).slice(0, 5)
    .map(f => `- ${f.date} [${f.method}] ${f.content.slice(0, 80)} → ${f.result || '无结果'}`)
    .join('\n');

  if (isZh) {
    return `请对以下商机做健康度分析，输出：整体评估（✅良好/⚠️需关注/🚨高风险）、好的信号（2-4条）、需关注的风险（2-4条）、建议行动（1-3条）。语言：中文。

商机：${opportunity.name}（阶段：${opportunity.stage}，金额：${opportunity.amount ? `¥${(opportunity.amount / 10000).toFixed(1)}万` : '未设置'}）
客户：${customer.name}（${customer.company || ''}）
负责人上次跟进：${stageDays} 天前
跟进统计（90天）：共 ${followupStats?.total ?? 0} 次，近30天 ${followupStats?.last30Days ?? 0} 次
最近跟进记录：
${recentList || '暂无记录'}
时间模式：最佳日期 ${timePatterns?.bestDayOfWeek || '未知'}，最佳时段 ${timePatterns?.bestHourRange || '未知'}`;
  }

  return `Analyze the health of this opportunity. Output: overall assessment (✅Good/⚠️Needs Attention/🚨High Risk), positive signals (2-4), risks (2-4), recommended actions (1-3). Language: English.

Opportunity: ${opportunity.name} (Stage: ${opportunity.stage}, Amount: ${opportunity.amount ? `$${(opportunity.amount / 1000).toFixed(0)}K` : 'N/A'})
Customer: ${customer.name} (${customer.company || ''})
Days since last followup: ${stageDays}
Followup stats (90d): total ${followupStats?.total ?? 0}, last 30d ${followupStats?.last30Days ?? 0}
Recent followups:
${recentList || 'No records'}
Best contact time: ${timePatterns?.bestDayOfWeek || 'unknown'} ${timePatterns?.bestHourRange || ''}`;
}
