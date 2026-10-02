import { loadDatasetsFromCSV } from './csvLoader.js';

async function main() {
  try {
    console.log('[CLI] Starting CSV dataset ingestion for NyayaSetu AI...');
    const stats = await loadDatasetsFromCSV();
    console.log('[CLI] Ingestion completed successfully!');
    console.table({
      'Active Cases': stats.cases,
      'Officers & Users': stats.users,
      'Legal & Investigation Documents': stats.documents,
      'Document Cryptographic Versions': stats.documentVersions,
      'Evidence Items': stats.evidenceItems,
      'Chain-of-Custody Events': stats.custodyEvents,
      'Persons & Suspects': stats.persons,
      'Audit Trail Logs': stats.auditEvents,
      'Merkle Ledger Blocks': stats.ledgerBlocks,
      'Ingestion Duration': `${stats.durationMs}ms`
    });
    process.exit(0);
  } catch (err) {
    console.error('[CLI-ERROR] Failed to ingest datasets:', err);
    process.exit(1);
  }
}

main();
