const { createCRMClient } = require('../lib/crm-client');

module.exports = {
  name: 'churn_risk',
  description: '分析流失风险客户：拉取候选列表，逐一获取上下文，生成流失风险分析并通知订阅用户。通常由 Cron 触发。',

  inputSchema: {
    type: 'object',
    properties: {
      min_followups: {
        type: 'integer',
        default: 3,
        description: '最少历史跟进次数（排除新客户）'
      },
      min_days_inactive: {
        type: 'integer',
        default: 14,
        description: '至少多少天无跟进视为流失风险'
      },
      max_customers: {
        type: 'integer',
        default: 10,
        description: '本次最多分析客户数（避免上下文过长）'
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
    const {
      min_followups = 3,
      min_days_inactive = 14,
      max_customers = 10,
      locale = 'zh'
    } = params;
    const { tenantId, userId } = context;

    if (!tenantId || !userId) {
      throw new Error('Missing tenantId or userId in context');
    }

    const client = createCRMClient({ tenantId, userId });
    const isZh = locale !== 'en';

    try {
      // Step 1: 获取流失风险候选
      const candidatesRes = await client.get('/api/mcp/context/churn-candidates', {
        params: { minFollowups: min_followups, minDaysInactive: min_days_inactive }
      });

      const candidates = candidatesRes.data?.data || [];

      if (candidates.length === 0) {
        return {
          success: true,
          churn_candidates: [],
          summary: isZh
            ? `✅ 最近 ${min_days_inactive} 天内无流失风险客户（满足条件：≥${min_followups} 次历史跟进）`
            : `✅ No churn risk customers found in the last ${min_days_inactive} days (min ${min_followups} followups).`
        };
      }

      // Step 2: 并行获取 Top N 客户上下文
      const topCandidates = candidates.slice(0, max_customers);
      const results = await Promise.all(
        topCandidates.map(c =>
          client.get(`/api/mcp/context/customer/${c.id}`).catch(err => {
            console.error(`[churn_risk] Failed to fetch context for customer ${c.id}:`, err.message);
            return null;
          })
        )
      );
      const contexts = results
        .map((res, i) => res?.data?.respCode === 0 ? { candidate: topCandidates[i], context: res.data.data } : null)
        .filter(Boolean);

      return {
        success: true,
        total_candidates: candidates.length,
        analyzed: contexts.length,
        churn_candidates: contexts,
        locale,
        // LLM 分析提示词
        _analysis_prompt: buildChurnPrompt(contexts, candidates.length, min_days_inactive, locale)
      };

    } catch (error) {
      console.error('[churn_risk] Error:', error.message);
      return {
        success: false,
        error: error.response?.data?.message || (isZh ? '获取流失风险数据失败' : 'Failed to fetch churn risk data.')
      };
    }
  }
};

function buildChurnPrompt(contexts, totalCount, minDays, locale) {
  const isZh = locale !== 'en';

  const customerSections = contexts.map(({ candidate, context: ctx }) => {
    const lastFollowup = (ctx.recentFollowups || [])[0];
    const recentSummary = lastFollowup
      ? `最近跟进：${lastFollowup.date} [${lastFollowup.method}] ${lastFollowup.content.slice(0, 60)}`
      : '无跟进记录';

    return isZh
      ? `【${candidate.name}（${candidate.company || ''}）】
  负责人：${ctx.owner?.name || '未分配'} | 静默 ${candidate.daysSinceLastFollowup} 天 | 历史跟进 ${candidate.totalFollowups} 次
  ${recentSummary}
  跟进统计：近30天 ${ctx.followupStats?.last30Days ?? 0} 次 vs 前30天 ${ctx.followupStats?.prev30Days ?? 0} 次`
      : `[${candidate.name} (${candidate.company || ''})]
  Owner: ${ctx.owner?.name || 'Unassigned'} | Silent ${candidate.daysSinceLastFollowup} days | Total followups: ${candidate.totalFollowups}
  ${recentSummary}
  Stats: last 30d ${ctx.followupStats?.last30Days ?? 0} vs prev 30d ${ctx.followupStats?.prev30Days ?? 0}`;
  }).join('\n\n');

  if (isZh) {
    return `以下是 ${totalCount} 个流失风险客户（${minDays}天无跟进），已展示 Top ${contexts.length} 个，请：
1. 对每个客户评估流失风险等级（高/中/低）并说明原因
2. 给出优先级排序（最需要立即联系的放前面）
3. 对每个客户给出1条具体行动建议
输出格式：每个客户一段，包含风险等级 + 原因 + 行动建议。最后汇总：今日最需关注的 1-3 个客户。

${customerSections}`;
  }

  return `The following ${totalCount} customers are at churn risk (${minDays}+ days inactive). Showing top ${contexts.length}. Please:
1. Rate each customer's churn risk (High/Medium/Low) with reasoning
2. Prioritize by urgency (most urgent first)
3. Provide 1 specific action per customer
Format: one paragraph per customer with risk level + reason + action. End with top 1-3 customers to contact today.

${customerSections}`;
}
