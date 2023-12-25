var rp = require('request-promise'),
    config = require('./config.json');

module.exports.pages = {
    find : (query, cb) => {
        get('pages', 'find', query, cb)        
    },
    findOne : (query, cb) => {
        get('pages', 'findOne', query, cb)        
    },
    count : (query, cb) => {
        get('pages', 'count', query, cb)        
    },
    findAndModify : (query, cb) => {
        get('pages', 'findAndModify', query, cb)        
    },
    aggregate : (query, cb) => {
        get('pages', 'aggregate', query, cb)        
    }
}

module.exports.settings = {
    find : (query, cb) => {
        get('settings', 'find', query, cb)        
    },
    findOne : (query, cb) => {
        get('settings', 'findOne', query, cb)        
    },
    count : (query, cb) => {
        get('settings', 'count', query, cb)        
    }
}

function get(table, method, query, cb){
    rp({
        method: 'POST',
        uri: config.API_DOMAIN + table + '/' + method,
        body: {
            query: query
        },
        headers : {
            accountId : config.ACCOUNT_ID,
            token : config.TOKEN
        },
        json: true
    }).then(res => {
        cb(null, res)
    }).catch(err => {
        cb(err)
    })    
}
