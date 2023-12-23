const express=require('express');
const { addToCart, fetchCartByUser, deleteFromCart, updateCart } = require('../controller/Cart');

const router=express.Router();


router.get('/',fetchCartByUser)
      .post('/',addToCart)
      .delete('/:id',deleteFromCart)
      .patch('/:id',updateCart)
exports.router=router
