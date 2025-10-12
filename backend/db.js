const { connect } = require('@planetscale/database');
require('dotenv').config();
const conn = connect({ url: process.env.DATABASE_URL });
module.exports = conn;