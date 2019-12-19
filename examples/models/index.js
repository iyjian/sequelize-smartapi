const fs = require('fs')
const path = require('path')
const Sequelize = require('sequelize')

const sqlite = new Sequelize({
  dialect: 'sqlite',
  storage: './../database.sqlite',
  pool: {
    max: 5,
    min: 0,
    idle: 10000
  },
  logging: console.log
})
// sqlite.authenticate()
// .then(()=> {
//   console.log('success')
// })
// .catch(err=> {
//   console.log(err)
// })

const db = {}

fs
  .readdirSync(__dirname)
  .filter(file => (file.indexOf('.') !== -1) && (file !== 'index.js'))
  .forEach((file) => {
    let model = sqlite.import(path.join(__dirname, file))
    db[model.name] = model
  })

Object.keys(db).forEach((modelName) => {
  if ('associate' in db[modelName]) {
    db[modelName].associate(db)
  }
})

sqlite.sync({force: true}).catch(console.log)

db.sqlite = sqlite
db.Sequelize = Sequelize

module.exports = db
