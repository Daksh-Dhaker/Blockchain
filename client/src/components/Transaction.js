import React from 'react';

const Transaction = ({transaction}) => {
    const { input, output_map } = transaction;
    const recipient_array = Object.keys(output_map);
    return (
        <div class='Transaction'>
            <div>From: {`${input.address.substring(0,20)}...`} | Balance: {input.amount}</div>
            {
                recipient_array.map(recipient => {
                    return (
                        <div key={recipient}>
                            To: {`${recipient.substring(0,20)}...`} | Sent: {output_map[recipient]}
                        </div>
                    )
                })
            }
        </div>
    )
}

export default Transaction;