import React, { Component } from 'react'; 
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom'; 
import QuadraticVotingContract from '../build/contracts/QuadraticVoting.json';
import getWeb3 from './utils/getWeb3';

// Components
import Home from './js/Home'
import Admin from './js/Admin'
import Voter from './js/Voter'

// Styles
import './css/oswald.css'
import './css/open-sans.css'
import './css/pure-min.css'
import './css/App.css'
import '../node_modules/react-bootstrap-table/dist/react-bootstrap-table-all.min.css'
import '../node_modules/input-moment/dist/input-moment.css'


class Nav extends Component {
  render() {
    return (
      <nav className="navbar pure-menu pure-menu-horizontal">
        <a className="nav-link" href="/">Quadratic Voting Dapp</a>
      </nav>
    );
  } 
}

class App extends Component {
  constructor(props) {
    super(props)

    this.state = {
      web3: null,
      quadraticVotingInstance: null,
      accounts: ['0x0'],
    }
  }

  componentWillMount() {
    // Get network provider and web3 instance using utils/getWeb3
    getWeb3.then(results => {
      this.setState({
        web3: results.web3
      })
      this.instantiateContract();
    })
    .catch(() => {
      console.log('Error finding web3.')
    })
  }

  instantiateContract() {
    const contract = require('truffle-contract')
    const quadraticVoting = contract(QuadraticVotingContract)
    quadraticVoting.setProvider(this.state.web3.currentProvider)

    // Get accounts
    this.state.web3.eth.getAccounts((error, accounts) => {
      quadraticVoting.deployed().then((instance) => {
        this.setState({
          quadraticVotingInstance: instance,
          accounts: accounts
        })
      })
    })
  }

  render() {

    const initializingContract = this.state.quadraticVotingInstance === null;

    return (
      <Router>
        <div className="App">
          <Nav />
          <main className="container">
            <h4><strong>Active Address:</strong> {this.state.accounts[0]}</h4>
            <div className="pure-g">
              <div className="pure-u-1-1">
                <div>
                  {initializingContract
                    ? <h2> 
                        This site requires a Web3 enabled browser. We suggest downloading 
                        the <a href="https://metamask.io/" target="_blank">Metamask</a> browser extension.
                      </h2>
                    : <Switch>

                        <Route 
                          exact path='/' 
                          render={(props) => 
                            <Home
                              web3={this.state.web3}
                              quadraticVotingInstance={this.state.quadraticVotingInstance}
                              accounts={this.state.accounts}
                            />
                          }
                        />
                        
                        <Route
                          path='/admin/:pollId'
                          render={(props) =>
                            <Admin 
                              web3={this.state.web3}
                              quadraticVotingInstance={this.state.quadraticVotingInstance}
                              accounts={this.state.accounts}
                              pollId={props.match.params.pollId}
                            />
                          }
                        />

                        <Route 
                          path='/voter/:pollId'
                          render={(props) =>
                            <Voter
                              web3={this.state.web3}
                              quadraticVotingInstance={this.state.quadraticVotingInstance}
                              accounts={this.state.accounts}
                              pollId={props.match.params.pollId}
                            />
                          }
                        />

                      </Switch>
                  }  
                </div>
              </div>
            </div>
          </main>
        </div>
      </Router>
    );
  }
}

export default App