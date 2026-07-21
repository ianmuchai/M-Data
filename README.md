# BizDATA deployment

This app is designed to be distributed to different companies from the same codebase.

## Company branding

Edit `public/app-config.json` for each customer deployment:

```json
{
  "appName": "Acme Risk Analytics",
  "companyName": "Acme Bank",
  "industry": "Banking and credit risk",
  "supportEmail": "analytics-support@acme.example"
}
```

Because this file is served from `public/`, it can be changed after build without recompiling the frontend.

## Supported uploads

The upload analysis workflow supports:

- CSV
- TSV
- TXT delimited data
- JSON arrays of objects
- XLS
- XLSX

Files are analysed in memory. The current implementation does not persist uploaded datasets to disk.

## Production build

```bash
npm run typecheck
npm run build
```

Serve `dist/` with your preferred static host and run the backend API with:

```bash
npm run server
```

Set environment variables per tenant:

```bash
PORT=4000
CORS_ORIGIN=https://analytics.customer.example
```


