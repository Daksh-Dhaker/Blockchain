import React, {Component} from 'react';
import logo from '../assets/logo.png'
import { Link } from 'react-router-dom';

class App extends Component {
    state = {
        wallet_info: {}
    };

    componentDidMount(){
        fetch(`${document.location.origin}/api/wallet-info`).then(response => response.json()).then(json => this.setState({wallet_info: json}));
    }

    render(){
        const {address, balance} = this.state.wallet_info;
        return(
            <div className='App'>
                <img className='logo' src={logo} alt ="logo" />
                <br></br>
                <div>Welcome to the blockchain...</div>
                <br></br>
                <div><Link to='/blocks'>Blocks</Link></div>
                <br/>
                <div><Link to='/conduct-transaction'>Conduct a Transaction</Link></div>
                <br/>
                <div><Link to='/transaction-pool'>Transaction Pool</Link></div>
                <br/>
                <div className='WalletInfo'>
                    <div> Adddress: {address}</div>
                    <div> Balance: {balance}</div>
                </div>

            </div>
        );
    }
}

export default App;