import qrcode from 'qrcode-generator';

/** QRコードをブラウザ内で SVG として生成する(外部のQR生成サービスは使わない) */
export function qrSvg(text: string): string {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  return qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
}
