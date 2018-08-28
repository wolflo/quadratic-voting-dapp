# Quadratic Voting

# Dev Setup and Usage
#### If you do not have truffle and ganache-cli installed already, run:
1. `npm install -g truffle`
2. `npm install -g ganache-cli`

### Once truffle and ganache-cli are installed, run:
1. `git clone https://github.com/nward13/QuadraticVoting.git`
2. `cd ./QuadraticVoting`
3. `npm install`

## To run tests:
1. `ganache-cli`  
In a separate terminal window:  
2. `truffle test`

## To run dev server:
1. `ganache-cli`  
In a separate terminal window:  
2. `npm run start`

# Project Basics

Quadratic voting is an alternative to the one-person-one-vote system in which votes can be purchased, either with real currency or with an artificially scarce "voting credit". The price of the votes is equal to the square of the total number of votes purchased. The main advantage of quadratic voting over a one-person-one-vote system is the ability to prevent "tyranny of the majority", in which a large number of people care little about an issue but overpower a minority group that cares very strongly about the same issue. Essentially, quadratic voting strives for a balance in which people give ground on issues that they care less about in exchange for a stronger voice on the issues they care more about. Governance is an area of particular importance for blockchain applications for several reasons. For one, blockchain is an emerging technology with tremendous potential to effect positive change in the world, but successfully harnessing this technology requires great care in these early stages of development to design a system which empowers everyone to work towards the greater good. Blockchain also provides an exciting opportunity to reinvent the process of governance. This is a rare possibility given the immense institutional inertia of political systems. This smart contract provides a rough approximation of a potential implementation of quadratic voting on the Ethereum blockchain using a commit/reveal system. I would love to hear any feedback about design decisions, security vulnerabilities, possible improvements, or interesting applications. The code is free and available to anyone who wishes to use it, but this is still very much a work in progress and I make no guarantees about the robustness or security.

## How to explore the DApp
The home page will prompt you to download MetaMask if you are not already running a Web3-enabled browser. Connect MetaMask to Localhost 8545 (the default port for ganache-cli and the development port configured for this project). The bassic flow of an election is:

