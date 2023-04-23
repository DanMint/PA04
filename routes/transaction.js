const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const User = require('../models/User');

const isLoggedIn = (req, res, next) => {
  if (res.locals.loggedIn) {
    next();
  } else {
    res.redirect('/login');
  }
};

router.get('/transact', isLoggedIn, async (req, res) => {
  const sortBy = req.query.sortBy || 'date';
  const sortOrder = sortBy === 'amount' ? -1 : 1;
  const items = await Transaction
    .find({ userId: req.user._id })
    .sort({ [sortBy]: sortOrder });
  res.locals.items = items;
  res.render('transactions');
});

// add to transact
router.post('/transact', isLoggedIn, async (req, res) => {
  const { description, amount, category, date } = req.body;

  try {
    // Validate transaction data
    if (!description || !amount || !category || !date) {
      throw new Error('All fields are required');
    }
    if (isNaN(parseFloat(amount))) {
      throw new Error('Amount must be a number');
    }

    // Create and save new transaction
    const transaction = new Transaction({
      description,
      amount: parseFloat(amount),
      category,
      date,
      userId: req.user._id,
    });
    await transaction.save();

    res.redirect('/transact');
  } catch (error) {
    // Handle validation errors
    res.render('transactForm', { error: error.message });
  }
});

// delete transactions
router.get('/transact/delete/:id', isLoggedIn, async (req, res) => {
  const transactionId = req.params.id;
  try {
    await Transaction.deleteOne({ _id: transactionId, userId: req.user._id });
    res.redirect('/transact');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error deleting transaction');
  }
});

// editing transactions
router.get('/transact/edit/:id', isLoggedIn, async (req, res) => {
  try {
    const item = await Transaction.findById(req.params.id);
    if (!item) throw new Error('Transaction not found');
    res.render('transactEdit', { item });
  } catch (err) {
    console.error(err);
    res.redirect('/transact');
  }
});


router.post('/transact/updateTransaction', isLoggedIn, async (req, res) => {
  const transactionId = req.body.id;
  const update = {
    description: req.body.description,
    amount: parseFloat(req.body.amount),
    category: req.body.category,
    date: req.body.date,
  };

  try {
    const updatedTransaction = await Transaction.findByIdAndUpdate(
      transactionId,
      update,
      { new: true }
    );
    if (!updatedTransaction) {
      throw new Error('Transaction not found');
    }
    res.redirect('/transact');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error updating transaction');
  }
});

router.get('/transact/byCategory',isLoggedIn,async (req, res, next) => {
    let results = await Transaction.aggregate([
        {$group:{_id:'$category', totalAmount:{$sum:'$amount'}}},
        {$sort:{totalAmount:-1}}
      ])
    res.render('transGroupByCat',{results});
});


module.exports = router;
