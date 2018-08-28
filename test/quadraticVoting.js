const QuadraticVoting = artifacts.require("../contracts/QuadraticVoting");
const assert = require('assert');
const web3Utils = require('web3-utils');
const { advanceBlock } = require('./helpers/advanceToBlock');
const { expectThrow } = require('./helpers/expectThrow');
const { increaseTimeTo, duration } = require('./helpers/increaseTime');
const { latestTime } = require('./helpers/latestTime');

const EVMRevert = 'revert';

contract('QuadraticVoting', function(accounts) {
  // Declare variables for use in each test
  let votingContract;
  let owner;
  let pollAdmin;
  let charity;
  let voter1;
  let voter2;
  let voter3;
  let newAdmin;
  let anyone;
  let startCommitPhaseTime;
  let startRevealPhaseTime;
  let endRevealPhaseTime;

  // Set the testing conditions not dependent on a contract or web3 instance
  let firstVoteCost = 10;
  const description = "This is a test poll.";
  const candName1 = "Candidate 1";
  const candName2 = "Candidate 2";

  // Set the votes that each voter will commit. 
  /* These can be adjusted, but may cause failure of some tests that 
  currently check for specific results. Specifically,
  -> test 5 checks for the correct behavior with multiple voters, and
    will currently fail unless voter 1 commits more votes than voter 2
  -> test 6 checks for the correct behavior in the event of a tie, and 
    will fcurrently fail unless the total number of votes for candidate 1 == the
    total number of votes for candidate 2
  */
  let voter1Commitment = {
    vote: 1, 
    numVotes: 5, 
    salt: null,
    voteCost: null, 
    hash: null 
  };
  let voter2Commitment = {
    vote: 2, 
    numVotes: 3, 
    salt: null,  
    voteCost: null, 
    hash: null 
  };
  let voter3Commitment = {
    vote: 2, 
    numVotes: 2, 
    salt: null,  
    voteCost: null, 
    hash: null 
  };

  // Vote cost = (number of votes ** 2) * cost of the first vote
  voter1Commitment.voteCost = (voter1Commitment.numVotes * voter1Commitment.numVotes) * firstVoteCost;
  voter2Commitment.voteCost = (voter2Commitment.numVotes * voter2Commitment.numVotes) * firstVoteCost;
  voter3Commitment.voteCost = (voter3Commitment.numVotes * voter3Commitment.numVotes) * firstVoteCost;


  before(async function () {
    // Advance to the next block to correctly read time in the solidity 
    // "now" function interpreted by ganache
    // **Credit to OpenZeppelin for lots of great resources that helped
    // me figure out how to test time-dependent solidity functions
    // https://github.com/OpenZeppelin
    await advanceBlock();
  });

  beforeEach("Instantiate voting contract", async () => {
    votingContract = await QuadraticVoting.new(accounts[0]);
    owner = accounts[0];
    pollAdmin = accounts[1];
    charity = accounts[2];
    voter1 = accounts[3];
    voter2 = accounts[4];
    voter3 = accounts[5];
    newAdmin = accounts[6];
    anyone = accounts[7];

    // Establish the time frame for each phase of the voting
    startCommitPhaseTime = (await latestTime()) + duration.weeks(1);
    startRevealPhaseTime = startCommitPhaseTime + duration.weeks(1);
    endRevealPhaseTime = startRevealPhaseTime + (startRevealPhaseTime - startCommitPhaseTime);
    
    /* **** NOTE: not a secure salt. Used only for testing purposes.
    Salt should be changed every time a vote is committed, and should
    not contain any secret information, as it will be publicly revealed
    during the reveal phase of the poll. */
    voter1Commitment.salt = web3Utils.soliditySha3(voter1);
    voter2Commitment.salt = web3Utils.soliditySha3(voter2);
    voter3Commitment.salt = web3Utils.soliditySha3(voter3);

    // Hash the commitments of each voter
    voter1Commitment.hash = web3Utils.soliditySha3(
      '1', 
      {type: 'uint256', value: voter1Commitment.numVotes}, 
      {type: 'uint256', value: voter1Commitment.vote}, 
      {type: 'bytes32', value: voter1Commitment.salt}
    );
    voter2Commitment.hash = web3Utils.soliditySha3(
      '1', 
      {type: 'uint256', value: voter2Commitment.numVotes}, 
      {type: 'uint256', value: voter2Commitment.vote}, 
      {type: 'bytes32', value: voter2Commitment.salt}
    );
    voter3Commitment.hash = web3Utils.soliditySha3(
      '1', 
      {type: 'uint256', value: voter3Commitment.numVotes}, 
      {type: 'uint256', value: voter3Commitment.vote}, 
      {type: 'bytes32', value: voter3Commitment.salt}
    );

    // Make a test poll
    await votingContract.makePoll(
      startCommitPhaseTime,
      startRevealPhaseTime,
      firstVoteCost,
      description,
      charity,
      { from: pollAdmin }
    );

  })



  it("Should set the address that deployed the contract as the owner.", async() => {

    // Check that the address that deployed the contract is set as the owner.
    const contractInstanceOwner = await votingContract.owner();
    assert.equal(contractInstanceOwner, owner, "The contract owner was not initialized correctly.");

  });



  it("makePoll() should create a poll with the provided attributes.", async () => {

    // Check that poll is created with the correct attributes
    const poll = await votingContract.polls(1);
    assert.equal(poll[8], pollAdmin, "The poll admin was not addded correctly.")
    assert.equal(poll[2], startCommitPhaseTime, "The poll start time was not added correctly.");
    assert.equal(poll[3], startRevealPhaseTime, "The poll close time was not added correctly.");
    assert.equal(poll[4], firstVoteCost, "The poll vote cost was not added correctly.");
    assert.equal(web3.toUtf8(poll[7]), description, "The poll description was not added correctly.");

    // Create a second test poll
    await votingContract.makePoll(
      startCommitPhaseTime,
      startRevealPhaseTime,
      firstVoteCost,
      description,
      charity,
      { from: anyone }
    );

    // Check that multiple polls can be created
    const poll2 = await votingContract.polls(2);
    assert.equal(poll2[8], anyone, "The second poll was not created correctly.");

  });



  it("Poll admin functions should work only when called by admin.", async () => {

    // Non-admin cannot approve voter
    await expectThrow(votingContract.approveVoter(1, voter1, { from: anyone }), EVMRevert);

    // Admin can approve voter
    await votingContract.approveVoter(1, voter1, { from: pollAdmin});
    const isVoterApproved = await votingContract.isUserVoter(1, voter1);
    assert.equal(isVoterApproved, true, "The approved voters list was not updated correctly.");

    // Non-admin cannot add candidate
    await expectThrow(votingContract.addCandidate(1, candName1, { from: anyone }), EVMRevert);

    // Admin can add candidate
    await votingContract.addCandidate(1, candName1, { from: pollAdmin });
    const candidate = await votingContract.getCandidateInfo(1, 1);
    assert.equal(candidate[0], 0, "Candidate should have 0 votes when added.");
    assert.equal(web3.toUtf8(candidate[1]), candName1, "Candidate name was not added correctly.");

    // Non-admin cannot transfer admin privileges
    await expectThrow(votingContract.transferAdmin(1, newAdmin, { from: anyone }), EVMRevert);

    // Admin can transfer admin privileges
    await votingContract.transferAdmin(1, newAdmin, { from: pollAdmin });
    const poll = await votingContract.polls(1);
    assert.equal(poll[8], newAdmin, "Poll admin was not transferred correctly.");

  });



  it("Voting Functions work for approved voters", async () => {

    // Approve voters 1 and 2
    await votingContract.approveVoter(1, voter1, { from: pollAdmin});
    await votingContract.approveVoter(1, voter2, { from: pollAdmin});

    // Add candidates to the poll
    await votingContract.addCandidate(1, candName1, { from: pollAdmin });
    await votingContract.addCandidate(1, candName2, { from: pollAdmin });

    
    // Voter cannot commit vote before commitPhase begins
    await expectThrow(votingContract.commitVote(
      1, 
      voter1Commitment.hash, 
      voter1Commitment.numVotes, 
      { from: voter1, value: voter1Commitment.voteCost }
    ), EVMRevert);

    // Advance time to simulate commitPhase
    await increaseTimeTo(startCommitPhaseTime);

    // Non-voter cannot commit votes during commit phase
    await expectThrow(votingContract.commitVote(
      1, 
      voter1Commitment.hash, 
      voter1Commitment.numVotes, 
      { from: anyone, value: voter1Commitment.voteCost }
    ), EVMRevert);

    // Voter must pay correct amount to commitVote
    await expectThrow(votingContract.commitVote(
      1,
      voter1Commitment.hash,
      voter1Commitment.numVotes,
      { from: voter1, value: voter1Commitment.voteCost - 1 }
    ), EVMRevert);

    // Voter can successfully commit votes during commit phase
    await votingContract.commitVote(
      1, 
      voter1Commitment.hash, 
      voter1Commitment.numVotes, 
      { from: voter1, value: voter1Commitment.voteCost }
    );
    let poll = await votingContract.polls(1);
    assert.equal(poll[0], voter1Commitment.voteCost, "The poll's totalWeiPaid field was not updated correctly.");
    assert.equal(poll[5], voter1Commitment.numVotes, "The poll's totalVotesCommitted field was not updated correctly.");
    
    // Voter cannot commit votes multiple times
    await expectThrow(votingContract.commitVote(
      1,
      voter1Commitment.hash,
      voter1Commitment.numVotes,
      { from: voter1, value: voter1Commitment.voteCost }
    ), EVMRevert);

    // Advance time to just before commit phase should end
    await increaseTimeTo(startRevealPhaseTime - duration.minutes(20));

    // Check that the correct amount of time is given for commit phase, 
    // and voter cannot reveal vote before commit phase ends
    await expectThrow(votingContract.revealVote(
      1,
      voter1Commitment.vote,
      voter1Commitment.salt
    ), EVMRevert);

    // Advance time to revealPhase
    await increaseTimeTo(startRevealPhaseTime);

    // Voter cannot commit vote after revealPhase begins.
    /*NOTE: the reason this is not tested with expectThrow() is because
    the first transaction that is run after a phase is scheduled to end
    will first run its phase-check modifier, see that the time for the 
    next phase has begun, and change the phase of the poll. If the 
    operation cannot be run in the new phase, the code will not execute, 
    but the tx will not revert, because the phase of the poll was changed. 
    So, calling commitVote() as the first tx after the commit phase ends 
    will cause the phase of the poll to change to reveal phase, but we 
    need to check that the votes were not committed. 
    */
    await votingContract.commitVote(
      1,
      voter2Commitment.hash,
      voter2Commitment.numVotes,
      { from: voter2, value: voter2Commitment.voteCost }
    );
    poll = await votingContract.polls(1);
    assert.equal(poll[10].toString(), 2, "Poll status has not been changed to reveal phase.");
    assert.equal(poll[5], voter1Commitment.numVotes, "Votes should not be committed after reveal phase begins.") 

    // Voter can reveal votes during commit phase
    const voter1InitialBalance = await web3.eth.getBalance(voter1);
    const totalWeiRefundedInitial = poll[1];
    const receipt = await votingContract.revealVote(
      1,
      voter1Commitment.vote,
      voter1Commitment.salt,
      { from: voter1 }
    )

    // Get poll info after revealing vote
    poll = await votingContract.polls(1);

    // Check that voter is refunded the correct amount (the entire 
    // amount paid, in this case, becuase there were no other voters in the poll.)
    const voter1FinalBalance = await web3.eth.getBalance(voter1);
    const gasUsed = receipt.receipt.gasUsed;
    const tx = await web3.eth.getTransaction(receipt.tx);
    const gasPrice = tx.gasPrice;
    const gasCost = gasUsed * gasPrice;
    const actualRefund = voter1FinalBalance.minus(voter1InitialBalance).plus(gasCost);
    // Refund = (totalWeiPaid / totalVotesCommitted) * number of votes placed by voter1
    const expectedRefund = (poll[0].dividedToIntegerBy(poll[5])).times(voter1Commitment.numVotes);
    assert.equal(actualRefund.toString(), expectedRefund, "Voter was not refunded correctly after revealing vote.")

    // Check that the polls totalWeiRefunded field is updated correctly
    const totalWeiRefundedChange = poll[1].minus(totalWeiRefundedInitial);
    assert.equal(totalWeiRefundedChange.toString(), actualRefund.toString(), "The totalWeiRefunded field of the poll was not updated correctly.")

    // Check that candidate Vote Count is updated correctly
    let candidate = await votingContract.getCandidateInfo(1, voter1Commitment.vote);
    assert.equal(candidate[0].toString(), voter1Commitment.numVotes, "Revealed votes not added to candidate's vote count correctly.");

    // Voter cannot reveal votes multiple times
    await expectThrow(votingContract.revealVote(
      1,
      voter1Commitment.vote,
      voter1Commitment.salt,
      { from: voter1 }
    ), EVMRevert);

    // Voter cannot reveal uncommitted votes
    await expectThrow(votingContract.revealVote(
      1,
      voter2Commitment.vote,
      voter2Commitment.salt,
      { from: voter1 }
    ), EVMRevert);

    // Advance time to just before reveal phase should end
    await increaseTimeTo(endRevealPhaseTime - duration.minutes(20));

    // Correct amount of time is given for reveal phase
    await expectThrow(votingContract.completePoll(1), EVMRevert);

    // Advance time to the end of the reveal phase
    await increaseTimeTo(endRevealPhaseTime);

    // completePoll correctly returns winner of poll
    const charityBalanceInitial = await web3.eth.getBalance(charity);
    const completePoll = await votingContract.completePoll(1);
    const winner = completePoll.logs[0].args._result.toString();
    assert.equal(winner, voter1Commitment.vote, "Complete poll does not correctly return winner");

    // Charity is transfered the correct amount (0 Wei in this case, because
    // all committed votes were revealed).
    poll = await votingContract.polls(1);
    const charityBalanceFinal = await web3.eth.getBalance(charity);
    charityPayment = charityBalanceFinal.minus(charityBalanceInitial);
    expectedCharityPayment = poll[0].minus(poll[1]);
    assert.equal(charityPayment.toString(), expectedCharityPayment.toString(), "Charity was not paid out the correct amount");

    // Poll phase changes to Completed after poll completion
    poll = await votingContract.polls(1);
    assert.equal(poll[10].toString(), 3, "Poll status not changed to Completed after poll completion.")

  });



  it("Voting functions work with multiple voters.", async () => {

    // Approve voters 1, 2, and 3 to vote in the poll
    await votingContract.approveVoter(1, voter1, { from: pollAdmin});
    await votingContract.approveVoter(1, voter2, { from: pollAdmin});
    await votingContract.approveVoter(1, voter3, { from: pollAdmin});

    // Add candidates to the poll
    await votingContract.addCandidate(1, candName1, { from: pollAdmin });
    await votingContract.addCandidate(1, candName2, { from: pollAdmin });

    // Advance time to Commit Phase
    await increaseTimeTo(startCommitPhaseTime);

    // Commit votes from all three voters
    await votingContract.commitVote(
      1, 
      voter1Commitment.hash, 
      voter1Commitment.numVotes, 
      { from: voter1, value: voter1Commitment.voteCost }
    );
    await votingContract.commitVote(
      1, 
      voter2Commitment.hash, 
      voter2Commitment.numVotes, 
      { from: voter2, value: voter2Commitment.voteCost }
    );
    await votingContract.commitVote(
      1, 
      voter3Commitment.hash, 
      voter3Commitment.numVotes, 
      { from: voter3, value: voter3Commitment.voteCost }
    );

    // Advance time to revealPhase
    await increaseTimeTo(startRevealPhaseTime);

    // Check that only the voter who committed the votes can reveal votes
    await expectThrow(votingContract.revealVote(
      1,
      voter1Commitment.vote,
      voter1Commitment.salt,
      { from: voter3 }
    ), EVMRevert);

    // Establish pre-reveal values
    let poll = await votingContract.polls(1);
    const totalWeiRefundedInitial = poll[1];
    const voter2InitialBalance = await web3.eth.getBalance(voter2);

    // Reveal votes from voters 1 and 2
    await votingContract.revealVote(
      1,
      voter1Commitment.vote,
      voter1Commitment.salt,
      { from: voter1 }
    )
    const receipt = await votingContract.revealVote(
      1,
      voter2Commitment.vote,
      voter2Commitment.salt,
      { from: voter2 }
    )

    // Check that voter is refunded the correct ammount in multi-voter situation
    poll = await votingContract.polls(1);
    const voter2FinalBalance = await web3.eth.getBalance(voter2);
    const gasUsed = receipt.receipt.gasUsed;
    const tx = await web3.eth.getTransaction(receipt.tx);
    const gasPrice = tx.gasPrice;
    const gasCost = gasUsed * gasPrice;
    const actualRefund = voter2FinalBalance.minus(voter2InitialBalance).plus(gasCost);
    // Refund = (totalWeiPaid / totalVotesCommitted) * number of votes placed by voter
    const expectedRefundVoter1 = (poll[0].dividedToIntegerBy(poll[5])).times(voter1Commitment.numVotes);
    const expectedRefundVoter2 = (poll[0].dividedToIntegerBy(poll[5])).times(voter2Commitment.numVotes);
    assert.equal(actualRefund.toString(), expectedRefundVoter2, "Voter was not refunded correctly after revealing vote.")

    // Check that the polls totalWeiRefunded field is updated correctly in multi-voter situation
    const totalWeiRefundedChange = poll[1].minus(totalWeiRefundedInitial);
    assert.equal(
      totalWeiRefundedChange.toString(), 
      (expectedRefundVoter1.plus(expectedRefundVoter2)).toString(), 
      "The totalWeiRefunded field of the poll was not updated correctly."
    )

    // Advance time to the end of the reveal phase
    await increaseTimeTo(endRevealPhaseTime);

    // completePoll correctly returns winner of poll
    poll = await votingContract.polls(1);
    const charityBalanceInitial = await web3.eth.getBalance(charity);
    const completePoll = await votingContract.completePoll(1);
    const winner = completePoll.logs[0].args._result.toString();
    assert.equal(winner, voter1Commitment.vote, "Complete poll does not correctly return winner");

     // Charity is transfered the correct amount
    poll = await votingContract.polls(1);
    const charityBalanceFinal = await web3.eth.getBalance(charity);
    charityPayment = charityBalanceFinal.minus(charityBalanceInitial);
    expectedCharityPayment = poll[0].minus(poll[1]);
    assert.equal(charityPayment.toString(), expectedCharityPayment.toString(), "Charity was not paid out the correct amount");

    // Committed votes can not be revealed after the end of the reveal phase
    await expectThrow(votingContract.revealVote(
      1,
      voter3Commitment.vote,
      voter3Commitment.salt,
      { from: voter3 }
    ), EVMRevert);

  });



  it("Voting functions work correctly in a tie situation.", async() => {

    // Approve voters 1, 2, and 3 to vote in the poll
    await votingContract.approveVoter(1, voter1, { from: pollAdmin});
    await votingContract.approveVoter(1, voter2, { from: pollAdmin});
    await votingContract.approveVoter(1, voter3, { from: pollAdmin});

    // Add candidates to the poll
    await votingContract.addCandidate(1, candName1, { from: pollAdmin });
    await votingContract.addCandidate(1, candName2, { from: pollAdmin });

    // Advance time to Commit Phase
    await increaseTimeTo(startCommitPhaseTime);

    // Commit votes from all three voters
    await votingContract.commitVote(
      1, 
      voter1Commitment.hash, 
      voter1Commitment.numVotes, 
      { from: voter1, value: voter1Commitment.voteCost }
    );
    await votingContract.commitVote(
      1, 
      voter2Commitment.hash, 
      voter2Commitment.numVotes, 
      { from: voter2, value: voter2Commitment.voteCost }
    );
    await votingContract.commitVote(
      1, 
      voter3Commitment.hash, 
      voter3Commitment.numVotes, 
      { from: voter3, value: voter3Commitment.voteCost }
    );

    // Advance time to revealPhase
    await increaseTimeTo(startRevealPhaseTime);

    // Reveal votes from all three voters
    await votingContract.revealVote(
      1,
      voter1Commitment.vote,
      voter1Commitment.salt,
      { from: voter1 }
    )
    await votingContract.revealVote(
      1,
      voter2Commitment.vote,
      voter2Commitment.salt,
      { from: voter2 }
    )
    await votingContract.revealVote(
      1,
      voter3Commitment.vote,
      voter3Commitment.salt,
      { from: voter3 }
    )

    // Advance time to the end of the reveal phase
    await increaseTimeTo(endRevealPhaseTime);

    // Check that completePoll correctly returns 0 in tie situation
    poll = await votingContract.polls(1);
    const charityBalanceInitial = await web3.eth.getBalance(charity);
    const completePoll = await votingContract.completePoll(1);
    const winner = completePoll.logs[0].args._result.toString();
    assert.equal(winner, 0, "Complete poll does not correctly return 0 in tie situation");

    // Charity is transfered the correct amount (0 Wei in this case, 
    // because all votes were revealed.)
    poll = await votingContract.polls(1);
    const charityBalanceFinal = await web3.eth.getBalance(charity);
    charityPayment = charityBalanceFinal.minus(charityBalanceInitial);
    expectedCharityPayment = poll[0].minus(poll[1]);
    assert.equal(charityPayment.toString(), expectedCharityPayment.toString(), "Charity was not paid out the correct amount");

  });



  it("Circuit breaker system functions correctly", async () => {

    // Approve voters 1, 2, and 3 to vote in poll
    await votingContract.approveVoter(1, voter1, { from: pollAdmin});
    await votingContract.approveVoter(1, voter2, { from: pollAdmin});
    await votingContract.approveVoter(1, voter3, { from: pollAdmin});

    // Add candidates to the poll
    await votingContract.addCandidate(1, candName1, { from: pollAdmin });
    await votingContract.addCandidate(1, candName2, { from: pollAdmin });

    // Advance time to Commit Phase
    await increaseTimeTo(startCommitPhaseTime);

    // Commit votes from voters 1 and 2
    await votingContract.commitVote(
      1, 
      voter1Commitment.hash, 
      voter1Commitment.numVotes, 
      { from: voter1, value: voter1Commitment.voteCost }
    );
    await votingContract.commitVote(
      1, 
      voter2Commitment.hash, 
      voter2Commitment.numVotes, 
      { from: voter2, value: voter2Commitment.voteCost }
    );

    // Check that withdraw() function does not work if stopped == false
    await expectThrow(votingContract.withdraw(
      1,
      voter1Commitment.vote,
      voter1Commitment.salt,
      { from: voter1 }
    ), EVMRevert);

    // Check that only owner can toggle circuit breaker
    await expectThrow(votingContract.toggleContractActive({ from: anyone }), EVMRevert);

    // Check that owner can successfully toggle circuit breaker
    await votingContract.toggleContractActive({ from: owner });

    // Check that makePoll() function does not work when stopped
    await expectThrow(votingContract.makePoll(
      startCommitPhaseTime,
      startRevealPhaseTime,
      firstVoteCost,
      description,
      charity,
      { from: pollAdmin }
    ), EVMRevert);

    // Check that commitVote does not work when stopped
    await expectThrow(votingContract.commitVote(
      1, 
      voter3Commitment.hash, 
      voter3Commitment.numVotes, 
      { from: voter3, value: voter3Commitment.voteCost }
    ), EVMRevert);

    // Establish pre-withdraw balances
    let poll = await votingContract.polls(1);
    const voter1InitialBalance = await web3.eth.getBalance(voter1);
    const totalWeiRefundedInitialWithdraw = poll[1];

    // Check withdraw() function
    const receipt = await votingContract.withdraw(
      1,
      voter1Commitment.vote,
      voter1Commitment.salt,
      { from: voter1 }
    )

    // Check that voter is refunded the correct amount
    poll = await votingContract.polls(1);
    const voter1FinalBalance = await web3.eth.getBalance(voter1);
    const gasUsed = receipt.receipt.gasUsed;
    const tx = await web3.eth.getTransaction(receipt.tx);
    const gasPrice = tx.gasPrice;
    const gasCost = gasUsed * gasPrice;
    const actualRefund = voter1FinalBalance.minus(voter1InitialBalance).plus(gasCost);
    // Refund = (totalWeiPaid / totalVotesCommitted) * number of votes placed by voter1
    const expectedRefund = (poll[0].dividedToIntegerBy(poll[5])).times(voter1Commitment.numVotes);
    assert.equal(actualRefund.toString(), expectedRefund, "Voter was not refunded correctly by withdraw() function.");

    // Check that the polls totalWeiRefunded field is updated correctly
    const totalWeiRefundedChangeWithdraw = poll[1].minus(totalWeiRefundedInitialWithdraw);
    assert.equal(totalWeiRefundedChangeWithdraw.toString(), actualRefund.toString(), "The totalWeiRefunded field of the poll was not updated correctly after emergency withdraw.")

    // Check that user can't withdraw multiple times
    await expectThrow(votingContract.withdraw(
      1,
      voter1Commitment.vote,
      voter1Commitment.salt,
      { from: voter1 }
    ), EVMRevert);

    // Can't withdraw if not committed
    await expectThrow(votingContract.withdraw(
      1,
      voter3Commitment.vote,
      voter3Commitment.salt,
      { from: voter3 }
    ), EVMRevert);

    // Advance time to reveal phase
    await increaseTimeTo(startRevealPhaseTime);
    
    // check that revealVote does not work while stopped
    await expectThrow(votingContract.revealVote(
      1,
      voter2Commitment.vote,
      voter2Commitment.salt,
      { from: voter2 }
    ), EVMRevert);

    // Toggle circuit breaker again (un-stop)
    await votingContract.toggleContractActive({ from: owner });

    // Check that makePoll() works again
    await votingContract.makePoll(
      // Note: These times are changed to satisfy the condition that new
      // polls can not be created in the past. However, the times for this
      // new poll are not used elsewhere.
      startRevealPhaseTime,
      endRevealPhaseTime,
      firstVoteCost,
      description,
      charity, 
      { from: pollAdmin }
    );
    poll2 = await votingContract.polls(2);
    assert.equal(poll2[8], pollAdmin, "Make poll does not work correctly after toggling stopped to false.");

    // Establish balances before revealing vote
    poll = await votingContract.polls(1);
    const voter2InitialBalance = await web3.eth.getBalance(voter2);
    const totalWeiRefundedInitialReveal = poll[1];

    // Check that revealVote() works again
    const receipt2 = await votingContract.revealVote(
      1,
      voter2Commitment.vote,
      voter2Commitment.salt,
      { from: voter2 }
    );

    // Check that voter is refunded the correct amount
    poll = await votingContract.polls(1);
    const voter2FinalBalance = await web3.eth.getBalance(voter2);
    const gasUsed2 = receipt2.receipt.gasUsed;
    const tx2 = await web3.eth.getTransaction(receipt2.tx);
    const gasPrice2 = tx2.gasPrice;
    const gasCost2 = gasUsed2 * gasPrice2;
    const actualRefund2 = voter2FinalBalance.minus(voter2InitialBalance).plus(gasCost2);
    // Refund = (totalWeiPaid / totalVotesCommitted) * number of votes placed by voter2
    const expectedRefund2 = (poll[0].dividedToIntegerBy(poll[5])).times(voter2Commitment.numVotes);
    assert.equal(actualRefund2.toString(), expectedRefund2.toString(), "Voter was not refunded correctly after revealing vote.")

    // Check that the polls totalWeiRefunded field is updated correctly
    const totalWeiRefundedChangeReveal = poll[1].minus(totalWeiRefundedInitialReveal);
    assert.equal(totalWeiRefundedChangeReveal.toString(), actualRefund2.toString(), "The totalWeiRefunded field of the poll was not updated correctly after revealing vote.")

    // Check that voter1 cannot reveal votes after calling withdraw() during emergency
    await expectThrow(votingContract.revealVote(
      1,
      voter1Commitment.vote,
      voter1Commitment.salt,
      { from: voter1 }
    ), EVMRevert);

  });



  it("sweepBalance() function works only for the owner of the contract.", async () => {

    // Approve voter 1 to vote in poll (so there is some balance in the contract)
    await votingContract.approveVoter(1, voter1, { from: pollAdmin});

    // Advance time to Commit Phase
    await increaseTimeTo(startCommitPhaseTime);

    // Commit votes from voter 1 (so there is some balance in the contract)
    await votingContract.commitVote(
      1, 
      voter1Commitment.hash, 
      voter1Commitment.numVotes, 
      { from: voter1, value: voter1Commitment.voteCost }
    );

    // Check that sweepBalance can only be called by owner 
    /* Note: This is a potentially dangerous power for the contract owner to
    have, as it essentially allows the owner to steal funds from any
    in-progress polls. This is oviously not the intended usage for this 
    function, and it will be removed during development. For now, it
    is here to prevent any eth from getting "stuck" in the contract. In
    the future, the plan is to replace this with more effective and 
    decentralized solutions to this problem.
    */
    await expectThrow(votingContract.sweepBalance({ from: anyone }), EVMRevert);

    // sweepBalance can be successfully called by owner
    const ownerInitialBalance = await web3.eth.getBalance(owner);
    const contractInitialBalance = await web3.eth.getBalance(votingContract.address);
    const receipt = await votingContract.sweepBalance({ from: owner });

    // Owner is sent the balance of the contract
    const ownerFinalBalance = await web3.eth.getBalance(owner);
    const gasUsed = receipt.receipt.gasUsed;
    const tx = await web3.eth.getTransaction(receipt.tx);
    const gasPrice = tx.gasPrice;
    const gasCost = gasUsed * gasPrice;
    // Not the intuitive way to check this, but this is a work-around
    // to avoid precision issues when a poll has a very low firstVoteCost
    const ownerBalanceChange = ownerFinalBalance.minus(ownerInitialBalance).plus(gasCost);
    assert.equal(ownerBalanceChange.toString(), contractInitialBalance.toString(), "sweepBalance did not correctly transfer contract balance");

  });



  it("kill() function works only for the owner of the contract.", async () => {

    // Approve voter 1 to vote in poll (so there is some balance in the contract)
    await votingContract.approveVoter(1, voter1, { from: pollAdmin});

    // Advance time to Commit Phase
    await increaseTimeTo(startCommitPhaseTime);

    // Commit votes from voter 1 (so there is some balance in the contract)
    await votingContract.commitVote(
      1, 
      voter1Commitment.hash, 
      voter1Commitment.numVotes, 
      { from: voter1, value: voter1Commitment.voteCost }
    );

    // kill() can only be called by owner
    await expectThrow(votingContract.kill({ from: anyone }), EVMRevert);

    // kill() can be successfully called by owner
    const ownerInitialBalance = await web3.eth.getBalance(owner);
    const contractInitialBalance = await web3.eth.getBalance(votingContract.address);
    const receipt = await votingContract.kill({ from: owner });

    // Owner is sent the balance of the contract
    const ownerFinalBalance = await web3.eth.getBalance(owner);
    const gasUsed = receipt.receipt.gasUsed;
    const tx = await web3.eth.getTransaction(receipt.tx);
    const gasPrice = tx.gasPrice;
    const gasCost = gasUsed * gasPrice;
    // Not the intuitive way to check this, but this is a work-around
    // to avoid precision issues when a poll has a very low firstVoteCost
    const ownerBalanceChange = ownerFinalBalance.minus(ownerInitialBalance).plus(gasCost);
    assert.equal(ownerBalanceChange.toString(), contractInitialBalance.toString(), "sweepBalance did not correctly transfer contract balance");

  });

  

  it("Poll creation integer overflows handled correctly", async () => {
    await expectThrow(votingContract.makePoll(
      43000000000,
      43000000001,
      43000000000,
      description,
      charity
    ), EVMRevert);
  });



  it("Candidate count overflow handled correctly", async () => {
    candidateCount = 1;
    while (candidateCount < 300) {
      if (candidateCount >= 256) {
        await expectThrow(votingContract.addCandidate(1, candName1, { from: pollAdmin }), EVMRevert);
      } else {
        await votingContract.addCandidate(1, candName1, { from: pollAdmin });
      }
      candidateCount++;
    };
  });

});