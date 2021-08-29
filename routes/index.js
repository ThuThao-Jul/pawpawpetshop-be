var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render({ status: 'ok', data: 'hello' });
});

/* products endpoint */
const productApi = require("./products.api");
router.use("/products", productApi);


//category endpoint
const categoryApi  = require('./categories.api');
router.use('/categories', categoryApi);


/* service endpoint */
const serviceApi = require('./services.api');
router.use('/services', serviceApi);


module.exports = router;
