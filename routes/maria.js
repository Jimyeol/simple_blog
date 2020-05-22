const maria = require('mysql');

const conn = maria.createConnection ( {
    host: '127.0.0.1',
    port: 3306, 
    user: 'system',
    password: 'glosfer1!',
    database: 'glog'
});


module.exports = conn;