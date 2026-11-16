import qrcode from 'qrcode-generator';
import type { BankDetails } from './types';

qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];

/** SVG of an EPC QR code (EPC069-12, version 002, SEPA credit transfer) that banking apps scan to prefill a transfer. */
export function epcQr(b: BankDetails) {
  const text = ['BCD', '002', '1', 'SCT', '', b.accountHolder, b.iban.replace(/\s/g, ''), `EUR${(b.amountCents / 100).toFixed(2)}`, '', '', b.reference].join('\n');
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  return qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
}
