const PubNub = require('pubnub');

const credentials = {
    publish_key: "pub-c-df0a0b81-113c-48ae-a79f-9d4110d1f999",
    subscribe_key: "sub-c-415f89ff-d29c-4082-86f8-7e80c7fc05ea",
    secret_key: "sec-c-NWY3NDRlMmEtZWFkNC00ZDUwLTg5MjItOGU2YjZmNzQ4OWJh"
};

const CHANNELS = {
    TEST: 'TEST',
    BLOCKCHAIN: 'BLOCKCHAIN',
    TRANSACTION: 'TRANSACTION'
}

class PubSub{
    constructor({blockchain, transaction_pool, wallet}){
        this.blockchain = blockchain;
        this.transaction_pool = transaction_pool;
        this.wallet = wallet;
        this.pubnub = new PubNub(credentials);
        this.pubnub.subscribe({channels: Object.values(CHANNELS)});
        this.pubnub.addListener(this.listener());

    }

    listener(){
        return {
            message: messageObject => {
                const { channel, message } = messageObject;
                console.log(`Message Recieved. Channel: ${channel}. Message: ${message}`);
                const parsed_message = JSON.parse(message);

                switch(channel){
                    case CHANNELS.BLOCKCHAIN: 
                        this.blockchain.replaceChain(parsed_message, true, () => {
                            this.transaction_pool.clear_blockchain_transactions({
                                chain: parsed_message
                            })
                        }); 
                        break;
                    case CHANNELS.TRANSACTION:
                        if(!this.transaction_pool.existing_transaction({
                            input_address: this.wallet.public_key
                        })){
                            this.transaction_pool.set_transaction(parsed_message);
                        }
                        break; // transaction-pool has no need to update but transaction needs to be updated
                    default:    // set_transaction() acts as update only.
                        return; 
                
                    } 
            }
        };
    }

    publish({channel,message}){    
        this.pubnub.publish({channel,message});
    }

    broad_cast_chain(){
        this.publish({
            channel: CHANNELS.BLOCKCHAIN,
            message: JSON.stringify(this.blockchain.chain)
        });
    }

    broad_cast_transaction(transaction){
        this.publish({
            channel: CHANNELS.TRANSACTION,
            message: JSON.stringify(transaction)
        })
    }
}


module.exports = {PubSub};