const axios = require('axios');

/**
 * 创建CRM API客户端
 * @param {Object} options - 配置选项
 * @param {string} options.tenantId - 租户ID
 * @param {string} options.userId - 用户ID
 * @param {string} [options.gatewayKey] - Gateway Key（可选，默认从环境变量读取）
 * @returns {import('axios').AxiosInstance}
 */
function createCRMClient({ tenantId, userId, gatewayKey }) {
  const baseURL = process.env.CRM_BASE_URL || 'http://localhost:3000';
  const key = gatewayKey || process.env.CRM_GATEWAY_KEY;

  if (!key) {
    throw new Error('CRM_GATEWAY_KEY not configured in environment');
  }

  if (!tenantId || !userId) {
    throw new Error('tenantId and userId are required');
  }

  return axios.create({
    baseURL,
    headers: {
      'X-Gateway-Key': key,
      'X-Tenant-Id': tenantId,
      'X-User-Id': userId,
      'Content-Type': 'application/json'
    },
    timeout: 10000 // 10秒超时
  });
}

module.exports = { createCRMClient };
