import React, { Component } from 'react';
import { Form, FormGroup, Label } from 'react-bootstrap'

class AddCandidate extends Component {
  constructor(props) {
    super(props);

    this.addCandidate = this.addCandidate.bind(this);
  }

  addCandidate(event) {
    event.preventDefault();
    const pollId = this.props.pollId ? this.props.pollId : this.refs.pollId.value;
    return this.props.web3.eth.getAccounts((error, accounts) => {
      this.props.quadraticVotingInstance.addCandidate(
        pollId,
        this.refs.name.value,
        {
          from: accounts[0],
          gas: 6654755
        }
      )
      .then((result) => {
        console.log(result);
      })
    });
  }


  render() {
    return (
      <div className="form" style={{border:"thin solid black"}}>
        <h3>Add Candidate</h3>
        <Form>
          {this.props.pollId
            ? null
            : <FormGroup>
                <Label htmlFor="pollId">Poll Id</Label>
                <input type="number" ref="pollId" />
              </FormGroup>
          }

          <FormGroup>
            <Label htmlFor="name">Name</Label>
            <input type="text" ref="name" maxLength="32" />
          </FormGroup>

          <input type="submit" value="Submit" onClick={this.addCandidate} />
        </Form>
      </div>
    );
  }
}

export default AddCandidate;