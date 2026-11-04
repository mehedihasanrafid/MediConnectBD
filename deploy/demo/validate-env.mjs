// Run with environment values supplied by --env-file; never prints their contents.
const required = ['DEMO_DOMAIN', 'DB_PASSWORD', 'MYSQL_ROOT_PASSWORD', 'JWT_ACCESS_SECRET', 'SEED_DEMO_PASSWORD'];
const errors = [];
for (const key of required) {
  const value = process.env[key];
  if (!value || /REPLACE|your-domain|\.example$/.test(value)) errors.push(`${key}: configure a real demo value`);
}
const host = process.env.DEMO_DOMAIN ?? '';
if (!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(host)) errors.push('DEMO_DOMAIN: use a hostname without protocol, path or port');
if ((process.env.JWT_ACCESS_SECRET?.length ?? 0) < 32) errors.push('JWT_ACCESS_SECRET: at least 32 characters required');
if ((process.env.DB_PASSWORD?.length ?? 0) < 20 || (process.env.MYSQL_ROOT_PASSWORD?.length ?? 0) < 20) errors.push('Database passwords: use independent random values of at least 20 characters');
if ((process.env.SEED_DEMO_PASSWORD?.length ?? 0) < 10) errors.push('SEED_DEMO_PASSWORD: at least 10 characters required');
if (process.env.DB_PASSWORD === process.env.MYSQL_ROOT_PASSWORD) errors.push('Database root and application passwords must differ');
for (const key of ['SSLCOMMERZ_STORE_ID','SSLCOMMERZ_STORE_PASSWORD','PUBLIC_API_URL']) {
  if (!process.env[key] || /REPLACE|^\.\.\.$/.test(process.env[key])) errors.push(`${key}: required for the requested sandbox checkout demo`);
}
if (process.env.PUBLIC_API_URL !== `https://${host}`) errors.push('PUBLIC_API_URL must match the public HTTPS domain');
if (errors.length) { for (const error of errors) console.error(error); process.exit(1); }
console.log('Demo environment checks passed. No values printed. Sandbox checkout still requires an end-to-end payment test.');
if (!process.env.DAILY_API_KEY) console.log('Daily credentials absent: a real video call is not launch-verified.');
if (!process.env.SMTP_HOST) console.log('Email provider absent: email delivery is not launch-verified.');
