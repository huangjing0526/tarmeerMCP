const fs = require('fs');
const path = require('path');

/**
 * 动态加载Skills目录中的所有Skill
 * @param {string} skillsDir - Skills目录路径
 * @returns {Array} Skills数组
 */
function loadSkills(skillsDir) {
  const skills = [];
  const fullPath = path.resolve(skillsDir);

  if (!fs.existsSync(fullPath)) {
    console.warn(`[skill-loader] Skills directory not found: ${fullPath}`);
    return skills;
  }

  const files = fs.readdirSync(fullPath);

  files.forEach(file => {
    if (file.endsWith('.js')) {
      const skillPath = path.join(fullPath, file);
      const skill = require(skillPath);

      // 校验Skill结构
      if (!skill.name || typeof skill.name !== 'string') {
        throw new Error(`Invalid skill in ${file}: missing or invalid "name"`);
      }
      if (typeof skill.execute !== 'function') {
        throw new Error(`Invalid skill in ${file}: missing "execute" function`);
      }
      if (!skill.inputSchema || typeof skill.inputSchema !== 'object') {
        throw new Error(`Invalid skill in ${file}: missing or invalid "inputSchema"`);
      }

      skills.push(skill);
    }
  });

  return skills;
}

module.exports = { loadSkills };
