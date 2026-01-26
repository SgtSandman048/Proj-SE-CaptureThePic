// import { initializeApp } from 'firebase/app';

const express = require('express')
const app = express()
const port = 8080

/*const firebaseConfig = {
  //...
};*/

app.get('/', (req, res) => res.send('Hello World'))

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`)
})

module.exports = app