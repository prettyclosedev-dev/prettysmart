const express = require('express');
const router = express.Router();

module.exports = () => {

    router.get('/', async (req, res) => {

        req.logout();
        res.redirect('/login')    ;

    });

    return router;
};
