const express = require('express');
const router = express.Router();

module.exports = () => {

    router.get('/', async (req, res) => {

        db.pages.find({
            type : 'event',
            dashboard : {
                $ne : true
            }
        }, function(err, events){

            events = _.orderBy(events, 'order');
            
            res.render('events', {
                events : events.length > 3 ? _.chunk(events, 3) : _.chunk(events, 1)
            });      
        });

    });


    return router;
};
