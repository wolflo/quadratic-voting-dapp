import React, { Component } from 'react';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import { Button } from 'react-bootstrap';
import { Link } from 'react-router-dom'; 
import '../../../../node_modules/react-bootstrap-table/dist/react-bootstrap-table-all.min.css';

const CreatedPhaseString = "Created";
const CommitPhaseString = "Commit Phase";
const RevealPhaseString = "Reveal Phase";
const CompletedPhaseString = "Completed";

class PollsAdminFor extends Component {
  constructor(props) {
    super(props);

    this.state = {
      pollsAdminFor: [],
    };
  }

  componentWillMount() {
    var pollsCreatedFilter = this.props.quadraticVotingInstance
      .PollCreated(
        {_creator: this.props.accounts[0]},
        {fromBlock: 0, toBlock: 'latest'}
      )
    var pollAdminChangeFromFilter = this.props.quadraticVotingInstance
      .AdminTransferred(
        {_formerAdmin: this.props.accounts[0]},
        {fromBlock: 0, toBlock: 'latest'}
      )
    var pollAdminChangeToFilter = this.props.quadraticVotingInstance
      .AdminTransferred(
        {_newAdmin: this.props.accounts[0]},
        {fromBlock: 0, toBlock: 'latest'}
      )

    var polls = [];
    pollsCreatedFilter.get((error, resultCreated) => {
      pollAdminChangeFromFilter.get((error, resultAdminFrom) => {
        pollAdminChangeToFilter.get((error, resultAdminTo) => {
          var now = Math.round((new Date()).getTime() / 1000);
          for (let i = 0; i < resultCreated.length; i++) {
            let status;
            let startTime = resultCreated[i].args._startTime;
            let closeTime = resultCreated[i].args._closeTime;
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
                pollId: resultCreated[i].args._pollId,
                description: this.props.web3.toUtf8(resultCreated[i].args._description),
                status: status,
              }
            );
          }

          for (let j = 0; j < resultAdminFrom.length; j++) {
            for (let k = 0; k < polls.length; k++) {
              if (polls[k].pollId.toString() === resultAdminFrom[j].args._pollId.toString()) {
                polls.splice(k);
              }
            }
          }

          for (let x = 0; x < resultAdminTo.length; x++) {
            var now2 = Math.round((new Date()).getTime() / 1000);
            let status2;
            let startTime2 = resultAdminTo[x].args._startTime;
            let closeTime2 = resultAdminTo[x].args._closeTime;
            let completeTime2 = +closeTime2 + (+closeTime2 - +startTime2);
            if (now2 < startTime2) {
              status2 = CreatedPhaseString
            } else if (now2 < closeTime2) {
              status2 = CommitPhaseString
            } else if (now2 < completeTime2) {
              status2 = RevealPhaseString
            } else {
              status2 = CompletedPhaseString
            }
            polls.push(
              {
                pollId: resultAdminTo[x].args._pollId,
                description: this.props.web3.toUtf8(resultAdminTo[x].args._description),
                status: status2,
              }
            );
          }
          this.setState({ pollsAdminFor: polls });
        })
      })
    })    
  }  

  buttonFormatter(cell, row) {
    let route = '/admin/' + row.pollId;

    return (
      <Link to={route}>
        <Button 
          type="submit" 
          style={{width:'100%', height:'100%'}} 
          
        >
          Go to Admin Page
        </Button>
      </Link>
    );
  }   

  render() {
    return (
      <div>
        <h2>Polls Created/Administrated:</h2>
        <BootstrapTable 
          data={this.state.pollsAdminFor}
          options={{ 
            noDataText:'You have not created or been assigned to administrate any polls yet.'  
          }}
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

export default PollsAdminFor;