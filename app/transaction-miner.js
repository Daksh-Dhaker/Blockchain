const { Transaction } = require('../wallet/transaction');

class Transaction_miner{
    constructor({blockchain, transaction_pool, wallet, pubsub}){
        this.blockchain = blockchain;
        this.transaction_pool = transaction_pool;
        this.wallet = wallet;
        this.pubsub = pubsub;
    }

    mine_transactions(){
        // get the transaction pool's valid transactions
        const valid_transactions = this.transaction_pool.valid_transactions();

        // generate the miner's reward
        valid_transactions.push(
            Transaction.reward_transaction({ miner_wallet: this.wallet })
        );
        

        // add a block to the blockchain consisting of these valid transactions
        this.blockchain.addBlock({data: valid_transactions});

        // broadcast the updated blockchain
        this.pubsub.broad_cast_chain();

        // clear the pool
        this.transaction_pool.clear(); // check which clear function.
    }
}

module.exports = Transaction_miner;