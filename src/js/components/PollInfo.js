import React, { Component } from 'react';
import CandidateList from './CandidateList';
import moment from 'moment';

class PollInfo extends Component {
  constructor(props) {
    super(props);

    this.state = {
      numVotersApproved: 0,
    }
  }

  componentWillMount() {
    var votersApprovedFilter = this.props.quadraticVotingInstance
      .VoterApproved(
        {_pollId: this.props.pollId},
        {fromBlock: 0, toBlock: 'latest'}
      )
    var votersRemovedFilter = this.props.quadraticVotingInstance
      .VoterRemoved(
        {_pollId: this.props.pollId},
        {fromBlock: 0, toBlock: 'latest'}
      )
    votersApprovedFilter.get((error, result1) => {
      votersRemovedFilter.get((error, result2) => {
        this.setState({
          numVotersApproved: result1.length - result2.length,
        })
      })
    })
  }

  render() {
    let startTime = this.props.startTime;
    let closeTime = this.props.closeTime;
    let completeTime = +closeTime + (+closeTime - +startTime)
    return (
      <div>
        <h1><b>{this.props.description}</b></h1>
        <ul>
          <li>Poll Id: <strong>{this.props.pollId}</strong></li>
          <li>Current Phase: <strong>{this.props.status}</strong></li>
          <li>Start Time: <strong>{moment(startTime.toString(), 'X').format('MMMM Do YYYY, h:mm a')}</strong></li>
          <li>Commit Phase Closes: <strong>{moment(closeTime.toString(), 'X').format('MMMM Do YYYY, h:mm a')}</strong></li>
          <li>Reveal Phase Closes: <strong>{moment(completeTime.toString(), 'X').format('MMMM Do YYYY, h:mm a')}</strong></li>
          <li>Number of voters: <strong>{this.state.numVotersApproved}</strong></li>
          <li>Total Votes Committed: <strong>{this.props.totalVotesCommitted.toString()}</strong></li>
          <li>Total Wei Paid: <strong>{this.props.totalWeiPaid.toString()}</strong></li>
          <li>Cost of First Vote: <strong>{this.props.firstVoteCost.toString()}</strong></li>
          {this.props.isAdmin
            ? null
            : <li>Admin Address: <strong>{this.props.admin}</strong></li>
          }
        </ul>
        <CandidateList 
          candidateCount={this.props.candidateCount}
          pollId={this.props.pollId}
          web3={this.props.web3}
          quadraticVotingInstance={this.props.quadraticVotingInstance}
        />
      </div>
    );
  }
  
}

export default PollInfo;