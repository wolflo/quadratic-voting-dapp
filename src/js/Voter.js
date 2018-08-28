import React, { Component } from 'react';
import PollInfo from './components/PollInfo';
import CommitVote from './components/voter/CommitVote'
import HashVote from './components/voter/HashVote'
import RevealVote from './components/voter/RevealVote'
import { Link } from 'react-router-dom';
import { Button } from 'react-bootstrap';

const CreatedPhaseString = "Created";
const CommitPhaseString = "Commit Phase";
const RevealPhaseString = "Reveal Phase";
const CompletedPhaseString = "Completed";

class Voter extends Component {
  constructor(props) {
    super(props);

    this.state = {
      description: null,
      admin: null,
      startTime: null,
      closeTime: null,
      status: null,
      firstVoteCost: null,
      totalVotesCommitted: null,
      totalWeiPaid: null,
      candidateCount: null,
    }
  }

  componentWillMount() {
    this.props.quadraticVotingInstance.isUserVoter(this.props.pollId, this.props.accounts[0])
      .then((result1) => {
        this.props.quadraticVotingInstance.getPollInfo(this.props.pollId)
          .then((result) => {
            let status;
            if (result[10].toString() === '0')
              status = CreatedPhaseString;
            if (result[10].toString() === '1')
              status = CommitPhaseString;
            if (result[10].toString() === '2')
              status = RevealPhaseString;
            if(result[10].toString() === '3')
              status = CompletedPhaseString;
            this.setState({
              totalWeiPaid: result[0],
              startTime: result[2],
              closeTime: result[3],
              firstVoteCost: result[4],
              totalVotesCommitted: result[5],
              candidateCount: result[6],
              description: this.props.web3.toUtf8(result[7]),
              admin: result[8],
              status: status,
              isUserVoter: result1,
            })
          })
      })
  }

  render() {

    const waitingForData = this.state.startTime === null;
    const userIsAdmin = this.state.admin === this.props.accounts[0];
    const userIsVoter = this.state.isUserVoter;
    const adminRoute = '/admin/' + this.props.pollId;

    const AdminLink = () => (
      !userIsAdmin
        ? null
        : <div>
            <h3>Admin Info</h3>
            <Link to={adminRoute}>
              <Button
                type="submit"
              >
                Manage Poll
              </Button>
            </Link>
          </div>
    );
    
    const VoterDom = props => (
      !userIsVoter
        ? <h2>Sorry, you are not approved to vote in this poll.</h2>
        : <div>
            <PollInfo
              pollId={this.props.pollId}
              description={this.state.description}
              admin={this.state.admin}
              startTime={this.state.startTime}
              closeTime={this.state.closeTime}
              status={this.state.status}
              candidateCount={this.state.candidateCount}
              firstVoteCost={this.state.firstVoteCost}
              totalVotesCommitted={this.state.totalVotesCommitted}
              totalWeiPaid={this.state.totalWeiPaid}
              web3={this.props.web3}
              quadraticVotingInstance={this.props.quadraticVotingInstance}
              isAdmin={userIsAdmin}
            />
            <br/>
            <br/>
            <div style={{border:"thick solid black"}}>
              <h3>How to Vote</h3>
              <ol>
                <li>Create a hash of your vote. You can use the function below, or create this hash locally outside of your web browser. This keeps your vote secret during the Commit Phase of the poll.</li>
                <li>Wait for the poll to be in the Commit Phase, then commit your vote using the function below. To commit a vote, you must deposit the square of the number of votes you want to commit. A portion of this deposit will be refunded if you reveal your vote.</li>
                <li>Wait for the poll to be in the Reveal Phase, then reveal your committed vote using the function below. After revealing, your votes will be tallied. Everyone who reveals their vote is refunded an amount equal to the total paid into the poll divided by the total number of votes committed.</li>
              </ol>
            </div>
            <br/>
            <HashVote 
              web3={this.props.web3}
              quadraticVotingInstance={this.props.quadraticVotingInstance}
              pollId={this.props.pollId}
            />
            <br/>

            <CommitVote 
              web3={this.props.web3}
              quadraticVotingInstance={this.props.quadraticVotingInstance}
              pollId={this.props.pollId}
              firstVoteCost={this.state.firstVoteCost}
            />
            <br/>

            <RevealVote 
              web3={this.props.web3}
              quadraticVotingInstance={this.props.quadraticVotingInstance}
              pollId={this.props.pollId}
            />
            <br/>
          
            <AdminLink />
          </div>
    );

    return (
      <div>
        {waitingForData
          ? <h2>Waiting for data from the Blockchain...</h2>
          : <VoterDom />
        }
      </div>
    );
  }
}

export default Voter;