const express = require('express');
const bodyParser = require('body-parser');
const Blockchain = require('./blockchain/index');
const { PubSub } = require('./app/pubsub');
const request = require('request');
const path = require('path');
const Transaction_pool = require('./wallet/transaction-pool');
const Wallet = require('./wallet/index');
const Transaction_miner = require('./app/transaction-miner');
const { addListener } = require('nodemon');

const app = express();
const blockchain = new Blockchain();
const transaction_pool = new Transaction_pool();
const wallet = new Wallet(); // It means this wallet corresponds to that of the miner's
const pubsub = new PubSub({blockchain,transaction_pool,wallet});
const transaction_miner = new Transaction_miner({blockchain, transaction_pool, pubsub, wallet}); // It means this wallet corresponds to that of the miner's

const DEFAULT_PORT = 3000;

const ROOT_NODE_ADDRESS = `http://localhost:${DEFAULT_PORT}`;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname,'client/dist')))

app.get('/api/blocks',(req,res) => {
    res.json(blockchain.chain);
});

app.post('/api/mine',(req,res) => {
    const {data} = req.body;
    blockchain.addBlock({data});
    pubsub.broad_cast_chain();
    res.redirect('/api/blocks');
});

app.post('/api/transact',(req,res) => {
    const { amount, recipient } = req.body;
// only one transaction can be so check if any transaction corresponding to this wallet already exists in the pool present for one wallet 
    let transaction = transaction_pool.existing_transaction({input_address: wallet.public_key});
    try{
        if(transaction){
            transaction.update({sender_wallet: wallet,recipient,amount});
        }else{
            transaction = wallet.create_transactions({recipient,amount,chain: blockchain.chain});
        }
        
    }catch(error){
        return res.status(400).json({type: 'error', message: error.message});
    }
    
    transaction_pool.set_transaction(transaction);
    pubsub.broad_cast_transaction(transaction);
    res.json({type: 'success',transaction}); // response is the transaction 
});

app.get('/api/transaction-pool-map',(req,res) => {
    res.json(transaction_pool.transaction_map)
});

app.get('/api/mine-transactions',(req,res) => {
    transaction_miner.mine_transactions();
    res.redirect('/api/blocks');
});

app.get('/api/wallet-info',(req,res) => {
    const address = wallet.public_key;
    res.json({
        address,
        balance: Wallet.calculate_balance({
            chain: blockchain.chain,
            address
        })
    });
});

app.get('*',(req,res) => {
    res.sendFile(path.join(__dirname,'./client/dist/index.html'));
});

const sync_with_root_state = () => {
    request({url: `${ROOT_NODE_ADDRESS}/api/blocks`},(error,response,body) => {
        if (!error && response.statusCode === 200){
            const root_chain = JSON.parse(body);

            console.log('replace on a sync with',root_chain);   // It basically syncs the blockchain
            blockchain.replaceChain(root_chain);
        }
    });

    request({url: `${ROOT_NODE_ADDRESS}/api/transaction-pool-map`},(error,response,body) => {
        if(!error && response.statusCode === 200){
            const root_transaction_pool_map = JSON.parse(body);
            console.log('replace transaction on a sync with ',root_transaction_pool_map);
            transaction_pool.set_map(root_transaction_pool_map); // It syncs the transaction_pool
        }
    });
};

const walletFoo = new Wallet();
const walletBar = new Wallet();

const generate_wallet_transaction = ({wallet,recipient,amount}) => {
    const transaction = wallet.create_transactions({
        recipient,amount,chain: blockchain.chain
    })

    transaction_pool.set_transaction(transaction);
};

const walletAction = () => generate_wallet_transaction({
    wallet,recipient: walletFoo.public_key,amount: 5
});

const walletFooAction = () => generate_wallet_transaction({
    wallet: walletFoo,recipient: walletBar.public_key,amount: 10
});

const walletBarAction = () => generate_wallet_transaction({
    wallet: walletBar,recipient: wallet.public_key,amount: 15
});

// for(let i=0;i<10;i++){
//     if(i%3 === 0){
//         walletAction();
//         walletFooAction();
//     }else if(i%3 === 1){
//         walletAction();
//         walletBarAction();
//     }else{
//         walletFooAction();
//         walletBarAction();
//     }

//     transaction_miner.mine_transactions();
// }




let PEER_PORT;

if(process.env.GENERATE_PEER_PORT ==='true'){
    PEER_PORT = DEFAULT_PORT+ Math.ceil(Math.random()*1000);
}

const PORT = PEER_PORT || DEFAULT_PORT;
app.listen(PORT,() => {
    console.log(`listening at localhost: ${PORT}`);

    if(PORT != DEFAULT_PORT){
        sync_with_root_state();
    }
});