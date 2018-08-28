/**Credit to OpenZeppelin for this immensely helpful tool.
 *https://github.com/OpenZeppelin
 */

const pify = require('pify');

const ethAsync = pify(web3.eth);

module.exports = {
  ethGetBalance: ethAsync.getBalance,
  ethSendTransaction: ethAsync.sendTransaction,
  ethGetBlock: ethAsync.getBlock,
};
