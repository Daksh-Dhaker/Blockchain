import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import Transaction from './Transaction';
import { Button } from 'react-bootstrap';
import history from '../history';

const POLL_INTERVAL_MS = 10000;

class TransactionPool extends Component {
    state = {transaction_pool_map: {}};
    
    fetchTransactionPoolMap = () => {
        fetch(`${document.location.origin}/api/transaction-pool-map`)
        .then(response => response.json())
        .then(json => this.setState({ transaction_pool_map: json }))
    }

    fetchMineTransactions = () => {
        fetch(`${document.location.origin}/api/mine-transactions`)
        .then(response => {
            if(response.status === 200){
                alert('success');
                history.push('/blocks');
            }else{
                alert('The mine transactions did not complete.');
            }
        });

    }

    componentDidMount(){
        this.fetchTransactionPoolMap();

        this.fetchPoolMapInterval = setInterval(
            () => this.fetchTransactionPoolMap(),
            POLL_INTERVAL_MS
        )
    }

    componentWillUnmount(){
        clearInterval(this.fetchPoolMapInterval);
    }

    render(){
        return (
            <div className='TransactionPool'>
                <div><Link to='/'>Home</Link></div>
                <h3>TransactionPool</h3>
                {
                    Object.values(this.state.transaction_pool_map).map(transaction => {
                        return (
                            <div key={transaction.id}>
                                <hr></hr>
                                <Transaction transaction={transaction}></Transaction>
                            </div>
                        )
                    })
                }
                <hr/>
                <Button
                    bsStyle={"danger"}
                    onClick={this.fetchMineTransactions}
                >
                    Mine the transactions
                </Button>
            </div>
        )
    }
}

export default TransactionPool;