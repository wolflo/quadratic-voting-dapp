import React, { Component } from 'react'
import { Form, FormGroup, Label } from 'react-bootstrap'

class TransferAdmin extends Component {
  constructor(props) {
      super(props);

      this.transferAdmin = this.transferAdmin.bind(this);
  }

  transferAdmin(event) {
    event.preventDefault();
    return this.props.web3.eth.getAccounts((error, accounts) => {
      this.props.quadraticVotingInstance.transferAdmin(
        this.props.pollId,
        this.refs.newAdmin.value,
        {
          from: accounts[0],
          gas: 6654755
        }
      )
        .then((result) => {
          console.log(result);
        })
    })
  }

  render () {
    return (
      <div className="form" style={{border:"thin solid black"}}>
        <h3>Transfer Admin Privileges</h3>
        <Form>
          <FormGroup>
            <Label htmlFor="newAdmin">New Admin Address</Label>
            <input type="text" ref="newAdmin" />
          </FormGroup>
          <input type="submit" value="Submit" onClick={this.transferAdmin} />
        </Form>
      </div>
    );
  }

}

export default TransferAdmin;