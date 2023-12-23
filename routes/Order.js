const express=require('express');
const { createOrder, fetchOrderByUser, deleteOrder, updateOrder, fetchAllOrders } = require('../controller/Order');

const router=express.Router();


router.get('/own/',fetchOrderByUser)
      .post('/',createOrder)
      .delete('/:id',deleteOrder)
      .patch('/:id',updateOrder)
      .get('/',fetchAllOrders)
exports.router=router
