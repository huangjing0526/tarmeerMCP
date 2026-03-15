# Tarmeer CRM - MCP Server

AI-powered CRM system with Model Context Protocol (MCP) integration.

## Features

- 🔍 **Smart Customer Search** - Search customers by name, company, or phone
- 📝 **Followup Management** - Create and track customer followup records
- 🤖 **AI Integration** - Works with OpenClaw and other MCP-compatible clients
- 🔐 **Secure** - Gateway key authentication with tenant isolation

## Architecture

```
OpenClaw Gateway (MCP Client)
      ↓ (MCP Protocol - stdio)
tarmeer-mcp-server (This Project)
  ├─ Skills (独立功能单元)
  │   ├─ search_customer.js
  │   ├─ get_customer.js
  │   ├─ create_followup.js
  │   └─ list_followups.js
  └─ CRM Client (HTTP封装)
      ↓ (HTTP REST + Gateway Key Auth)
Tarmeer CRM API
```

## Installation

```bash
# Clone repository
git clone https://github.com/huangjing0526/tarmeerMCP.git
cd tarmeerMCP

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and set CRM_BASE_URL and CRM_GATEWAY_KEY
```

## Configuration

Create a `.env` file with:

```env
CRM_BASE_URL=http://localhost:3000
CRM_GATEWAY_KEY=your-gateway-key-here
MCP_TRANSPORT=stdio
```

## Usage

### Standalone Mode

```bash
npm start
```

### With OpenClaw

Add to your OpenClaw configuration (`~/.openclaw/config.json`):

```json
{
  "mcp_servers": {
    "tarmeer-crm": {
      "command": "node",
      "args": ["/path/to/tarmeerMCP/index.js"],
      "env": {
        "CRM_BASE_URL": "http://localhost:3000",
        "CRM_GATEWAY_KEY": "your-gateway-key",
        "MCP_TRANSPORT": "stdio"
      }
    }
  }
}
```

## Available Skills

### search_customer

Search for customers by name, company, or phone number.

```javascript
{
  "name": "search_customer",
  "arguments": {
    "query": "华为",
    "type": "customer",
    "pageSize": 10,
    "_context": {
      "tenantId": "tenant-123",
      "userId": "user-456"
    }
  }
}
```

### get_customer

Get detailed information about a specific customer.

### create_followup

Create a followup record for a customer or lead.

### list_followups

Get followup history for a customer or lead.

## Development

### Adding a New Skill

1. Create a new file in `skills/` directory:

```javascript
// skills/my_skill.js
const { createCRMClient } = require('../lib/crm-client');

module.exports = {
  name: 'my_skill',
  description: 'Description of what this skill does',

  inputSchema: {
    type: 'object',
    properties: {
      param1: {
        type: 'string',
        description: 'Parameter description'
      }
    },
    required: ['param1']
  },

  async execute(params, context) {
    const { tenantId, userId } = context;
    const client = createCRMClient({ tenantId, userId });

    // Your implementation here
    const response = await client.get('/api/endpoint');

    return {
      success: true,
      data: response.data
    };
  }
};
```

2. Skills are automatically loaded on server start

### Running Tests

```bash
npm test
```

## Project Structure

```
tarmeerMCP/
├── index.js              # MCP Server entry point
├── lib/
│   ├── crm-client.js     # CRM HTTP client factory
│   └── skill-loader.js   # Dynamic skill loader
├── skills/               # Skill implementations
│   ├── search_customer.js
│   ├── get_customer.js
│   ├── create_followup.js
│   └── list_followups.js
├── tests/                # Test files
│   └── skills/
├── .env.example          # Environment template
├── .gitignore
├── package.json
└── README.md
```

## License

ISC

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

For issues and questions, please open an issue on GitHub.
