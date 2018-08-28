import React, { Component } from 'react'
import { Form, FormGroup, Label, Button } from 'react-bootstrap'
import web3Utils from 'web3-utils'

class HashVote extends Component {
  constructor(props) {
    super(props);

    this.state = {
      hashedVote: null,
      salt: '',
    }

    this.hashVote = this.hashVote.bind(this);
  }

  hashVote(event) {
    event.preventDefault();
    if (this.refs.numVotes.value < 1)
      alert("You must place at least one vote.");
    if (this.refs.vote.value < 1)
      alert("Your vote must be the integer ID of the candidate you wish to vote for.");
    
    const hashWeb3 = web3Utils.soliditySha3(
      {type: 'uint256', value: this.props.pollId},
      {type: 'uint256', value: this.refs.numVotes.value},
      {type: 'uint256', value: this.refs.vote.value},
      {type: 'bytes32', value: this.refs.salt.value}
    )
    this.setState({
      hashedVote: hashWeb3,
    });
  }

  handleSaltClick = () => {
    return this.props.web3.eth.getAccounts((error, accounts) => {
      this.setState({
        salt: web3Utils.soliditySha3(accounts[0])
      })
    })
  }

  render () {
    const waitingForHash = this.state.hashedVote === null;
    return (
      <div style={{border:"thin solid black"}}>
        <div className="form">
          <h3>Hash Vote</h3>
          {waitingForHash
            ? null 
            : <div>
                <p>Hashed Vote: <strong>{this.state.hashedVote}</strong></p>
                <p>Copy and paste this value into the commit vote function below.</p>
              </div>
          }
          <p><strong>IMPORTANT:</strong> This is not a secure way to hash your vote for use on a production blockchain. This function is here to make exploring this DApp a little more friendly.</p>
          <Form>
            <FormGroup>
              <Label htmlFor="numVotes">Number of Votes</Label>
              <input type="number" ref="numVotes" />
            </FormGroup>
            <FormGroup>
              <Label htmlFor="vote">Vote (Candidate ID)</Label>
              <input type="number" ref="vote" />
            </FormGroup>
            <FormGroup>
              <Label htmlFor="salt">Salt</Label>
              <input type="text" ref="salt" value={this.state.salt} maxLength="32"/>
              <Button onClick={this.handleSaltClick}>Auto-generate Salt</Button>
            </FormGroup>
            <input type="submit" value="Submit" onClick={this.hashVote} />
          </Form>
          <br/>
          <p><strong>Number of Votes:</strong> This is the number of votes you would like to commit.</p>
          <p>Total cost of votes = (number of votes ^ 2) * Cost of the first vote</p>
          <p><strong>Vote:</strong> This is the candidate ID of the candidate you want to vote for (it should be an integer).</p>
          <p><strong>Salt:</strong> Auto-generate simply sets the salt as the keccak256 hash of your public key. On a production blockchain, your salt should be kept secret, should never be re-used, and should not be anything private or sensitive (as it will be revealed during the reveal phase).</p>
        </div>
      </div>
    );
  }
}

export default HashVote;