const {Transaction} = require('./transaction');

class Transaction_pool{
    constructor(){
        this.transaction_map = {};
    }

    set_transaction(transaction){
        this.transaction_map[transaction.id] = transaction;
    }

    existing_transaction({input_address}){
        const transactions = Object.values(this.transaction_map);

        return transactions.find(transaction => transaction.input.address === input_address);
    }

    set_map(transaction_pool_map){
        this.transaction_map = transaction_pool_map;
    }

    valid_transactions(){
        return Object.values(this.transaction_map).filter(
            transaction => Transaction.valid_transaction(transaction) 
        );
    }

    clear(){
        this.transaction_map = {};
    }

    clear_blockchain_transactions({ chain }){
        for(let i=1;i<chain.length;i++){
            const block = chain[i];

            for(let transaction of block.data){
                if(this.transaction_map[transaction.id]){
                    delete this.transaction_map[transaction.id];
                }
            }
        }
    }    
}

module.exports = Transaction_pool;