#### Election Admin:
1. Create a poll on the homepage using "Make a Poll." The start time and close time determine the timing for the phases of the poll. The cost of the first vote determines how much voters have to pay for votes (total cost for votes = (# of votes committed ^ 2) * first vote cost). When voters commit votes they will have to provide this amount as a deposit. When they reveal their votes, they will be refunded an amount equal to the total paid in by committed voters divided by the total number of votes committed. This means that every voter receives the same refund per vote, regardless of how many votes they committed. Any voter who does not reveal their vote will lose their deposit. After the election is completed, the remaining deposits will be sent to the charity address.
2. After refreshing the page, you will see the poll under "Polls Created/Administrated." Follow the "Manage Poll" link to see the poll admin page. You can always reach this page by going to localhost:3000/admin/{ID-of-the-poll} where {ID-of-the-poll} is 1, 2, 3, etc.
3. Add Candidates to the poll. These can be simple choices such as "yes/no" or actual candidates, and you can add up to 255 candidates to a poll.
4. Approve voters to vote in the poll. Only approved voters will be able to commit and reveal votes. You can approve your own address.
5. Once voters are approved, the poll will move through the commit and reveal phases without any intervention on the part of the admin (as long as there are voters participating). Once the reveal phase is ended, the admin can run the Complete Poll function from the admin page to send the un-returned deposits to the charity address. It should be noted, however, that anyone has the ability to call this function after the reveal phase has ended, and, regardless of whether or not it is called, no voter will be able to reveal votes after the reveal phase deadline (defined as closeTime + (closeTime - startTime)).

#### Approved Voters:
1. Once your address is added to the list of approved voters for an election, refreshing the homepage will add the poll to your list of "Polls Approved to Vote In." Follow the link to the voter page for the election. You can always reach this page by going to localhost:3000/voter/{ID-of-the-poll} where {ID-of-the-poll} is 1, 2, 3, etc.
2. The next step is to hash your vote. On a production blockchain, you would either want to hash this locally on a trusted and very secure third party application (which my basic front-end is certainly not) or (the better option) offline on your own machine. The commitment hash is designed to keep your vote secret, and is the keccak256 hash of the poll ID, the number of votes you want to commit, the ID of the candidate you want to vote for (1, 2, 3, etc.), and a secret salt. This salt is important to ensuring your vote remains secret, so it should be kept secret until the reveal phase and should never be reused. However, it also should not contain any sensitive information, as it will be revealed in the reveal phase of the poll. The function provided on the voter page offers the option to auto-generate a salt (which simply takes the keccak256 of your public key, and is not secure for a production blockchain, but is good enough for testing purposes). After you fill in the rest of the data and submit, your hash will appear and can be copied-and-pasted into the Commit Vote function. If you want to hash your own commitment, there is a function provided in QuadraticVoting.sol that will help you check that you are correctly matching the keccak256 hash locally (there can be some issues with matching data type encodings, and it is very frustrating to not be able to reveal votes because your hash doesn't match). This function is for development only, and will be removed in the future.
3. Once your commitment hash is created and the poll has entered the commit phase (phase changes are intiated by most function calls to the contract, so if it is past the poll start time but the phase still reads 'Created' you will still be able to commit a vote), you can commit your vote using the hash and the number of votes you want to commit (this must be the same number of votes you used to create your commitment hash). The deposit required to commit the votes will be shown and automatically added to the MetaMask transaction.
4. After committing your votes, wait for the poll to enter the reveal phase. Again, phase changes are initiated by most function calls to the contract, so the reveal phase time is more important than the nominal poll status. You can reveal your vote by entering the ID of the candidate that you committed a vote for and the salt that you used in the commitment hash (the auto-generate salt option here creates the same salt as the auto-generate option in the hash function). After revealing your vote, your vote will be tallied and you will be refunded.  
`Refund = (total deposited by all voters / total # of votes committed by all voters) * # of votes that you committed`  
Note that this will not necessarily be the amount that you originally deposited. Voters that purchase larger numbers of votes will be refunded less per vote than those that commit small numbers. This is an intentional design of the system, and is discussed later in this README. Also note that the denominator is not the total number of votes revealed, so if users do not reveal committed votes, their deposits will be transferred to the charity address.


## Design Decisions
This system was loosely modeled after the Colony voting system discussed in these three great Medium posts:

https://blog.colony.io/towards-better-ethereum-voting-protocols-7e54cb5a0119 (1)

https://blog.colony.io/token-weighted-voting-implementation-part-1-72f836b5423b (2)

https://blog.colony.io/token-weighted-voting-implementation-part-2-13e490fe1b8a (3)

However, there are several significant differences in the implementation, the most obvious of which is the fact that Colony has created a token-weighted voting system which has very different implementation requirements. Ultimately, every blockchain voting system faces the challenge that there is no notion of an individual on the blockchain. The benefits of token-weighted voting are touched on in article (1) above. Token-weighted systems avoid vulnerability to Sybil attacks (when one user creates many "identities" to achieve some advantage in a peer-to-peer system) by determining the weight or importance of a vote based on the user's stake or token balance. This, in turn, brings up the challenge of ensuring that voters do not transfer tokens to other voters during voting, essentially double-counting the weight of the same coins. The colony approach combats this by using a partial lock on voting accounts. 

In a quadratic voting system, account locking is not needed because the balance of an account does not matter, only how much the account chooses to commit to the vote. However, the potential for a Sybil attack is once again an issue, as a user could create a large number of addresses to purchase every vote at the initial vote price (avoiding the quadratic scaling of vote cost). Most solutions to this so far involve "whitelisting" accounts in some form or another, which is not always ideal but can be acceptable in many situations. Below is a discussion of the solution used in this implementation as well as other potential solutions.

### Avoiding Sybil Attacks
A Sybil attack in a quadratic voting system would essentially mean that one individual, contract, cyborg, etc. can create multiple accounts and place one vote from each of them, purchasing every vote at the entry price instead of paying more for each additional vote. I considered several different approaches to the challenge of voter verification, including integrating with Uport and issuing ERC-721 "right-to-vote" tokens. Each approach has its own unique properties that could be ideal in certain applications and would be fun to play around with in the future. Ultimately, I settled temporarily on a simple address whitelisting system in which the creator of each election can add addresses to the approved voters list, and votes are only accepted from these addresses. This is definitely not a perfect solution in many contexts, and I am working on implementing a zkSNARK-based alternative.

#### Address Whitelisting
In this (currently implemented) solution, the election administrator adds the addresses of every approved voter to the contract before the vote commitment phase. This was selected mostly for simplicity, but it leaves slightly more power in the hands of the election administrator and also leaves the vote susceptible to vote-buying schemes (see Vote Buying section for more info on this).

#### zkSNARK-based whitelisting
This solution is not yet implemented, but I am working on adding it because it has a few distinct advantages over simple address whitelisting. Basically, the election administrator would add a merkle tree to the contract that contains a hash of some data with a "secret voter id". The secret voter id would be some value that is unique to the approved voters, known by both the voter and the election administrator, and not likely to be known by anyone else. An example would be a hash of a voter's social security number and birthday in a national election. **NOTE: Blockchain-based voting is not ready for applications in national elections, and there are many reasons to believe that it will never be a good choice for elections of that kind of scale and importance. This example is included for simplicity.

Once the merkle tree of approved voters is added to the contract, a voter would us a Zero-Knowledge Succinct Non-Interactive Argument of Knowledge (zkSNARK) to verify that they indeed have the secret voter id data of a leaf in the tree (i.e. I know both my social security number and birthday).

This still leaves quite a bit of power in the hands of the election admin, but some potential for abuse of this centralized power is eliminated because it is impossible for an outside observer to determine which voters have or have not been approved to vote. This also increases voter anonymity and helps make vote-buying mechanisms far more difficult to set up. Voters can vote from any address as long as they have the secret voter id data, making it possible to create a new Ethereum address for every election to avoid any votes being associated with the identity of an individual. This also interrupts the ability of vote-buying systems to identify the voters in an election and to verify that they voted the desired way. For more info on vote-buying in quadratic voting systems, see the Vote Buying section of this README.

#### Vote Buying


    1. Integrating with Uport and requiring an approval to vote to be issued from the election creator or the smart contract itself. This is similar to adding approved addresses, but is a much more robust long-term solution.
    2. Issuing ERC-721 tokens that include the address of the approved account, and can only be used by said account. These tokens could be issued as the "voting credits" themselves, or could simply be a right-to-vote token required in order to vote with either ETH or another token.
    3. Some system of requiring a minimum balance for a certain length of time.

Most of these solutions require some form of centralization in the system of issuing approvals, which is certainly less than ideal. However, it could be worth the tradeoff in many contexts, such as a DAO with trusted curators.

### Vote Storage
In the Colony voting system featured in the articles above, a double-linked list is used to store votes. I would highly suggest checking out the discussion of this data structure in the above articles, as they used some really interesting features such as requiring users to calculate where their vote should be inserted off-chain in order to save on gas costs and avoid running into the block-gas limit when inserting votes. This linked list is especially important because the contract must check if a user has an unrevealed vote every time they attempt to send a transaction or another address attempts to send a transaction to them. In our implementation, their is no token-locking, and thus less of a need for super-efficient searching through individual votes. I chose to store all votes in a double mapping from the voter's address => the ID of the poll => the Vote struct itself. 

### Voting with ETH
I played around with a few different ideas for voting value, but I settled on creating a contract that accepts ETH in exchange for votes. Alternatives would include integrating with existing ERC-20/223 tokens and issuing new tokens to approved voters in each election. The refund for each of these would depend on the exact implementation. For example, if a new token was created solely for voting in a series of elections, there would be no need to refund them. If integrated with a particular token contract, the refund could be strategically designed to suit the goals of the contract.

### Refunding
Because the contract accepts ETH in exchange for votes, each account that reveals their vote (see commit/reveal section for more info on this) receives a refund that is guaranteed to be greater than or equal to the cost of one vote. This stems from the fact that fractional votes can be submitted, but the vote minimum is one. Refunding each vote-revealer the same amount incentivizes submitting at least one vote and serves as a form of redistributing power in a large-scale system. The refund received is equal to the total paid into the election during the vote committing period divided by the total number of votes committed. As of now, the additional funds from voters who commit votes but do not reveal them simply remain in the contract. However, one alternative to this is pooling and using the funds in whatever way a group sees fit. Another would be to wait until the reveal phase of the election is ended and refund everyone more ETH (total paid in / total votes revealed rather than committed). The downside of this is loss of liquidity. Essentially, everyone who committed and revealed votes would need to wait for the reveal phase to end before receiving their refund. As the contract is currently designed, the creator of the election would also be able to hold everyone's refund hostage by refusing to complete the election (see the section on election creator power).

### Power Held by the Election Creator (planned change)
** Edit: The method of changing poll status has been changed. This is no longer up to the poll creator, but the creator does still have the power to determine which addresses can vote in the poll. Now, before any function requiring a particular poll status is run, a check is made to ensure that the poll is in the correct phase based on block.timestamp. If it is not (i.e. poll is still in commitPhase but it is after the poll is scheduled to close) the poll status is changed automatically. This significantly decreases the poll creator's power to influence the election and eliminates the vulnerability discussed below. However, the additional checks increase the gas cost of running most functions in the contract. Additionally, user's (or the user interface) would need to check poll status and check the current time against the scheduled start and close time of the poll in order to avoid running a function that fails the checks, thus losing gas costs for the check and for writing the new poll status to the blockchain. **

    As it is currently implemented, the election creator holds a significant amount of power over the election. The creator decides when to start and end each phase of the election (with some limits based on the originally declared start and end times) and who is allowed to vote in the election. While this makes sense for more informal polls where the creator can adjust times based on how many people have been able to vote, it opens some vulnerabilities if the creator were not trustworthy. The creator could significantly influence the election by changing the timing of changes between phases. She/he/contract could also exploit a vulnerability in which the commit phase can last much longer than scheduled, ending after the reveal phase was scheduled to end. Then, the creator could quickly reveal a vote and immediately end the reveal phase. The creator would not benefit significantly from this, but could prevent the rest of the voters from receiving their refunds and influence the outcome of the elections. Also, if the refund were changed to be based on the number of voters who revealed their votes (discussed above), the creator could gain all of the money committed to the election through this method.



### Commit/Reveal
The commit/reveal system is well-discussed in articles (1) and (2) above. Essentially, a user submits a hash of some information about the election, their vote, and a secret or salt during the commit phase. This way, no one else knows how others voted before they commit their own vote. In a partial-lock voting system, commit/reveal also serves the purpose of allowing people to maintain liquidity of their tokens between the time they vote and the end of the election, but this is not the case in a quadratic voting system. In the reveal phase, voters who committed a vote reveal the salt that they used and the vote that they committed. Everyone else can verify that the hash matches their committed vote, and that they actually voted the way that they claim. Additionally, votes are counted as they are revealed instead of all at once at the end of the election. This prevents problems with the block gas limit when counting votes.

### Vote Buying
Disclaimer: Calling this a design decision is a bit of a misnomer, because there is no specific piece of code in this contract that solves the problem yet. However, I think the susceptibility of blockchain-based voting (esp. quadratic voting) systems to the development of vote-buying markets is worth discussing a bit. The issue of vote buying is still largely unexplored in the blockchain space. While it has certainly been considered and investigated, I believe there are a lot of unknowns about how it will play out in the long run. It is extremely important that developers try to predict as well as possible how the incentive structures of the environments we create will evolve over time. However, this is obviously easier said than done, and getting it right will require the collaboration of many different groups. In the context of quadratic voting systems, vote buying is especially concerning, because the costs for an attacker are significantly lower than in other voting systems. As a small scale example, if I wanted to vote twice in an election, I could afford to pay someone else double the cost of their vote to place a second vote for me, because that is what it would cost for me to buy a second vote from my own address. The discrepancy only increases with the more votes an attacker wants to buy, and this is before you factor in the potential gain from influencing the election that inspires vote-buying in a one-person-one-vote system. 

For an interesting discussion on vote-buying on the blockchain, see Phil Daian's article here:
http://hackingdistributed.com/2018/07/02/on-chain-vote-buying/

For more general discussions about the downfalls of blockchain-based voting and on-chain governance, see Vitalik Buterin's article here:
https://vitalik.ca/general/2018/03/28/plutocracy.html

and Vlad Zamfir's article here:
https://medium.com/@Vlad_Zamfir/against-on-chain-governance-a4ceacd040ca

## Future Additions
This contract is still a work in progress. The near-future plans include improving the voter whitelisting process using zkSNARKS, further limiting the power of election creators, and adding tests (this is obviously a glaring omission, but it is in the works).



Thank you for checking out this project! Please contact me with any questions, comments, suggestions, or criticisms.

-Nick
