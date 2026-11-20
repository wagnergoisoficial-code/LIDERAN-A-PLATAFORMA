// Pix "copia e cola" (BR Code estático, padrão do Banco Central) com o valor da doação já preenchido:
// o app do banco lê o QR e a pessoa só confirma.
const field = (id: string, value: string) => `${id}${String(value.length).padStart(2, '0')}${value}`;

// O padrão só aceita ASCII: tira acentos e símbolos
const ascii = (text: string, max: number) =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7E]/g, '').trim().slice(0, max);

// CRC16-CCITT (polinómio 0x1021, início 0xFFFF)
const crc16 = (payload: string) => {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
};

export const pixPayload = ({ key, name, city, amount, txid = '***' }: { key: string; name: string; city: string; amount?: number; txid?: string }) => {
  const body = field('00', '01')
    + field('26', field('00', 'br.gov.bcb.pix') + field('01', key.trim()))
    + field('52', '0000')
    + field('53', '986')
    + (amount ? field('54', amount.toFixed(2)) : '')
    + field('58', 'BR')
    + field('59', ascii(name, 25))
    + field('60', ascii(city, 15))
    + field('62', field('05', txid))
    + '6304';
  return body + crc16(body);
};
