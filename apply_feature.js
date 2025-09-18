const fs = require('fs');
const path = require('path');
const { Anthropic } = require('anthropic');

const FEATURE = process.env.FEATURE_REQUEST || '';
if (!FEATURE) {
  console.error('No FEATURE_REQUEST provided');
  process.exit(0);
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

(async () => {
  const prompt = `You are an expert software engineer working in a typical Node/React project.\n\nFeature request:\n${FEATURE}\n\nReturn ONLY a JSON object in a fenced block with this shape:\n\n\n{\n  "changes": [ { "path": "relative/file/path", "content": "full new file content" } ],\n  "notes": "short notes/instructions"\n}\n\nRules:\n- Include full file contents for small files you add or replace (<= 200 lines).\n- Prefer minimal, safe changes.\n- Use existing conventions if obvious.\n- Do not include comments outside the JSON.`;

  const msg = await client.messages.create({
    model: 'claude-3-5-sonnet-latest',
    max_tokens: 2000,
    temperature: 0.3,
    messages: [
      { role: 'user', content: prompt }
    ]
  });

  const parts = msg.content || [];
  const text = parts.map(p => p.text || p).join('\n');
  const match = text.match(/```json\s*([\s\S]*?)```/i) || text.match(/\{[\s\S]*\}/);
  if (!match) {
    console.log('No JSON changes found. Writing plan to FEATURE_AI_PLAN.md');
    fs.writeFileSync('FEATURE_AI_PLAN.md', text);
    return;
  }
  let data;
  try {
    data = JSON.parse(match[1] || match[0]);
  } catch (e) {
    console.log('Failed to parse JSON. Writing raw output');
    fs.writeFileSync('FEATURE_AI_PLAN.md', text);
    return;
  }
  const changes = Array.isArray(data.changes) ? data.changes : [];
  for (const ch of changes) {
    if (!ch.path || typeof ch.content !== 'string') continue;
    const fp = path.resolve(process.cwd(), ch.path);
    fs.mkdirSync(path.dirname(fp), { recursive: true });
    fs.writeFileSync(fp, ch.content, 'utf8');
    console.log('Wrote', ch.path);
  }
  if (data.notes) {
    fs.writeFileSync('FEATURE_AI_PLAN.md', String(data.notes));
  }
})().catch(err => {
  console.error('Error running Anthropic:', err.message);
  process.exit(0); // don't fail the workflow
});
