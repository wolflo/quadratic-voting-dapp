/**Credit to OpenZeppelin for this immensely helpful tool.
 *https://github.com/OpenZeppelin
 */

const should = require('chai')
.should();

async function expectThrow (promise, message) {
try {
  await promise;
} catch (error) {
  // Message is an optional parameter here
  if (message) {
    error.message.should.include(message, 'Expected \'' + message + '\', got \'' + error + '\' instead');
    return;
  } else {
    error.message.should.match(/[invalid opcode|out of gas|revert]/, 'Expected throw, got \'' + error + '\' instead');
    return;
  }
}
should.fail('Expected throw not received');
}

module.exports = {
expectThrow,
};