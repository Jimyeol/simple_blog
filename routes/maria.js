const maria = require('mysql');
const fs = require('fs');
const dbData = fs.readFileSync('./routes/configure/dbInfo.json');
const dbInfo = JSON.parse(dbData);


const conn = maria.createConnection ( {
    host: dbInfo.host,
    port: dbInfo.port, 
    user: dbInfo.user,
    password: dbInfo.password,
    database: dbInfo.database
});


module.exports = conn;
