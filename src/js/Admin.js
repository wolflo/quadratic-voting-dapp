import React, { Component } from 'react';
import PollInfo from './components/PollInfo';
import ApproveVoter from './components/admin/ApproveVoter';
import AddCandidate from './components/admin/AddCandidate';
import TransferAdmin from './components/admin/TransferAdmin';
import CompletePoll from './components/admin/CompletePoll';
import { Link } from 'react-router-dom';
import { Button } from 'react-bootstrap';


const CreatedPhaseString = "Created";
const CommitPhaseString = "Commit Phase";
const RevealPhaseString = "Reveal Phase";
const CompletedPhaseString = "Completed";

class Admin extends Component {
  constructor(props) {
    super(props);

    this.state = {
      description: null,
      admin: null,
      startTime: null,
      closeTime: null,
      completeTime: null,
      status: null,
      firstVoteCost: null,
      totalVotesCommitted: null,
      totalWeiPaid: null,
      totalWeiRefunded: null,
      candidateCount: null,
      charity: null,
    }
  }

  componentWillMount() {
    this.props.quadraticVotingInstance.isUserVoter(this.props.pollId, this.props.accounts[0])
      .then((result1) => {
        this.props.quadraticVotingInstance.getPollInfo(this.props.pollId)
          .then((result) => {
            let completeTime = result[3].plus(result[3]).minus(result[2]);
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
              totalWeiRefunded: result[1],
              startTime: result[2],
              closeTime: result[3],
              completeTime: completeTime,
              firstVoteCost: result[4],
              totalVotesCommitted: result[5],
              candidateCount: result[6],
              description: this.props.web3.toUtf8(result[7]),
              admin: result[8],
              charity: result[9],
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
    const voteRoute = '/voter/' + this.props.pollId;
    
    const VoteLink = () => (
      <div>
        <h3>Vote</h3>
        {!userIsVoter
          ? <h3>Sorry, you are not currently approved to vote in this poll.</h3>
          : <Link to={voteRoute}>
              <Button 
                type="submit"  
              >
                Vote in Poll
              </Button>
            </Link>
        }
      </div>
    );

    const AdminDom = props => {
      var now = Math.round((new Date()).getTime() / 1000);
      return ( 
        !userIsAdmin
          ? <h2>Sorry, you are not the current admin of the poll.</h2>
          : <div> 
              <PollInfo 
                pollId={this.props.pollId}
                description={this.state.description}
                admin={this.state.admin}
                startTime={this.state.startTime}
                closeTime={this.state.closeTime}
                status={this.state.status}
                candidateCount={this.state.candidateCount}
                currentPhase={this.state.currentPhase}
                firstVoteCost={this.state.firstVoteCost}
                totalVotesCommitted={this.state.totalVotesCommitted}
                totalWeiPaid={this.state.totalWeiPaid}
                web3={this.props.web3}
                quadraticVotingInstance={this.props.quadraticVotingInstance}
                isAdmin={true}
              />
              <br/>
              <br/>
              <AddCandidate 
                web3={this.props.web3}
                quadraticVotingInstance={this.props.quadraticVotingInstance}
                pollId={this.props.pollId}
              />
              <br/>
              <ApproveVoter 
                web3={this.props.web3}
                quadraticVotingInstance={this.props.quadraticVotingInstance}
                pollId={this.props.pollId}
              />
              <br/>
              <TransferAdmin 
                web3={this.props.web3}
                quadraticVotingInstance={this.props.quadraticVotingInstance}
                pollId={this.props.pollId}
              />
              <br/>
              {now > this.state.completeTime.toString()
                ? <CompletePoll 
                    web3={this.props.web3}
                    quadraticVotingInstance={this.props.quadraticVotingInstance}
                    pollId={this.props.pollId}
                    amountDonated={this.state.totalWeiPaid - this.state.totalWeiRefunded}
                  />
                : null
              }
              <VoteLink />
            </div>
      );
    };

    return(
      <div>

        {waitingForData
          ? <h2>Waiting for data from the Blockchain...</h2>
          : <AdminDom />  
        }

      </div>
    );
  }
}

export default Admin;