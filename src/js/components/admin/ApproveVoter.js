import React, { Component } from 'react';
import { Form, FormGroup, Label } from 'react-bootstrap'

class ApproveVoter extends Component {
  constructor(props) {
    super(props);

    this.approveVoter = this.approveVoter.bind(this);
  }

  approveVoter(event) {
    event.preventDefault();
    const pollId = this.props.pollId ? this.props.pollId : this.refs.pollId.value;
    return this.props.web3.eth.getAccounts((error, accounts) => {
      this.props.quadraticVotingInstance.approveVoter(
        pollId,
        this.refs.voter.value,
        {
          from: accounts[0],
          gas: 6654755
        }
      )
      .then((result) => {
        console.log(result)
      })
    });
  }

  render() {
    return (
      <div className="form" style={{border:"thin solid black"}}>
        <h3>Approve a Voter</h3>
        <Form>
          {this.props.pollId
            ? null
            : <FormGroup>
                <Label htmlFor="pollId">Poll ID</Label>
                <input type="number" ref="pollId" />
              </FormGroup>
          }
            
          <FormGroup>
            <Label htmlFor="voterAddress">Voter Address</Label>
            <input type="text" ref="voter" />
          </FormGroup>
          <input type="submit" value="Submit" onClick={this.approveVoter} />
        </Form>
      </div>
    );
  }
}

export default ApproveVoter;