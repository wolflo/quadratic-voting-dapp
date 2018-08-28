import React, { Component } from 'react'

// Components
import PollsAdminFor from './components/admin/PollsAdminFor'
import PollsVotingIn from './components/voter/PollsVotingIn'
import MakePoll from './components/MakePoll'

class Home extends Component {

  render() {
    return (
      <div>
        <h4>Welcome to the Quadratic Voting DApp! To get started, make a poll using the function below.</h4>
        <PollsAdminFor
          web3={this.props.web3}
          quadraticVotingInstance={this.props.quadraticVotingInstance}
          accounts={this.props.accounts}
        /> 

        <PollsVotingIn 
          web3={this.props.web3} 
          quadraticVotingInstance={this.props.quadraticVotingInstance} 
          accounts={this.props.accounts}
        />
        <br/>
        <br/>

        <MakePoll 
          web3={this.props.web3}
          quadraticVotingInstance={this.props.quadraticVotingInstance}
        /> 
      </div>
    );
  }
}

export default Home;