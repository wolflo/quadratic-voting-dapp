var QuadraticVoting = artifacts.require("./QuadraticVoting.sol");

module.exports = function(deployer) {
  deployer.deploy(QuadraticVoting);
};
