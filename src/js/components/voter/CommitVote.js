import React, { Component } from 'react'
import { Form, FormGroup, Label } from 'react-bootstrap'

class CommitVote extends Component {
  constructor(props) {
    super(props);

    this.state = {
      numVotes: 0,
    }

    this.commitVote = this.commitVote.bind(this);
  }

  commitVote(event) {
    event.preventDefault();
    if (this.refs.numVotes.value < 1)
      alert("You must place at least one vote.");

    return this.props.web3.eth.getAccounts((error, accounts) => {
      this.props.quadraticVotingInstance
      .getPollInfo(this.props.pollId)
      .then((result) => {
        return (this.refs.numVotes.value ** 2) * result[4];
      }).then((result) => {
         return this.props.quadraticVotingInstance.commitVote(
           this.props.pollId,
           this.refs.commitment.value,
           this.refs.numVotes.value,
           {
             from: accounts[0],
             gas: 6654755,
             value: result
           }
         )
      }).then((result) => {
        console.log(result)
      })
    });
  }

  handleNumVotesChange = () => {
    this.setState({
      numVotes: this.refs.numVotes.value,
    })
  }

  render() {
    return (
      <div className="form" style={{border:"thin solid black"}}>
        <h3>Commit Vote</h3>
        <Form>
          <FormGroup>
            <Label htmlFor="commitmentHash">Commitment Hash</Label>
            <input type="text" ref="commitment" maxLength="32"/>
          </FormGroup>
          <FormGroup>
            <Label htmlFor="numVotes">Number of Votes</Label>
            <input type="number" ref="numVotes" onChange={this.handleNumVotesChange} />
          </FormGroup>
          <input type="submit" value="Submit" onClick={this.commitVote} />
        </Form>
        <p>Cost of votes: {this.state.numVotes * this.state.numVotes * this.props.firstVoteCost} Wei</p>
        <br/>
        <p>The poll must currently be in the Commit Phase to call this function.</p>
        <p><strong>Commitment Hash:</strong> The keccak256 hash of the poll ID, the number of votes you wish to commit, the ID of the candidate you wish to vote for, and a secret salt (to be revealed during the reveal phase). For security, you should create this hash locally outside of the web browser. But, for convenience, you can copy and paste the hash provided after running the Hash Vote function above.</p>
        <p><strong>Number of Votes:</strong> This is the number of votes you would like to commit.</p>
        <p>Total cost of votes = (number of votes ^ 2) * Cost of the first vote</p>
      </div>
    );
  }
}

export default CommitVote;