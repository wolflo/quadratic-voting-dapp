import React, { Component } from 'react';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';

class CandidateList extends Component {
  constructor(props) {
    super(props);

    this.state = {
      candidates: [],
      stateSet: false,
    }
  }

  componentWillMount() {
    var tempCandidates = [];
    var promises = [];

    for (let i = 1; i <= this.props.candidateCount; i++) {
      promises.push(this.props.quadraticVotingInstance
        .getCandidateInfo(this.props.pollId, i)
      );
    }

    Promise.all(promises).then((results) => {
      for (let j = 0; j < results.length ; j++) {
        tempCandidates.push(
          {
            candidateId: j + 1,
            name: this.props.web3.toUtf8(results[j][1]),
            voteCount: results[j][0].toString(),
          }
        );
      }

      this.setState({
        candidates: tempCandidates,
        stateSet: true,
      })
    })
  }


  render() {
    const stateSet = this.state.stateSet;
    return (
      <div>
        <h3>Candidates</h3>
          {!stateSet
            ? <p>Waiting for data from Blockchain...</p>
            : <div>
                <BootstrapTable
                  data={this.state.candidates}
                  options={{
                    noDataText:'There are no candidates for this poll yet. Add candidates below.'
                  }}
                  bordered={false}
                  striped hover condensed>
                  <TableHeaderColumn isKey={true} dataField="candidateId">Candidate ID</TableHeaderColumn>
                  <TableHeaderColumn dataField="name" dataAlign="center">Name</TableHeaderColumn>
                  <TableHeaderColumn dataField="voteCount" dataAlign="center">Vote Tally</TableHeaderColumn>
                </BootstrapTable>
              </div>
          }
      </div>
    );
  }
}

export default CandidateList;