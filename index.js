const express = require("express");
const cors = require('cors')
const fs = require('fs')
const path = require('path')
const log = require('./router/log/controller')
require('dotenv').config()


const logsDir = path.join(__dirname, 'logs');

if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
  }
  
const PORT = process.env.PORT || 4004;

const app = express();
app.use(cors())

app.use(express.json({limit: '10mb'}));
app.use(express.urlencoded({limit: '10mb'}));

app.use("/", log);

app.get('/',(req,res)=> {
  res.send("Hello world 👋")
})

app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
});
