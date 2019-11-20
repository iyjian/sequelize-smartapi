const http = require('http')
const bodyParser = require('body-parser')
const express = require('express')
const app = express()

const port = process.env.WEBPORT || '3000'

app.set('port', port)
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }))
app.use(bodyParser.json({ limit: '50mb' }))

app.get('/students', (req, res) => {
  res.send('1')
})

const server = http.createServer(app)

server.listen(port)

console.log(`http server started at: ${port} NODE_ENV: ${process.env.NODE_ENV || 'not specified'}`)
