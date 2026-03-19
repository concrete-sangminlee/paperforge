export function emailTemplate(title: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
    <div style="padding:32px 40px;border-bottom:1px solid #e4e4e7">
      <h1 style="margin:0;font-size:20px;color:#18181b">PaperForge</h1>
    </div>
    <div style="padding:32px 40px">
      <h2 style="margin:0 0 16px;font-size:18px;color:#18181b">${title}</h2>
      ${body}
    </div>
    <div style="padding:24px 40px;background:#fafafa;text-align:center;font-size:12px;color:#71717a">
      PaperForge — LaTeX editing, reimagined
    </div>
  </div>
</body>
</html>`;
}

export function buttonHtml(text: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;padding:12px 24px;background:#18181b;color:#fff;text-decoration:none;border-radius:6px;font-weight:500;margin:16px 0">${text}</a>`;
}
