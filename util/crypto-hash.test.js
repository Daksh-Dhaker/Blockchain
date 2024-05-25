const cryptohash = require('./crypto-hash');

describe('cryptoHash()',() => {
    
    it('generates a SHA-256 hashed output',() => {
        expect(cryptohash('foo')).toEqual('b2213295d564916f89a6a42455567c87c3f480fcd7a1c15e220f17d7169a790b')
    });

    it('produces the same input arguments in same order',() => {
        expect(cryptohash('one','two','three')).toEqual(cryptohash('one','two','three'));
    });

    it('produces a unique hash when the properties have changed on an input',() => {
        const foo = {};
        const original_hash = cryptohash(foo);

        foo['a'] = 'a';
        expect(cryptohash(foo)).not.toEqual(original_hash);
    });
});