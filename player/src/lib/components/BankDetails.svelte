<script lang="ts">
  import { euro } from '#lib/format.ts';
  import { t } from '#lib/i18n.svelte.ts';
  import { epcQr } from '#lib/qr.ts';
  import type { BankDetails } from '#lib/types.ts';

  let { d }: { d: BankDetails } = $props();
</script>

<div class="panel">
  <dl>
    <dt>{t('bank.holder')}</dt><dd>{d.accountHolder}</dd>
    <dt>IBAN</dt><dd>{d.iban}</dd>
    <dt>{t('bank.amount')}</dt><dd>{euro(d.amountCents)}</dd>
    <dt>{t('bank.reference')}</dt><dd><b>{d.reference}</b></dd>
  </dl>
  <p class="small muted">{t('bank.reference.hint')}</p>
  <p class="small">{t('bank.qr')}</p>
  <div class="qr" role="img" aria-label="EPC QR">{@html epcQr(d)}</div>
</div>
