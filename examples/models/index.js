const fs = require('fs')
const path = require('path')
const Sequelize = require('sequelize')
const conf = require('./../config')

const mysql = new Sequelize(conf.mysql.database, conf.mysql.user, conf.mysql.password, {
  host: conf.mysql.host,
  port: conf.mysql.port,
  dialect: 'mysql',
  pool: {
    max: 5,
    min: 0,
    idle: 10000
  },
  timezone: '+08:00',
  logging: console.log
})

const db = {}

fs
  .readdirSync(__dirname)
  .filter(file => (file.indexOf('.') !== -1) && (file !== 'index.js'))
  .forEach((file) => {
    let model = mysql.import(path.join(__dirname, file))
    db[model.name] = model
  })

Object.keys(db).forEach((modelName) => {
  if ('associate' in db[modelName]) {
    db[modelName].associate(db)
  }
})

mysql.sync().catch(console.log)

db.mysql = mysql
db.sequelize = mysql
db.Sequelize = Sequelize

module.exports = db
