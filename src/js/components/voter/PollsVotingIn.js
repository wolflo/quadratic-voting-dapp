import React, { Component } from 'react';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import { Button } from 'react-bootstrap';
import { Link } from 'react-router-dom'; 
import '../../../../node_modules/react-bootstrap-table/dist/react-bootstrap-table-all.min.css';

const CreatedPhaseString = "Created";
const CommitPhaseString = "Commit Phase";
const RevealPhaseString = "Reveal Phase";
const CompletedPhaseString = "Completed";

class PollsVotingIn extends Component {
  constructor(props) {
    super(props);

    this.state = {
      pollsVotingIn: [],
    };
  }

  componentWillMount() {
    var pollsVotingInFilter = this.props.quadraticVotingInstance
      .VoterApproved(
        {_voter: this.props.accounts[0]},
        {fromBlock: 0, toBlock: 'latest'}
      )
    
    pollsVotingInFilter.get((error, result) => {
      var polls = [];
      var now = Math.round((new Date()).getTime() / 1000);
      for (let i = 0; i < result.length; i++) {
        let status;
        let startTime = result[i].args._startTime;
        let closeTime = result[i].args._closeTime;
        let completeTime = +closeTime + (+closeTime - +startTime);
        // Calculate poll status
        /* Note: data in these tables are calculated using events, which
        ends up being slightly messier than just querying the blockchain
        for data, but it's done this way for two reasons:
        1. To avoid an async call to the contract
        2. To avoid confusion between phases of a poll. If it is past a 
        polls commit phase time, but no contract functions have been called
        since that time passed, the contract will still consider the poll to 
        be in the commit phase, but the next call to the contract will change
        the poll state to the reveal phase, and if the call is to commit 
        a vote, that will fail.
        */
        if (now < startTime) {
          status = CreatedPhaseString
        } else if (now < closeTime) {
          status = CommitPhaseString
        } else if (now < completeTime) {
          status = RevealPhaseString
        } else {
          status = CompletedPhaseString
        }
        polls.push(
          {
            pollId: result[i].args._pollId,
            description: this.props.web3.toUtf8(result[i].args._description),
            status: status,
          }
        );
      }
      this.setState({ pollsVotingIn: polls });
    });
  }

  buttonFormatter(cell, row){
    let route = '/voter/' + row.pollId;
    let buttonText;
    if (row.status === CreatedPhaseString) 
      buttonText = "See Poll Info";
    if (row.status === CommitPhaseString)
      buttonText = "Commit a Vote";
    if (row.status === RevealPhaseString)
      buttonText = "Reveal Vote"
    if (row.status === CompletedPhaseString)
      buttonText = "See Poll Info"
    
    return (
      <Link to={route}>
        <Button 
          type="submit" 
          style={{width:'100%', height:'100%'}} 
        >
          {buttonText}
        </Button>
      </Link>
      
    );
  } 

  render() {
    return (
      <div>
        <h2>Polls Approved to Vote In:</h2>
        <BootstrapTable 
          data={this.state.pollsVotingIn} 
          options={{ noDataText:'You have not been approved to vote in any polls yet.' }}
          bordered={false}
          striped hover condensed>
          <TableHeaderColumn isKey={true} dataField='pollId'>Poll Id</TableHeaderColumn>
          <TableHeaderColumn dataField='description'>Description</TableHeaderColumn>
          <TableHeaderColumn dataField='status'>Current Status</TableHeaderColumn>
          <TableHeaderColumn dataField='button' dataFormat={this.buttonFormatter.bind(this)}></TableHeaderColumn>
        </BootstrapTable>
      </div>
    );
  }
}

export default PollsVotingIn;