import React, { Component } from 'react';
import { Form, FormGroup, Label } from 'react-bootstrap'
import InputMoment from 'input-moment'
import moment from 'moment'

class MakePoll extends Component {
  constructor(props) {
    super(props);

    this.state = {
      momentStartTime: moment(),
      momentCloseTime: moment().clone().add(10, 'minutes'),
      momentCompleteTime: moment().clone().add(20, 'minutes'),
      showStartTimePicker: false,
      showCloseTimePicker: false,
    };

    this.makePoll = this.makePoll.bind(this);
  }
  
  makePoll(event) {
    event.preventDefault();
    if (moment() > this.state.momentStartTime.clone().add(7, 'minutes')) {
      alert("Poll must start after the current time.");
    } else if (this.state.momentCloseTime <= this.state.momentStartTime) {
      alert("Commit Phase must start before Reveal Phase.");
    } else if (this.refs.firstVoteCost.value < 1) {
      alert("First vote must cost at least 1 Wei.")
    } else {
      return this.props.web3.eth.getAccounts((error, accounts) => {
          this.props.quadraticVotingInstance.makePoll(
            this.state.momentStartTime.unix(),
            this.state.momentCloseTime.unix(),
            this.refs.firstVoteCost.value,
            this.refs.description.value,
            this.refs.charityAddress.value,
          {
            from: accounts[0],
            gas: 6654755
          }
      )
        .then((result) => {
          console.log(result)
        })
      });
    }
  }

  handleChangeStartTime = moment => this.setState({ momentStartTime: moment });

  handleStartTimeClick = () => {
    this.setState({ showStartTimePicker: true });
  }

  handleSaveStartTime = () => {
    this.setState({ 
      showStartTimePicker: false, 
      momentCloseTime: this.state.momentStartTime.clone().add(10, 'minutes'), 
      momentCompleteTime: this.state.momentStartTime.clone().add(20, 'minutes'), 
    });
  }

  handleChangeCloseTime = moment => this.setState({ momentCloseTime: moment });

  handleCloseTimeClick = () => {
    this.setState({ showCloseTimePicker: true });
  }

  handleSaveCloseTime = () => {
    let phaseTime = this.state.momentCloseTime - this.state.momentStartTime;
    this.setState({ 
      showCloseTimePicker: false,
      momentCompleteTime: this.state.momentCloseTime.clone().add(phaseTime),
    });
  }

  render() {
    return (
      <div className="form" style={{border:"thin solid black"}}>
        <h3>Make a Poll</h3>
        <Form>  
          
          <FormGroup>
            <Label htmlFor="startTime">Start of Commit Phase: </Label>
            <input type="text" ref="startTime" style={{width: "215px"}} value={this.state.momentStartTime.format('MMMM Do YYYY, h:mm a')} readOnly onClick={this.handleStartTimeClick}/>
          </FormGroup>
          {this.state.showStartTimePicker
            ? <InputMoment
                moment={this.state.momentStartTime}
                onChange={this.handleChangeStartTime}
                onSave={this.handleSaveStartTime}
                minStep={1}
                hourStep={1}
                prevMonthIcon="ion-ios-arrow-left" // default
                nextMonthIcon="ion-ios-arrow-right" // default
              />
            : null
          }
          <FormGroup>
            <Label htmlFor="closeTime">Start of Reveal Phase: </Label>
            <input type="text" ref="closeTime" style={{width: "215px"}} value={this.state.momentCloseTime.format('MMMM Do YYYY, h:mm a')} readOnly onClick={this.handleCloseTimeClick}/>
          </FormGroup>
          {this.state.showCloseTimePicker
            ? <InputMoment
                moment={this.state.momentCloseTime}
                onChange={this.handleChangeCloseTime}
                onSave={this.handleSaveCloseTime}
                minStep={1}
                hourStep={1}
                prevMonthIcon="ion-ios-arrow-left" // default
                nextMonthIcon="ion-ios-arrow-right" // default
              />
            : null
          }
          <p>End of Reveal Phase: {this.state.momentCompleteTime.format('MMMM Do YYYY, h:mm a')}</p>
          <FormGroup>
            <Label htmlFor="firstVoteCost">Cost of First Vote (in Wei) </Label>
            <input type="number" ref="firstVoteCost" />
          </FormGroup>
          <FormGroup>
            <Label htmlFor="description">Short Description of Poll: </Label>
            <input type="text" ref="description" maxLength="32" />
          </FormGroup>
          <FormGroup>
            <Label htmlFor="charityAddress">Address of Charity: </Label>
            <input type="text" ref="charityAddress" maxLength="32" />
          </FormGroup>
          <p>If voters commit votes but do not reveal them, their deposits will be sent to the charity address after the poll is completed.</p>
          <input type="submit" value="Submit" onClick={this.makePoll} />
        </Form>
      </div>
    );
  }
}

export default MakePoll;