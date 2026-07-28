const assert = require('assert');

process.env.TRACKER_REGULAR_URL = 'https://example.com/regular';
process.env.TRACKER_MOBILE_URL = 'https://example.com/mobile';

const {
  splitRecipients,
  isSmsGatewayRecipient
} = require('../src/services/notifier');

assert.deepStrictEqual(
  splitRecipients('person@example.com, 5551234567@vtext.com, , second@example.com'),
  ['person@example.com', '5551234567@vtext.com', 'second@example.com']
);
assert.strictEqual(isSmsGatewayRecipient('5551234567@vtext.com'), true);
assert.strictEqual(isSmsGatewayRecipient('person@example.com'), false);
assert.strictEqual(isSmsGatewayRecipient('not-an-address'), false);

console.log('Notifier recipient tests passed');
