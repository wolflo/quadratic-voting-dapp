import React, { Component } from 'react';
import { Button } from 'react-bootstrap'

class CompletePoll extends Component {
  constructor(props) { 
    super(props);
    
    this.state = {
      topCandidate: null,
      amountDonated: null,
      resultLoaded: false,
    }

    this.completePoll = this.completePoll.bind(this);
  }
  completePoll(event) {
    event.preventDefault();
    return this.props.web3.eth.getAccounts((error, accounts) => {
      this.props.quadraticVotingInstance.completePoll(
        this.props.pollId,
        { from: accounts[0], gas: 665475 }
      ).then((resultCompletePoll) => {
        let topCandidate;
        let amountDonated = resultCompletePoll.logs[0].args._amountDonated.toString();
        let pollResult = resultCompletePoll.logs[0].args._result;
        if (pollResult.toString() === '0') {
          topCandidate = "Tie";
          this.setState({
            topCandidate: topCandidate,
            amountDonated: amountDonated,
            resultLoaded: true,
          });
        }
        else {
          this.props.quadraticVotingInstance.getCandidateInfo(
            this.props.pollId,
            pollResult
          ).then((resultCandidateInfo) => {
            this.setState({
              topCandidate: this.props.web3.toUtf8(resultCandidateInfo[1]),
              amountDonated: amountDonated,
              resultLoaded: true,
            });
          })
        }
      }) 
    })
  }

  render() {
    return (
      <div style={{border:"thin solid black"}}>
        <Button type="submit" onClick={this.completePoll}>Complete Poll</Button>
        {!this.state.resultLoaded
          ? null
          : <div>
              <p>Top Candidate: {this.state.topCandidate}</p>
              <p>Amount donated: {this.state.amountDonated} Wei</p>
            </div>
          }
      </div>
    );
  }
}

export default CompletePoll;