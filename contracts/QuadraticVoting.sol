pragma solidity ^0.4.24;

import "./SafeMath.sol";
import "./Owned.sol";


/**
@title QuadraticVoting
@dev Allows users to create elections and purchase votes in ETH with
votes priced based on a quadratic voting mechanism 
(total cost = (# of votes) ** 2). Implemented using commit/reveal system.
*/
contract QuadraticVoting is Owned {

    using SafeMath256 for uint;
    using SafeMath32 for uint32;
    using SafeMath8 for uint8;
    

    // ==========
    // EVENTS:
    // ==========

    event PollCreated(
        address indexed _creator, 
        uint _pollId, 
        uint _startTime,
        uint _closeTime,
        bytes32 _description
    );

    event AdminTransferred(
        address indexed _formerAdmin,
        address indexed _newAdmin,
        uint _pollId, 
        uint _startTime,
        uint _closeTime,
        bytes32 _description
    );

    event PollCompleted(
        uint indexed _pollId,
        uint _result,
        uint _amountDonated
    );

    event VoterApproved(
        uint indexed _pollId,
        address indexed _voter,
        bytes32 _description,
        uint _startTime,
        uint _closeTime
    );

    event VoterRemoved(
        uint indexed _pollId,
        address indexed _voter
    );


    // =========
    // Data Structures and STATE VARIABLES:
    // =========

    enum PollStatus {created, commitPhase, revealPhase, completed}

    struct Candidate {
        uint32 voteCount;       // Number of votes revealed for the candidate
        bytes32 name;           // Name of candidate or description of option
    }

    struct Poll {
        uint totalWeiPaid;      // Total amount paid into the poll (in Wei)
        uint totalWeiRefunded;   // Amount of Wei paid out after revealed votes
        uint32 startTime;       // Earliest time poll can move into commitPhase
        uint32 closeTime;       // Earliest time poll can move into revealPhase
        uint32 firstVoteCost;   // Cost of the first vote (in Wei). Cost for each additional vote scales quadratically
        uint32 totalVotesCommitted;     // Total # of votes committed for the poll 
        uint8 candidateCount;  // Number of candidates in the poll
        bytes32 description;    // Brief (32 bytes) description of the poll
        address admin;        // Address of the poll administrator
        address charity;         // Address of the charity to send extrafunds from any un-revealed votes
        PollStatus status;      // Current status of the poll. 'created', 'commitPhase', 'revealPhase', or 'completed'
        mapping (uint => Candidate) candidates; // Mapping of candidates in the election
        mapping (address => bool) approvedVoters;   /* Addresses approved 
            to vote (to prevent Sybil attacks using multiple addresses 
            for cheaper votes) */
    }

    struct Vote {
        uint32 numVotes;        // Number of votes purchased / committed
         /* Commitment hash consisting of pollId, number of votes, 
         vote (vote is a uint that represents the key in the candidates 
         mapping corresponding to the candidate voted for), and salt.
         Note that salt should be kept secret, and a new salt should be 
         used each time. */
        bytes32 commitment;
    }

    // Circuit-breaker bool
    bool private stopped = false;
    
    // Track number of polls to use as pollId's
    uint public pollCount;

    // Access each poll by pollId
    mapping (uint => Poll) public polls;

    // Double mapping from user address => pollId => user's vote
    mapping (address => mapping (uint => Vote)) public votes;


    // ==========
    // MODIFIERS:
    // ==========

    /** 
    @dev Requires msg.sender to be the poll's admin. Much of the poll
    functionality is currently limited to the poll admin, but this 
    should be modified in situations where the poll admin's influence 
    needs to be limited.
    */
    modifier onlyAdmin(uint _pollId) { 
        require (
            polls[_pollId].admin == msg.sender,
            "msg.sender must be Poll Admin."
        ); 
        _; 
    }

    // Circuit-breaker modifiers in case of a problem with the contract
    modifier stopInEmergency { require(!stopped); _; }
    modifier onlyInEmergency { require(stopped); _; }

    modifier createdPhase(uint _pollId) { 
        /* If it is past poll start time, but poll is still in Created 
        Phase, change to Commit Phase */
        if (
            polls[_pollId].status == PollStatus.created && 
            now >= polls[_pollId].startTime
        ) 
        {
            polls[_pollId].status = PollStatus.commitPhase;
        } else {
            require (
                polls[_pollId].status == PollStatus.created,
                "Poll must be in the Created phase."    
            ); 
            _;
        }
    }

    modifier createdOrCommitPhase(uint _pollId) {
        /* If it is past poll start time, but poll is still in Created 
        Phase, change to Commit Phase */
        if (
            polls[_pollId].status == PollStatus.created && 
            now >= polls[_pollId].startTime
        ) 
        {
            polls[_pollId].status = PollStatus.commitPhase;
        }
        /* If it is past poll closeTime, but poll is still in Commit
        Phase, change to Reveal Phase */
        if (
            polls[_pollId].status == PollStatus.commitPhase &&
            now >= polls[_pollId].closeTime
        )
        {
            polls[_pollId].status = PollStatus.revealPhase;
        } else {
            // Check that poll is in Created or Commit Phase
            require (
                polls[_pollId].status == PollStatus.created || 
                polls[_pollId].status == PollStatus.commitPhase,
                "Poll must be in Created or Commit Phase."
            );
            _;       
        }
    }

    modifier commitPhase(uint _pollId) { 
        /* If it is past poll startTime, but poll is still in Created 
        Phase, change to Commit Phase */
        if (
            polls[_pollId].status == PollStatus.created && 
            now >= polls[_pollId].startTime
        ) 
        {
            polls[_pollId].status = PollStatus.commitPhase;
        }
        /* If it is past poll closeTime, but poll is still in Commit
        Phase, change to Reveal Phase */
        if (
            polls[_pollId].status == PollStatus.commitPhase &&
            now >= polls[_pollId].closeTime
        )
        {
            polls[_pollId].status = PollStatus.revealPhase;
        } else {
            // Check that poll is in Commit Phase
            require (
                polls[_pollId].status == PollStatus.commitPhase,
                "Poll must be in Commit phase."
            ); 
            _; 
        }
    }

    modifier revealPhase(uint _pollId) { 
        /* If it is past poll closeTime, but poll is still in Commit
        Phase, change to Reveal Phase */
        if (
            polls[_pollId].status == PollStatus.commitPhase &&
            now >= polls[_pollId].closeTime
        )
        {
            polls[_pollId].status = PollStatus.revealPhase;
        }
        /*If it is past poll closeTime + (closeTime - startTime), but
        poll is still in Reveal Phase, change to completed. This gives
        the reveal phase the same amount of time as the commitment phase. */
        if (
            polls[_pollId].status == PollStatus.revealPhase &&
            now >= polls[_pollId].closeTime + 
            (polls[_pollId].closeTime - polls[_pollId].startTime)
        )
        {
            polls[_pollId].status = PollStatus.completed;
        } else {
            // Check that poll is in revealPhase
            require (
                polls[_pollId].status == PollStatus.revealPhase,
                "Poll must be in Reveal phase."    
            ); 
            _; 
        }
        
    }

    modifier completePhase(uint _pollId) {
        /*If it is past poll closeTime + (closeTime - startTime), but
        poll is still in Reveal Phase, change status to completed. This 
        gives the reveal phase the same amount of time as the commitment 
        phase. */
        if (
            now >= polls[_pollId].closeTime + 
            (polls[_pollId].closeTime - polls[_pollId].startTime)
        )
        {
            polls[_pollId].status = PollStatus.completed;
        }
        require(
            polls[_pollId].status == PollStatus.completed,
            "Poll must be in Completed Phase."
        );
        _;
    }

    modifier onlyApprovedVoters(uint _pollId) { 
        require (
            polls[_pollId].approvedVoters[msg.sender] == true,
            "msg.sender must be approved to vote in the poll."    
        ); 
        _; 
    }


    // ==========
    // POLLING INTERFACE:
    // ==========

    /**
    @dev Creates a poll, with msg.sender becoming the poll admin
    @param _startTime The earliest time poll can be changed to commitPhase
    @param _closeTime The earliest time poll can be changed to revealPhase
    @param _firstVoteCost Cost of the first vote (in Wei). The cost of each 
            additional vote squares quadratically based on firstVoteCost.
            Cost of Votes = (# of votes)**2 * firstVoteCost
    @param _description Short (32 bytes) description of poll
    */
    function makePoll(
        uint32 _startTime, 
        uint32 _closeTime, 
        uint32 _firstVoteCost,
        bytes32 _description,
        address _charity
    ) 
    public stopInEmergency returns (uint) 
    {
        /* check that the poll closes after it starts, and the startTime
        is no earlier than the current time (some leeway provided here to
        account for inconsistencies with block.timestamp. But, don't 
        want to schedule any polls that start 10 years before present) 
        */
        require (
            _closeTime > _startTime && _startTime >= now - 1000,
            "Poll must start after the present time and close after start time."
        );
        require(_firstVoteCost >= 1, "First vote cost must be greater than 1 Wei");

        // Create poll with provided inputs
        pollCount = pollCount.add(1);
        polls[pollCount].startTime = _startTime;
        polls[pollCount].closeTime = _closeTime;
        polls[pollCount].firstVoteCost = _firstVoteCost;
        polls[pollCount].charity = _charity;
        polls[pollCount].description = _description;
        polls[pollCount].admin = msg.sender;
        
        emit PollCreated(msg.sender, pollCount, _startTime, _closeTime, _description);

        return pollCount;
    }

    /**
    @dev Adds a candidate to a poll. Note that it would be preferable
    in some situations to require candidates to be added only during the
    Created phase to guarantee every voter could see all candidates 
    before committing their vote. However, currently candidates can be 
    added during both the Created and Commit phases to allow more 
    flexibility in informal polls that start immediately after creation.
    @param _pollId Id of the poll to add candidate to. msg.sender must
            be the admin of this poll
    @param _name Candidate name, short description of option, etc.
     */
    function addCandidate(uint _pollId, bytes32 _name) 
        public 
        onlyAdmin(_pollId)
        createdOrCommitPhase(_pollId)
        stopInEmergency
        returns (uint) 
    {
        // SafeMath8 also catches this require(), but this allows an error message to be provided
        require(polls[_pollId].candidateCount < 255, "Can not add more than 255 candidates.");
        uint8 newCandidateCount = polls[_pollId].candidateCount;
        newCandidateCount = newCandidateCount.add(1);
        polls[_pollId].candidates[newCandidateCount].name = _name;
        polls[_pollId].candidateCount = newCandidateCount;
    }

    /**
    @dev Adds a voter to the approved voter's list. Approved voters are
    necessary to prevent a sybil attack using many addresses to place
    votes at firstVoteCost. See ReadMe for discussion of other possible
    implementations to prevent sybil attack
    @param _pollId Id of the poll to add approved voter for. msg.sender
            must be the admin of this poll.
    @param _voter Address of the vote to add to approvedVoters
     */
    function approveVoter(uint _pollId, address _voter) 
        public 
        stopInEmergency
        onlyAdmin(_pollId) 
        createdOrCommitPhase(_pollId) 
        returns (bool) 
    {
        polls[_pollId].approvedVoters[_voter] = true;
        emit VoterApproved(
            _pollId, 
            _voter,
            polls[_pollId].description,
            polls[_pollId].startTime,
            polls[_pollId].closeTime    
        );
        return true;
    }

    /**
    @dev Changes administrative privileges to a poll. msg.sender must be
    the current admin of the poll.
    @param _pollId Id of the poll to change admin for
    @param _newAdmin Address of the new admin
     */
    function transferAdmin(uint _pollId, address _newAdmin) 
        public 
        stopInEmergency
        onlyAdmin(_pollId) 
        returns (address) 
    {
        polls[_pollId].admin = _newAdmin;
        emit AdminTransferred(
            msg.sender, 
            _newAdmin, 
            _pollId, 
            polls[_pollId].startTime, 
            polls[_pollId].closeTime, 
            polls[_pollId].description
        );
        return polls[_pollId].admin;
    }

    /**
    @dev Remove a voter from the approved list. Can not be used once reveal
    phase has started or after voter has already committed vote, as voter
    would lose committed funds.
    @param _pollId Id of the poll. msg.sender must be the admin of this poll.
    @param _voter Address of the vote to remove from approvedVoters
    */
    function removeApprovedVoter(uint _pollId, address _voter) 
        public 
        stopInEmergency
        onlyAdmin(_pollId) 
        createdOrCommitPhase(_pollId) 
        returns (bool) 
    {
        // Can not remove voter if they already committed votes
        require (
            votes[_voter][_pollId].numVotes == 0,
            "Address has already committed votes and cannot be removed from election."
        );
        polls[_pollId].approvedVoters[_voter] = false;
        emit VoterRemoved(_pollId, _voter);
        return true;
    }

    /**
    @dev Change poll into reveal phase (if not already) and return the
    result of the poll (uint returned represents the key of the winner
    in the candidates mapping). NOTE: In the event of a tie, in order to
    avoid returning 255 "winning" candidates, 0 is returned, and the user
    or front-end should check each candidate's voteCount manually
    @param _pollId Id of the poll to complete. msg.sender must be admin
    */
    function completePoll(uint _pollId) public completePhase(_pollId) returns (uint) {
        uint topChoice;
        uint donationAmount = polls[_pollId].totalWeiPaid - polls[_pollId].totalWeiRefunded;
        for (uint i = 1; i <= polls[_pollId].candidateCount; i++) {
            if
            (
                polls[_pollId].candidates[i].voteCount != 0 &&
                polls[_pollId].candidates[i].voteCount == 
                polls[_pollId].candidates[topChoice].voteCount
            )
            {
                emit PollCompleted(_pollId, 0, donationAmount);
                polls[_pollId].charity.transfer(donationAmount);
                return 0;
            }
            if 
            (
                polls[_pollId].candidates[i].voteCount > 
                polls[_pollId].candidates[topChoice].voteCount
            ) 
            {
                topChoice = i;
            }
        }
        emit PollCompleted(_pollId, topChoice, donationAmount);
        polls[_pollId].charity.transfer(donationAmount);
        return topChoice;
    }


    // ==========
    // VOTING INTERFACE:
    // ==========

    /**
    @dev Commit votes. Allows users to vote anytime during the commitment
    phase without influencing the poll outcome by allowing others to see
    the current votes before committing.
    @param _pollId Id of the poll to vote in. Must be an approved voter.
    @param commitment Commitment hash consisting of pollId, number of votes, 
         vote (index of chosen candidate in the voterCount array), and salt.
         Note that salt should be kept secret, and a new salt should be 
         used each time.
    @param _numVotes number of votes committed. This is revealed during
        the commit phase to calculate cost of the vote commit, and to 
        provide the proper refund to voters who reveal their votes.
     */
    function commitVote(uint _pollId, bytes32 commitment, uint32 _numVotes) 
        public 
        payable 
        stopInEmergency
        onlyApprovedVoters(_pollId) 
        commitPhase(_pollId) 
        returns (bool) 
    {
        /* Can submit fractions of votes, but must submit at least one 
        vote, because voteRevealerRefund will return at least the cost 
        of one vote */
        require (_numVotes >= 1, "Must submit at least one vote.");

        /* Can vote only one time per election (but can cast multiple 
        votes at that time) */
        require (
            votes[msg.sender][_pollId].numVotes == 0,
            "Can only commit votes once."
        );

        // voteCost = numVotes**2 * firstVoteCost
        uint voteCost = (_numVotes.mul(_numVotes)).mul(polls[_pollId].firstVoteCost);

        // Check that voter paid enough for the desired number of votes
        require (
            msg.value == voteCost, 
            "msg.value must equal the cost of the votes committed."
        );

        // Commit the vote(s) and adjust totalVotesCommitted and totalWeiPaid
        Vote memory newVote = Vote(uint32(_numVotes), commitment);
        votes[msg.sender][_pollId] = newVote;
        polls[_pollId].totalVotesCommitted = polls[_pollId].totalVotesCommitted.add(_numVotes);
        polls[_pollId].totalWeiPaid = polls[_pollId].totalWeiPaid.add(msg.value);
        return true;
    }

    /**
    @dev Reveal votes.
    @param _pollId Id of the poll to reveal votes in. Must be an approved voter.
    @param _vote The same vote that was originally submitted within the 
        commitment hash, where the vote is a uint corresponding to the 
        candidateId (the key for the candidate in the candidates mapping)
    @param _salt The salt used in the commitment hash.
        keccak256(pollId, numVote, vote, salt) must match the commitment
        hash for vote to be counted. Since salt is revealed, a new salt
        should be used each time an address votes in a poll
     */
    function revealVote(uint _pollId, uint _vote, bytes32 _salt) 
        public 
        stopInEmergency
        onlyApprovedVoters(_pollId) 
        revealPhase(_pollId) 
        returns (uint) 
    {
        // Check that hash(pollId, vote, numVotes, salt) == commitment
        Vote memory committedVote = votes[msg.sender][_pollId];
        uint32 numVotes = committedVote.numVotes;
        bytes32 revealHash = keccak256(
            abi.encodePacked(
                _pollId, 
                uint(numVotes), 
                _vote, 
                _salt
            )
        );
        require (
            revealHash == committedVote.commitment,
            "Hash does not match the committed hash."
        );

        /* Delete the original vote to reduce gas costs and prevent the 
        same commitment from being revealed multiple times. User's are
        still prevented from committing more votes by poll phase 
        restrictions */
        delete votes[msg.sender][_pollId];

        /* Count votes. Tally numVotes to the voteCount of the selected
        candidate */
        require (
            _vote > 0 && _vote <= polls[_pollId].candidateCount,
            "Vote must be placed for a valid candidate."
        );
        uint _voteCount = uint(polls[_pollId].candidates[_vote].voteCount);
        _voteCount = _voteCount.add(numVotes);
        polls[_pollId].candidates[_vote].voteCount = uint32(_voteCount);

        /* Calculate the voter refund and add the refund to totalWeiRefunded 
        Refund = (totalWeiPaid / totalVotesCommitted) * numberOfVotesCommitted 
        Note: currently there is no adjustment for the lack of precision 
        in integer division in Solidity (answers are always rounded down to
        the nearest integer). This can result in the voteRevealerRefund
        being slightly lower than it otherwise should be. */
        uint voteRevealerRefund = (polls[_pollId].totalWeiPaid).div(polls[_pollId].totalVotesCommitted);
        uint totalReturned = polls[_pollId].totalWeiRefunded;
        totalReturned = totalReturned.add(voteRevealerRefund * numVotes);
        polls[_pollId].totalWeiRefunded = totalReturned;

        // Refund the voter for revealing their vote
        msg.sender.transfer(voteRevealerRefund * numVotes);
        return voteRevealerRefund;
    }


    // ==========
    // Getter functions
    // ==========

    function getPollState(uint _pollId) public view returns (PollStatus) {
        return polls[_pollId].status;
    }

    /**
    @dev Returns all info for the poll struct. Not the most readable,
    but currently the best way to return a struct in a public function.
    @param _pollId Id of the poll to return info for
     */
    function getPollInfo(uint _pollId) public view returns 
    (
        uint totalWeiPaid,
        uint totalWeiRefunded, 
        uint32 startTime, 
        uint32 closeTime, 
        uint32 firstVoteCost, 
        uint32 totalVotesCommitted, 
        uint8 candidateCount, 
        bytes32 description, 
        address admin, 
        address charity,
        PollStatus status
    ) 
    {
        totalWeiPaid = polls[_pollId].totalWeiPaid;
        totalWeiRefunded = polls[_pollId].totalWeiRefunded;
        startTime = polls[_pollId].startTime;
        closeTime = polls[_pollId].closeTime;
        firstVoteCost = polls[_pollId].firstVoteCost;
        totalVotesCommitted = polls[_pollId].totalVotesCommitted;
        candidateCount = polls[_pollId].candidateCount;
        description = polls[_pollId].description;
        admin = polls[_pollId].admin;
        charity = polls[_pollId].charity;
        status = polls[_pollId].status;
    }

    function getCandidateInfo(uint _pollId, uint _candidateId) 
    public view returns
    (
        uint32 voteCount,
        bytes32 name
    ) 
    {
        voteCount = polls[_pollId].candidates[_candidateId].voteCount;
        name = polls[_pollId].candidates[_candidateId].name;
    }

    function isUserVoter(uint _pollId, address _user) 
        public 
        view 
        returns (bool) 
    {
        return polls[_pollId].approvedVoters[_user];
    }

    
    // ==========
    // Owner-only and emergency functions
    // ==========

    function toggleContractActive() public onlyOwner {
        stopped = !stopped;
    }

    function sweepBalance() public onlyOwner {
        owner.transfer(address(this).balance);
    }
    
    function kill() public onlyOwner {
        selfdestruct(owner);
    }

    /**
    @dev Allows voters who have already committed votes to withdraw their
    refund in the event of an issue that requires the contract to be
    stopped. Does not tally any votes, but requires the voter's committed
    vote information for security.
    @param _pollId Id of the poll to claim refund from. Must be an 
    approved voter.
    @param _vote The same vote that was originally submitted within the 
        commitment hash, where the vote is a uint corresponding to the 
        candidateId (the key for the candidate in the candidates mapping)
    @param _salt The salt used in the commitment hash.
        keccak256(pollId, numVote, vote, salt) must match the commitment
        hash for vote to be counted. Since salt is revealed, a new salt
        should be used each time an address votes in a poll
     */
    function withdraw(uint _pollId, uint _vote, bytes32 _salt)
        public
        onlyApprovedVoters(_pollId)
        onlyInEmergency
        returns (uint)
    {
        // Check that hash(pollId, vote, numVotes, salt) == commitment
        Vote memory committedVote = votes[msg.sender][_pollId];
        uint32 numVotes = committedVote.numVotes;
        bytes32 committedHash = committedVote.commitment;
        bytes32 revealHash = keccak256(
            abi.encodePacked(
                _pollId, 
                uint(numVotes), 
                _vote, 
                _salt
            )
        );
        require (
            revealHash == committedHash,
            "Hash does not match the committed hash."
        );

        /* Delete the original vote to reduce gas costs and prevent the 
        same commitment from being claimed for a refund or revealed in
        the future */
        delete votes[msg.sender][_pollId];

        /* Calculate the voter refund and add the refund to totalWeiRefunded 
        Refund = (totalWeiPaid / totalVotesCommitted) * numberOfVotesCommitted 
        Note: currently there is no adjustment for the lack of precision 
        in integer division in Solidity (answers are always rounded down to
        the nearest integer). This can result in the voteRevealerRefund
        being slightly lower than it otherwise should be. */
        uint voteRevealerRefund = (polls[_pollId].totalWeiPaid).div(polls[_pollId].totalVotesCommitted);
        uint totalReturned = polls[_pollId].totalWeiRefunded;
        totalReturned = totalReturned.add(voteRevealerRefund * numVotes);
        polls[_pollId].totalWeiRefunded = totalReturned;

        // Refund the voter for revealing their vote
        msg.sender.transfer(voteRevealerRefund * numVotes);
        return voteRevealerRefund;
    }

    ////

    /** IMPORTANT: Hashing your vote on the blockchain is extremely
    insecure and completely defeats the purpose of a commit-reveal
    system, as everyone can see the vote you hashed. This function is 
    included here for development to give anyone testing the contract
    an easy way to confirm that their locally-created hash matches
    the on-chain keccak256 used in the revealVote() function. */
    function hash(uint _pollId, uint _numVotes, uint _vote, bytes32 salt) 
        public view returns (bytes32) {
            /* For testing purposes, check that commitment vote is within
            the number of candidates in the poll to prevent confusion 
            from committing an invalid vote */ 
        require (
            _vote <= polls[_pollId].candidateCount,
            "Vote must be placed for a valid candidate."
        );
        return keccak256(abi.encodePacked(_pollId, _numVotes, _vote, salt));
    } 
  
}