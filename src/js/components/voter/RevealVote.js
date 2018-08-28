import React, { Component } from 'react'
import { Form, FormGroup, Label, Button } from 'react-bootstrap'
import web3Utils from 'web3-utils'

class RevealVote extends Component {
  constructor(props) {
    super(props);
    
    this.state = {
      salt: '',
    }

    this.revealVote = this.revealVote.bind(this);
  }

  revealVote(event) {
    event.preventDefault();
    if (this.refs.vote.value < 1)
      alert("Your vote must be the integer ID of the candidate you wish to vote for.");

    return this.props.web3.eth.getAccounts((error, accounts) => {
      this.props.quadraticVotingInstance.revealVote(
        this.props.pollId,
        this.refs.vote.value,
        this.refs.salt.value,
        {
          from: accounts[0],
          gas: 6654755
        }
      )
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
    return (
      <div className="form" style={{border:"thin solid black"}}>
        <h3>Reveal Vote</h3>
        <Form>
          <FormGroup>
            <Label htmlFor="vote">Vote (Candidate ID)</Label>
            <input type="number" ref="vote" />
          </FormGroup>
          <FormGroup>
            <Label htmlFor="salt">Salt</Label>
            <input type="text" ref="salt" value={this.state.salt} maxLength="32"/>
            <Button onClick={this.handleSaltClick}>I used auto-generated salt</Button>
          </FormGroup>
          <input type="submit" value="Submit" onClick={this.revealVote} />
        </Form>
        <br/>
        <p>The poll must currently be in the Reveal Phase to call this function.</p>
        <p><strong>Vote: </strong>This is the candidate ID of the candidate you committed your vote for (it should be an integer).</p>
        <p><strong>Salt: </strong>This should be the same salt you used to hash your vote. If you used your most precious secret as a salt, now is the time to abandon your votes, becuase your salt will be revealed on the blockchain.</p>
      </div>
    );
  }
}

export default RevealVote;